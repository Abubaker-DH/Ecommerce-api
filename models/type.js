// INFO: Shoes - Cloth - Jewelry - Makeup
const Joi = require("joi");
const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const typeSchema = new Schema(
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

function validateType(type) {
  const schema = Joi.object({
    name: Joi.string().min(3).max(10).required(),
  });

  return schema.validate(type);
}

module.exports.Type = mongoose.model("Type", typeSchema);
exports.typeSchema = typeSchema;
exports.validateType = validateType;
