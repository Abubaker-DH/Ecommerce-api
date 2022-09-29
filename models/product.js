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
    categoryId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    typeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Type",
    },
    genreId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Genre",
    },
    brandId: {
      type: Schema.Types.ObjectId,
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
    numberInStock: {
      type: Number,
      required: true,
      min: 0,
      max: 255,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// INFO: When delete product remove it from all users cart
productSchema.pre("remove", function (next) {
  userSchema.remove({ cartItems: [{ productId: this._id }] }).exec();
  next();
});

function validateProduct(product) {
  const schema = Joi.object({
    title: Joi.string().min(3).max(50).required(),
    price: Joi.number().required(),
    description: Joi.string().min(5).max(50).required(),
    brandId: Joi.objectId(),
    categoryId: Joi.objectId().required(),
    typeId: Joi.objectId().required(),
    genreId: Joi.objectId().required(),
    images: Joi.array()
      .items(Joi.object({ imageUrl: Joi.string().required() }))
      .max(4),
    colors: Joi.array().items(Joi.object({ colorItem: Joi.string() })),
    sizes: Joi.array().items(Joi.object({ sizeItem: Joi.string() })),
    numberInStock: Joi.number().min(0).required(),
  });

  return schema.validate(product);
}

module.exports.Product = mongoose.model("Product", productSchema);
exports.validateProduct = validateProduct;
exports.productSchema = productSchema;
