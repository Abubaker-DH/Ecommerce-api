const Joi = require("joi");
const mongoose = require("mongoose");
const userSchema = require("./user");

const Schema = mongoose.Schema;

const productSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 255,
    },
    category: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    brand: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Brand",
    },
    images: [
      {
        imageUrl: { type: String, required: true },
      },
    ],
    colors: [
      {
        colorItem: { type: String },
      },
    ],
    sizes: [
      {
        sizeItem: { type: String },
      },
    ],
    description: { type: String, required: true },
    price: { type: Number, required: true },
    rating: { type: Number },
    numberInStock: {
      type: Number,
      required: true,
      min: 0,
      max: 255,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// NOTE: when delete product remove it from all users cart
productSchema.pre("remove", function (next) {
  userSchema.remove({ cartItems: [{ productId: this._id }] }).exec();
  next();
});

function validateProduct(product) {
  const schema = Joi.object({
    title: Joi.string().min(3).max(50).required(),
    price: Joi.number().required(),
    description: Joi.string().min(5).max(50).required(),
    user: Joi.objectId().required(),
    brand: Joi.objectId().required(),
    category: Joi.objectId().required(),
    images: Joi.array()
      .items(Joi.object({ imageUrl: Joi.string().required() }))
      .min(1),
    colors: Joi.array().items(Joi.object({ colorItem: Joi.string() })),
    sizes: Joi.array().items(Joi.object({ sizeItem: Joi.string() })),
    numberInStock: Joi.number().min(0).required(),
  });

  return schema.validate(product);
}

module.exports.Product = mongoose.model("Product", productSchema);
exports.validateProduct = validateProduct;
exports.productSchema = productSchema;
