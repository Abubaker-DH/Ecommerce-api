const mongoose = require("mongoose");
const productSchema = require("./product");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Joi = require("joi");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 4,
      maxlength: 10,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 1024,
    },
    profileImage: { type: String },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    resetToken: String,
    resetTokenExpiration: Date,
    cartItems: [
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
  },
  { timestamps: true }
);

userSchema.pre("remove", function (next) {
  productSchema.remove({ user: this._id }).exec();
  //   orderSchema.remove({ user: this._id }).exec();
  next();
});

// remove all item from cart
userSchema.methods.clearCart = function () {
  this.cartItems = [];
  return this.save();
};

function validateUser(user) {
  const schema = Joi.object({
    name: Joi.string().min(4).max(10),
    profileImage: Joi.string(),
    role: Joi.string(),
  });
  return schema.validate(user);
}

function validateRegister(user) {
  const schema = Joi.object({
    name: Joi.string().required().min(4).max(10),
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6).max(255),
  });
  return schema.validate(user);
}

function validateLogin(user) {
  const schema = Joi.object({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6).max(255),
  });
  return schema.validate(user);
}

function validateReset(user) {
  const schema = Joi.object({
    password: Joi.string().required().min(6).max(255),
  });
  return schema.validate(user);
}

function validateForgote(user) {
  const schema = Joi.object({
    email: Joi.string().required().email(),
  });
  return schema.validate(user);
}

// INFO: create auth token
userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
  return token;
};

// INFO: compare plane text pass with hash pass
userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports.User = mongoose.model("User", userSchema);
exports.userSchema = userSchema;
module.exports.validateUser = validateUser;
module.exports.validateRegister = validateRegister;
module.exports.validateLogin = validateLogin;
module.exports.validateReset = validateReset;
module.exports.validateForgote = validateForgote;
