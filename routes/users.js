const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const lodash = require("lodash");
const sendMail = require("@sendgrid/mail");
const Fawn = require("fawn");
const {
  User,
  validateRegister,
  validateForgote,
  validateReset,
  validateLogin,
} = require("../models/user");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { Product } = require("../models/product");
const router = express.Router();

sendMail.setApiKey(process.env.SENDGRID_API_KEY);

// INFO: Get all users
router.get("/", [auth, admin], async (req, res) => {
  const user = await User.find();
  res.send(user);
});

// INFO: cart route
router.get("/cart", auth, async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "cartItems.productId"
  );
  res.send(user);
});

// INFO: Get one user by ID
router.get("/:id", [auth, admin], async (req, res) => {
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

  user = new User(req.body.name, req.body.email, req.body.password);
  // hash password
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
  // check if the user send all the data
  const { error } = validateLogin(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send("Invalid email or password..");

  const isMatch = await user.matchPassword(req.body.password);
  if (!isMatch) return res.status(400).send("Invalid email or password..");

  // generate token
  const token = user.generateAuthToken();

  res.send(token);
});

// INFO: update user route
router.put("/:id", [auth, admin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const user = await findByIdAndUpdate(
    { _id: req.params.id, isAdmin: false },
    {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      isAdmin: req.body.isAdmin,
    },
    { new: true }
  );

  if (!user)
    return res.status(404).send("The user with given ID was not found");

  res.send(user);
});

// INFO: Delete one User By ID
router.delete("/:id", [auth, admin], async (req, res) => {
  const user = await User.findByIdAndRemove({
    _id: req.params.id,
    isAdmin: false,
  });
  if (!user)
    return res.status(404).send("The user with given ID was not found.");

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

  // hash password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(req.body.password, salt);
  user.resetToken = undefined;
  user.resetTokenExpiration = undefined;
  await user.save();

  res.send("reset password sucessfully.");
});

// INFO: Forgot Password route
router.post("/forgotpassword", async (req, res, next) => {
  // validate email of user
  const { error } = validateForgote(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // create 32 random bytes or char
  const buffer = crypto.randomBytes(32);
  if (error) return res.send(error);
  // convert buffer to string as Token
  const resetToken = buffer.toString("hex");

  // find user by email
  let user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).send("Uesr not found..");

  user.resetToken = resetToken;
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
    // html: options.html,
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
router.post("/addtocart", auth, async (req, res) => {
  if (req.user.isAdmin) return res.status(405).send("method not allowed.");

  const product = await Product.findById(req.body.productId);
  if (!product)
    return res.status(404).send("The product with givem ID was not found.");

  if (req.user._id === product.userId)
    return res.status(405).send("method not allowed");

  const user = await User.findById(req.user._id);

  // let newQuantity;
  const updatedCartItems = [...user.cartItems];

  // find the product index
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
      productId: product._id,
      quantity: req.body.quantity,
      color: req.body.color,
      size: req.body.size,
    });
  }

  user.cartItems = updatedCartItems;

  try {
    new Fawn.Task()
      .save("users", user)
      .update(
        "products",
        { _id: product._id },
        { $dic: { numberInStock: req.body.quantity } }
      )
      .run();

    res.send("Added successfully.");
  } catch (ex) {
    res.status(500).send("Somthing failed while add to cart.");
  }
});

// INFO: delete from cart route
router.post("/deletefromCart", auth, async (req, res) => {
  if (req.user.isAdmin) return res.status(405).send("method not allowed.");

  const product = await Product.findById(req.body.productId);
  if (!product)
    return res.status(404).send("The product with givem ID was not found.");

  const user = await User.findById(req.user._id);

  const updatedCartItems = user.cartItems.filter((item) => {
    return item.productId.toString() !== req.body.productId.toString();
  });

  user.cartItems = updatedCartItems;

  // return user.save();
  try {
    new Fawn.Task()
      .save("users", user)
      .update(
        "products",
        { _id: req.body.productId },
        { $inc: { numberInStock: updatedCartItems.quantity } }
      )
      .run();

    res.send("Added successfully.");
  } catch (ex) {
    res.status(500).send("Somthing failed while add to cart.");
  }
  res.send("deleted successfuilly.");
});

module.exports = router;
