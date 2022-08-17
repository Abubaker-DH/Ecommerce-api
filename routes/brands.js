const express = require("express");
const admin = require("../middleware/admin");
const auth = require("../middleware/auth");
const validateObjectId = require("../middleware/validateObjectId");
const { Brand, validateBrand } = require("../models/brand");
const router = express.Router();

// INFO: get all brands
router.get("/", async (req, res) => {
  const brands = await Brand.find().select("-__v").sort("name");
  res.send(brands);
});

// INFO: create new brand route
router.post("/", [auth, admin], async (req, res) => {
  // NOTE: validate data send by user
  const { error } = validateBrand(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let brand = new Brand({ name: req.body.name, userId: req.user._id });
  brand = await brand.save();

  res.status(201).send({ message: "New Brand Created", brand });
});

// INFO: update brand route
router.put("/:id", [auth, admin, validateObjectId], async (req, res) => {
  // NOTE: validate data send by user
  const { error } = validateBrand(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const brand = await Brand.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name },
    {
      new: true,
    }
  );

  if (!brand)
    return res.status(404).send("The brand with the given ID was not found.");

  res.send(brand);
});

// INFO: delete brand route
router.delete("/:id", [auth, admin, validateObjectId], async (req, res) => {
  const brand = await Brand.findByIdAndRemove(req.params.id);

  if (!brand)
    return res.status(404).send("The brand with the given ID was not found.");

  res.send(brand);
});

// INFO: get one brand route
router.get("/:id", validateObjectId, async (req, res) => {
  const brand = await Brand.findById(req.params.id).select("-__v");

  if (!brand)
    return res.status(404).send("The brand with the given ID was not found.");

  res.send(brand);
});

module.exports = router;
