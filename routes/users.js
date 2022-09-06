const fs = require("fs");
const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const lodash = require("lodash");
const sendMail = require("@sendgrid/mail");
const {
  User,
  validateUser,
  validateRegister,
  validateForgote,
  validateReset,
  validateLogin,
} = require("../models/user");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validateObjectId = require("../middleware/validateObjectId");
const { upload } = require("../middleware/upload");
const { Product } = require("../models/product");
const { Order } = require("../models/order");
const router = express.Router();

sendMail.setApiKey(process.env.SENDGRID_API_KEY);

// INFO: Profile
router.get("/profile", auth, async (req, res) => {
  const userData = await User.find(req.user._id)
    .populate({
      path: "orderItems.orderId",
      populate: { path: "productId" },
    })
    .select(
      "-password -resetToken -resetTokenExpiration -cartItems -cartItems -role"
    );
  res.send(userData);
});

// INFO: Get all users
router.get("/", [auth, admin], async (req, res) => {
  const user = await User.find();
  res.send(user);
});

// INFO: cart route
router.get("/cart", auth, async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "cartItems.productId",
    populate: { path: "brandId", select: "name" },
    populate: { path: "categoryId", select: "name" },
  });
  res.send(user.cartItems);
});

// INFO: Get one user by ID
router.get("/:id", [auth, admin, validateObjectId], async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user)
    return res.status(404).send("The user with given ID was not found.");

  res.send(user);
});

// INFO: SignUp or register or crate user route
router.post("/register", async (req, res, next) => {
  // check if the user send all the data
  const { error } = validateRegister(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ email: req.body.email });
  if (user) return res.status(400).send("User already registerd..");

  user = new User({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  });
  // INFO: hash password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);

  await user.save();
  // generate token
  const token = user.generateAuthToken();

  res
    .setHeader("Access-Control-Allow-Headers", "Content-type, Authorization")
    .header("authorization", "bearer " + token)
    .status(201)
    .send(lodash.pick(user, ["_id", "name", "email", "profileImage"]));
});

// INFO: Login or signIn route
router.post("/login", async (req, res, next) => {
  // NOTE: check if the user send all the data
  const { error } = validateLogin(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send("Invalid email or password..");

  const isMatch = await user.matchPassword(req.body.password);
  if (!isMatch) return res.status(400).send("Invalid email or password..");

  // NOTE: generate token
  const token = user.generateAuthToken();

  res.send(token);
});

// NOTE: Update user route
router.patch(
  "/:id",
  [auth, validateObjectId, upload.single("profileImage")],
  async (req, res) => {
    let user = await User.findById({ _id: req.params.id });
    if (!user)
      return res.status(404).send("The user with given ID was not found");

    // INFO: The user can not change his role
    if (req.body.role && req.user.role !== "super") {
      return res.status(403).send("Method not allowed.");
    }

    // INFO: Get the profile image from req.file
    if (req.file) {
      if (user.profileImage) clearImage(user.profileImage);
      req.body.profileImage = req.file.path;
    }

    const { error } = validateUser(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    //  INFO: Delete the old image
    if (user.profileImage) clearImage(user.profileImage);

    // INFO: The Owner or Admin can Update
    if (
      req.user._id.toString() === req.params.id.toString() ||
      req.user.role === "admin"
    ) {
      user = await User.findByIdAndUpdate(
        { _id: req.params.id },
        {
          name: req.body.name,
          role: req.body.role,
          profileImage: req.body.profileImage,
        },
        { new: true }
      );
      res.send(user);
    } else {
      return res.status(403).send("Method not allowed.");
    }
  }
);

// INFO: Delete one User By ID
router.delete("/:id", [auth, validateObjectId], async (req, res) => {
  // INFO: The super admin is allowed to delete a user
  if (req.user.role !== "super") {
    return res.status(403).send("Method not allowed.");
  }

  const user = await User.findByIdAndRemove({
    _id: req.params.id,
  });

  if (!user)
    return res.status(404).send("The User with given ID was not found.");

  if (user.profileImage) {
    clearImage(user.profileImage);
  }
  res.send(user);
});

// INFO: Reset password route
router.put("/resetpassword/:resetToken", async (req, res, next) => {
  const token = req.params.resetToken;

  let user = await User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  });
  if (!user) return res.status(404).send("Uesr not found..");

  const { error } = validateReset(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // INFO: hash password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(req.body.password, salt);
  user.resetToken = undefined;
  user.resetTokenExpiration = undefined;
  await user.save();

  res.send("reset password sucessfully.");
});

// INFO: Forgot Password route
router.post("/forgotpassword", async (req, res, next) => {
  // NOTE: validate email of user
  const { error } = validateForgote(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // NOTE: create 32 random bytes or char
  const buffer = crypto.randomBytes(32);
  if (error) return res.send(error);
  // convert buffer to string as Token
  const resetToken = buffer.toString("hex");

  // NOTE: find user by email
  let user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).send("Uesr not found..");

  user.resetToken = resetToken;
  // INFO: one houre token expiration
  user.resetTokenExpiration = Date.now() + 60 * (60 * 1000);
  await user.save();

  const resetLink = `"${process.env.RESET_LINK}/${resetToken}"`;
  const text = `
  <h1>You request a password reset</h1>
  <p>click this link to reset your password.</p>
  <a href=${resetLink} clicktracking=off>${resetLink}</a>
  `;

  const message = {
    to: user.email, // Change to your recipient
    from: process.env.EMAIL, // Change to your verified sender
    subject: "Password Reset",
    text: text,
  };

  sendMail
    .send(message)
    .then(() => {
      res.send("Email sent");
    })
    .catch((error) => {
      user.resetToken = undefined;
      user.resetTokenExpiration = undefined;
      user.save();
      res.send("Email could not sent");
      next(error);
    });
});

// INFO: add to cart route
router.post("/add-to-cart", auth, async (req, res) => {
  const product = await Product.findById(req.body.productId);
  if (!product)
    return res.status(404).send("The product with given ID was not found.");

  if (req.body.quantity > product.numberInStock)
    return res
      .status(400)
      .send(`We just have ${product.numberInStock} items from this Product.`);

  // INFO: the user can not add thier product to cart
  if (req.user._id.toString() === product.userId.toString())
    return res.status(405).send("Method not allowed");

  const user = await User.findById(req.user._id);

  // let newQuantity;
  const updatedCartItems = [...user.cartItems];

  // INFO: find the product index
  const cartProductIndex = user.cartItems.findIndex((cp) => {
    return cp.productId.toString() === product._id.toString();
  });
  // if we get product => update the quantity
  if (cartProductIndex >= 0) {
    // newQuantity = this.cartItems[cartProductIndex].quantity + quantity;
    updatedCartItems[cartProductIndex].quantity = req.body.quantity;
    updatedCartItems[cartProductIndex].size = req.body.size;
    updatedCartItems[cartProductIndex].color = req.body.color;
  } else {
    // if we don't add new product
    updatedCartItems.push({
      productId: req.body.productId,
      quantity: req.body.quantity,
      color: req.body.color,
      size: req.body.size,
    });
  }

  user.cartItems = updatedCartItems;

  await user.save();

  res.send("Added successfully.");
});

// INFO: Delete from cart route
router.post("/delete-from-Cart", auth, async (req, res) => {
  const product = await Product.findById(req.body.productId);
  if (!product)
    return res.status(404).send("The product with givem ID was not found.");

  const user = await User.findById(req.user._id);

  const updatedCartItems = user.cartItems.filter((item) => {
    return item.productId.toString() !== req.body.productId.toString();
  });

  user.cartItems = updatedCartItems;

  await user.save();

  res.send("Delete successfully.");
});

// INFO: Cencle order item from user.orderItems array
router.post("/cencle-order", auth, async (req, res) => {
  // Get the order
  const order = await Order.findById(req.body.orderId);
  if (!order)
    return res.status(404).send(" The order with given ID was not found.");

  const user = await User.findById(req.user._id);

  if (user._id.toString() !== order.userId.toString())
    return res.status(401).send("Access denied.");

  const updatedOrderItems = user.orderItems.filter((item) => {
    return item.orderId.toString() !== req.body.orderId.toString();
  });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    user.orderItems = updatedOrderItems;

    user.save(session);
    await Order.findByIdAndRemove(req.body.orderId, { session });

    res.send("order cencled.");
  } catch (error) {
    console.log("Error occur While create new Order", error);
    await session.abortTransaction();
  } finally {
    await session.endSession();
  }
});

// INFO: delete image from image Folder
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => {
    return err;
  });
};

module.exports = router;
