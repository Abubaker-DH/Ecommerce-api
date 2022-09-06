const express = require("express");
const admin = require("../middleware/admin");
const auth = require("../middleware/auth");
const validateObjectId = require("../middleware/validateObjectId");
const { Category, validateCategory } = require("../models/category");
const router = express.Router();

// INFO: get all categories
router.get("/", async (req, res) => {
  const categories = await Category.find().select("-__v").sort("name");
  res.send(categories);
});

// INFO: create new category route
router.post("/", [auth, admin], async (req, res) => {
  // NOTE: validate data send by user
  const { error } = validateCategory(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let category = new Category({ name: req.body.name, userId: req.user._id });
  category = await category.save();

  res.status(201).send({ message: "New atrgory Created", category });
});

// INFO: update category route
router.put("/:id", [auth, admin, validateObjectId], async (req, res) => {
  // NOTE: validate data send by user
  const { error } = validateCategory(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name },
    {
      new: true,
    }
  );

  if (!category)
    return res
      .status(404)
      .send("The category with the given ID was not found.");

  res.send(category);
});

// INFO: delete category route
router.delete("/:id", [auth, admin, validateObjectId], async (req, res) => {
  if (req.user.role !== "super") return res.status(401).send("Access denied.");

  const category = await Category.findByIdAndRemove(req.params.id);

  if (!category)
    return res
      .status(404)
      .send("The category with the given ID was not found.");

  res.send(category);
});

// INFO: get one category route
router.get("/:id", validateObjectId, async (req, res) => {
  const category = await Category.findById(req.params.id).populate(
    "userId",
    "_id name email"
  );

  if (!category)
    return res
      .status(404)
      .send("The category with the given ID was not found.");

  res.send(category);
});

module.exports = router;
