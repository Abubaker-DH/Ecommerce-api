const express = require("express");
const admin = require("../middleware/admin");
const auth = require("../middleware/auth");
const validateObjectId = require("../middleware/validateObjectId");
const { Type, validateType } = require("../models/type");
const router = express.Router();

// INFO: get all types
router.get("/", async (req, res) => {
  const types = await Type.find().select("-__v").sort("name");
  res.send(types);
});

// INFO: create new type route
router.post("/", [auth, admin], async (req, res) => {
  // NOTE: validate data send by user
  const { error } = validateType(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let type = new Type({ name: req.body.name, userId: req.user._id });
  type = await type.save();

  res.status(201).send({ message: "New type Created", type });
});

// INFO: update type route
router.put("/:id", [auth, admin, validateObjectId], async (req, res) => {
  // NOTE: validate data send by user
  const { error } = validateType(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const type = await Type.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name },
    {
      new: true,
    }
  );

  if (!type)
    return res.status(404).send("The type with the given ID was not found.");

  res.send(type);
});

// INFO: delete type route
router.delete("/:id", [auth, admin, validateObjectId], async (req, res) => {
  if (req.user.role !== "super") return res.status(401).send("Access denied.");

  const type = await Type.findByIdAndRemove(req.params.id);

  if (!type)
    return res.status(404).send("The type with the given ID was not found.");

  res.send(type);
});

// INFO: get one type route
router.get("/:id", [admin, validateObjectId], async (req, res) => {
  const type = await Type.findById(req.params.id).populate(
    "userId",
    "_id name email"
  );

  if (!type)
    return res.status(404).send("The type with the given ID was not found.");

  res.send(type);
});

module.exports = router;
