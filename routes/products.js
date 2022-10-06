const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const express = require("express");
const auth = require("../middleware/auth");
const validateObjectId = require("../middleware/validateObjectId");
const admin = require("../middleware/admin");
const { upload } = require("../middleware/upload");
const { Product, validateProduct } = require("../models/product");
const { Category } = require("../models/category");
const { Brand } = require("../models/brand");
const { User } = require("../models/user");
const router = express.Router();

// INFO: Get all products or search by title
router.get("/", async (req, res) => {
  let title = req.query.title;
  let products;
  if (title) {
    products = await Product.find({
      title: { $regex: title, $options: "i" },
    })
      .populate("brandId", "name")
      .populate("typeId", "name")
      .populate("genreId", "name")
      .populate("categoryId", "name")
      .populate("userId", "_id name profileImage")
      .select("-__v");

    if (!products) return res.status(400).send("Products was not found.");

    res.send(products);
  }

  products = await Product.find()
    .populate("brandId", "name")
    .populate("typeId", "name")
    .populate("genreId", "name")
    .populate("categoryId", "name")
    .populate("userId", "_id name profileImage")
    .select("-__v");

  if (!products) return res.status(400).send("Products was not found.");

  res.send(products);
});

// INFO: Create new product route
router.post("/", [auth, admin, upload.array("images", 4)], async (req, res) => {
  if (req.files.length === 0)
    return res.status(422).send("No images provided.");

  // NOTE: Get the imageUrl from req.files
  let images = [];
  for (i = 0; i < req.files.length; i++) {
    images[i] = { imageUrl: req.files[i].path };
  }

  // NOTE: Add images becouse we validate the product
  req.body.images = images;

  // validate data send by user
  const { error } = validateProduct(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // NOTE: find brand by id
  let brand;
  if (req.body.brandId) {
    brand = await Brand.findById(req.body.brandId);
    if (!brand) return res.status(400).send("Invalid brand.");
  }

  // NOTE: find category by id
  const category = await Category.findById(req.body.categoryId);
  if (!category) return res.status(400).send("Invalid category.");

  // NOTE: find type by id
  const type = await Category.findById(req.body.categoryId);
  if (!type) return res.status(400).send("Invalid type.");

  // NOTE: find genre by id
  const genre = await Category.findById(req.body.categoryId);
  if (!genre) return res.status(400).send("Invalid genre.");

  const product = new Product({
    title: req.body.title,
    images: req.body.images,
    colors: req.body.colors,
    sizes: req.body.sizes,
    brandId: brand._id,
    typeId: type._id,
    genreId: genre._id,
    categoryId: category._id,
    numberInStock: req.body.numberInStock,
    description: req.body.description,
    price: req.body.price,
    userId: req.user._id,
  });

  await product.save();

  res
    .status(201)
    .send({ product: product, message: "Added new product seccessfully." });
});

// INFO: Update product route
router.patch(
  "/:id",
  [auth, admin, validateObjectId, upload.array("images", 4)],
  async (req, res) => {
    let product = await Product.findById(req.params.id);
    if (!product) return res.status(400).send("Product was not found.");

    const { error } = validateProduct(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // find brand by id
    let brand;
    if (req.body.brandId) {
      brand = await Brand.findById(req.body.brandId);
      if (!brand) return res.status(400).send("Invalid brand.");
    }

    // find category by id
    const category = await Category.findById(req.body.categoryId);
    if (!category) return res.status(400).send("Invalid category.");

    // NOTE: find type by id
    const type = await Category.findById(req.body.categoryId);
    if (!type) return res.status(400).send("Invalid type.");

    // NOTE: find genre by id
    const genre = await Category.findById(req.body.categoryId);
    if (!genre) return res.status(400).send("Invalid genre.");

    // INFO: if the user delete an exist image will remove it from images folder
    if (product.images.length != req.body.images.length) {
      for (i = 0; i < product.images.length; i++) {
        if (
          req.body.images.some(
            (x) => x.imageUrl === product.images[i].imageUrl
          ) == false
        ) {
          clearImage(product.images[i].imageUrl);
        }
      }
    }

    let images = req.body.images;
    if (req.files) {
      for (i = 0; i < req.files.length; i++) {
        images.push({ imageUrl: req.files[i].path });
      }
    }

    req.body.images = images;

    // NOTE: The owner or admin can update the product
    // if (
    //   req.user._id.toString() !== product.userId.toString() ||
    //   req.user.role !== "admin"
    // ) {
    //   return res.status(405).send("Method not allowed.");
    // }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        images: req.body.images,
        brandId: brand._id,
        categoryId: category._id,
        typeId: type._id,
        genreId: genre._id,
        colors: req.body.colors,
        sizes: req.body.sizes,
        numberInStock: req.body.numberInStock,
        description: req.body.description,
        price: req.body.price,
        userId: req.user._id,
      },
      { new: true }
    );
    res.send({ product: product, message: "Product updated." });
  }
);

// INFO: delete one product by id
router.delete("/:id", [auth, admin, validateObjectId], async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product)
    return res.status(404).send(" The product with given ID was not found.");

  // NOTE: Delete all Images
  for (j = 0; j < product.images.length; j++) {
    clearImage(product.images[j].imageUrl);
  }
  await Product.findByIdAndRemove(req.params.id);
  res.send({ product: product, message: "Product deleted." });
});

// INFO: get one product route
router.get("/:id", validateObjectId, async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate("categoryId", "name")
    .populate("brandId", "name");
  if (!product)
    return res.status(404).send(" The product with given ID was not found.");

  res.send(product);
});

// INFO: Like product route
router.patch("/:id/like", auth, async (req, res) => {
  if (req.user.role === "admin" || req.user.role === "super")
    return res.status(403).send("Access denied.");

  const user = await User.findById(req.user._id);

  const product = await Product.findById(req.params.itemId);
  if (!product)
    return res.status(404).send(" The product with given ID was not found.");

  // Check if the userId in the list of likeUser
  const index = product.likes.findIndex((item) => {
    return item.userId.toString() === req.user._id.toString();
  });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // If the id doesn't exist
    if (index === -1) {
      // INFO: like the post
      product.likes.push({ userId: req.user._id });
      user.likeItems.push({ itemId: req.params.id });
      product.save(session);
      user.save(session);
    } else {
      // INFO: disLike the post
      product.likes = product.likes.filter(
        (item) => item.userId.toString() !== req.user._id.toString()
      );

      user.likeItems = user.likeItems.filter(
        (item) => item.itemId.toString() !== req.params.id.toString()
      );
      product.save(session);
      user.save(session);
    }
    res.send(product);
  } catch (error) {
    console.log("Error occur while like or dislike a product", error);
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
