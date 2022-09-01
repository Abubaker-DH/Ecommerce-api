const mongoose = require("mongoose");
const Joi = require("joi");

const Schema = mongoose.Schema;

const orderSchema = new Schema(
  {
    orderItems: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        color: { type: String, required: true },
        size: { type: String, required: true },
      },
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: { type: String, required: true },
    paymentResult: {
      id: String,
      status: String,
      update_time: String,
      email_address: String,
    },
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true },
    taxPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

function validateOrder(order) {
  const schema = Joi.object({
    orderItems: Joi.array()
      .items(
        Joi.object({
          productId: Joi.objectId().required(),
          quantity: joi.number().required(),
          color: joi.string().required(),
          size: joi.string().required(),
        })
      )
      .required(),
    shippingAddress: Joi.object({
      fullName: joi.string().required(),
      phone: joi.string().required(),
      address: joi.string().required(),
      city: joi.string().required(),
      postalCode: joi.string().required(),
      country: joi.string().required(),
    }).required(),
    paymentMethod: Joi.string().required(),
    shippingPrice: Joi.number().required(),
    taxPrice: Joi.number().required(),
    totalPrice: Joi.number().required(),
    itemsPrice: Joi.number().required(),
  });

  return schema.validate(order);
}

module.exports.Order = mongoose.model("Order", orderSchema);
exports.validateOrder = validateOrder;
