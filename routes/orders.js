const express = require("express");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validateObjectId = require("../middleware/validateObjectId");
const { Order } = require("../models/order");
const { User } = require("../models/user");
const router = express.Router();

// INFO: Get all order
router.get("/", [auth, admin], async (req, res) => {
  const orders = await Order.find()
    .populate("userId", "_id name profileImage")
    .populate("orderItems.productId");

  if (!orders) return res.status(404).send({ message: "Orders Not Found" });

  res.send(orders);
});

// INFO: Get the user order
router.get("/me", auth, async (req, res) => {
  const orders = await Order.find({ userId: req.user._id })
    .populate("userId", "_id name profileImage")
    .populate({
      path: "orderItems.productId",
      populate: { path: "brandId", select: "name" },
      populate: { path: "categoryId", select: "name" },
    });

  if (!orders) return res.status(404).send({ message: "Orders Not Found" });

  res.send(orders);
});

// INFO: Create order
router.post("/", auth, async (req, res) => {
  const cartProduct = await User.findById(req.user._id).populate(
    "cartItems.productId"
  );

  // if we don't have items in the cart
  if (cartProduct.length === 0) {
    return res.status(400).send({ message: "Cart is empty" });
  }

  const order = new Order({
    orderItems: cartProduct,
    shippingAddress: req.body.shippingAddress,
    paymentMethod: req.body.paymentMethod,
    shippingPrice: req.body.shippingPrice,
    itemsPrice: req.body.itemsPrice,
    taxPrice: req.body.taxPrice,
    totalPrice: req.body.totalPrice,
    userId: req.user._id,
  });
  // save the order in DB
  await order.save();
  res.status(201).send({ message: "New Order Created", order });
});

// INFO: Get Order by id
router.get("/:id", [auth, admin, validateObjectId], async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("userId", "_id name profileImage")
    .populate({
      path: "orderItems.productId",
      populate: { path: "brandId", select: "name" },
      populate: { path: "categoryId", select: "name" },
    });
  if (!order) return res.status(404).send({ message: "Order Not Found" });

  res.send(order);
});

// INFO: Update the order after payment
router.put("/:id/pay", [auth, validateObjectId], async (req, res) => {
  // get the order
  let order = await Order.findById(req.params.id);

  if (!order) return res.status(404).send({ message: "Order Not Found" });

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: req.body.id,
    status: req.body.status,
    update_time: req.body.update_time,
    email_address: req.body.email_address,
  };
  // update and save
  await order.save();

  res.send({ message: "Order Paid", order });
});

// INFO: Delete by id
router.delete("/:id", [auth, admin, validateObjectId], async (req, res) => {
  // Get the order
  const order = await Order.findById(req.params.id);

  if (!order)
    return res.status(404).send(" The order with given ID was not found.");

  await Order.findByIdAndRemove(req.params.id);
  res.send({ order: order, message: "Order deleted." });
});

module.exports = router;
