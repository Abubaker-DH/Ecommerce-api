// INFO: Boots - Dresses - High Heels
const Joi = require("joi");
const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const genreSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 10,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

function validateGenre(genre) {
  const schema = Joi.object({
    name: Joi.string().min(3).max(10).required(),
  });

  return schema.validate(genre);
}

module.exports.Category = mongoose.model("Genre", genreSchema);
exports.genreSchema = genreSchema;
exports.validateGenre = validateGenre;
