const express = require("express");
const admin = require("../middleware/admin");
const auth = require("../middleware/auth");
const validateObjectId = require("../middleware/validateObjectId");
const { Genre, validateGenre } = require("../models/genre");
const router = express.Router();

// INFO: get all genres
router.get("/", async (req, res) => {
  const genres = await Genre.find().select("-__v").sort("name");
  res.send(genres);
});

// INFO: create new genre route
router.post("/", [auth, admin], async (req, res) => {
  // NOTE: validate data send by user
  const { error } = validateGenre(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let genre = new Genre({ name: req.body.name, userId: req.user._id });
  genre = await genre.save();

  res.status(201).send({ message: "New genre Created", genre });
});

// INFO: update genre route
router.put("/:id", [auth, admin, validateObjectId], async (req, res) => {
  // NOTE: validate data send by user
  const { error } = validateGenre(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const genre = await Genre.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name },
    {
      new: true,
    }
  );

  if (!genre)
    return res.status(404).send("The genre with the given ID was not found.");

  res.send(genre);
});

// INFO: delete genre route
router.delete("/:id", [auth, admin, validateObjectId], async (req, res) => {
  if (req.user.role !== "super") return res.status(401).send("Access denied.");

  const genre = await Genre.findByIdAndRemove(req.params.id);

  if (!genre)
    return res.status(404).send("The genre with the given ID was not found.");

  res.send(genre);
});

// INFO: get one genre route
router.get("/:id", [admin, validateObjectId], async (req, res) => {
  const genre = await Genre.findById(req.params.id).populate(
    "userId",
    "_id name email"
  );

  if (!genre)
    return res.status(404).send("The genre with the given ID was not found.");

  res.send(genre);
});

module.exports = router;
