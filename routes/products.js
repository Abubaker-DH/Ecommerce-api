const fs = require("fs");
const path = require("path");
const express = require("express");
const auth = require("../middleware/auth");
const validateObjectId = require("../middleware/validateObjectId");
const { upload } = require("../middleware/upload");
const { Product, validateProduct } = require("../models/product");
const { Category } = require("../models/category");
const { Brand } = require("../models/brand");
const router = express.Router();

// INFO: get all products or search by title
router.get("/", async (req, res) => {
  let title = req.query.title;
  let products;
  if (title) {
    products = await Product.find({
      title: { $regex: title, $options: "i" },
    })
      .populate("brandId", "name")
      .populate("categoryId", "name")
      .populate("userId", "_id name profileImage")
      .select("-__v");

    if (!products) return res.status(400).send("Products was not found.");

    res.send(products);
  }

  products = await Product.find()
    .populate("brandId", "name")
    .populate("categoryId", "name")
    .populate("userId", "_id name profileImage")
    .select("-__v");

  if (!products) return res.status(400).send("Products was not found.");

  res.send(products);
});

router.get("/me", auth, async (req, res) => {
  const products = await Product.find({ userId: req.user._id })
    .populate("brandId", "name")
    .populate("categoryId", "name")
    .populate("userId", "_id name profileImage")
    .select("-__v");

  if (!products) return res.status(400).send("Products was not found.");

  res.send(products);
});

// INFO: add new product route
router.post("/", [auth, upload.array("images", 4)], async (req, res) => {
  if (!req.files) return res.status(422).send("No image provided.");

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

  // find brand by id
  const brand = await Brand.findById(req.body.brandId);
  if (!brand) return res.status(400).send("Invalid brand.");

  // find category by id
  const category = await Category.findById(req.body.categoryId);
  if (!category) return res.status(400).send("Invalid category.");

  const product = new Product({
    title: req.body.title,
    images: req.body.images,
    colors: req.body.colors,
    sizes: req.body.sizes,
    brandId: brand._id,
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

// INFO: update product route
router.patch(
  "/:id",
  [auth, validateObjectId, upload.array("images", 4)],
  async (req, res) => {
    let product = await Product.findById(req.params.id);
    if (!product) return res.status(400).send("Product was not found.");

    const { error } = validateProduct(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // find brand by id
    const brand = await Brand.findById(req.body.brandId);
    if (!brand) return res.status(400).send("Invalid brand.");

    // find category by id
    const category = await Category.findById(req.body.categoryId);
    if (!category) return res.status(400).send("Invalid category.");

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
    if (
      req.user._id.toString() !== product.userId.toString() ||
      req.user.role !== "admin"
    ) {
      return res.status(405).send("Method not allowed.");
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        images: req.body.images,
        brandId: req.body.brandId,
        categoryId: req.body.categoryId,
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
router.delete("/:id", [auth, validateObjectId], async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product)
    return res.status(404).send(" The product with given ID was not found.");

  // NOTE: The Owner or admin can delete the product
  if (
    req.user._id.toString() === product.userId.toString() ||
    req.user.role === "admin"
  ) {
    // NOTE: Delete all Images
    for (j = 0; j < product.images.length; j++) {
      clearImage(product.images[j].imageUrl);
    }
    await Product.findByIdAndRemove(req.params.id);
    res.send({ product: product, message: "Product deleted." });
  }
  return res.status(405).send("Method not allowed.");
});

// INFO: get one product route
router.get("/:id", validateObjectId, async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate("categoryId", "name")
    .populate("brandId", "name")
    .populate("userId", "name _id profileImage");
  if (!product)
    return res.status(404).send(" The product with given ID was not found.");

  res.send(product);
});

// INFO: delete image from image Folder
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => {
    return err;
  });
};
module.exports = router;
