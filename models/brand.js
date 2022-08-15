const Joi = require("joi");
const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 10,
    },
  },
  { timestamps: true }
);

function validateBrand(brand) {
  const schema = Joi.object({
    name: Joi.string().min(3).max(10).required(),
  });

  return schema.validate(brand);
}

module.exports.Brand = mongoose.model("Brand", brandSchema);
exports.brandSchema = brandSchema;
exports.validateBrand = validateBrand;
