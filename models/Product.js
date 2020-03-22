const mongoose = require("mongoose");

const ProductSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users"
  },
  productName: {
    type: String,
    required: true
  },
  numberInStock: {
    type: Number,
    required: true
  },
  perPieceCost: {
    type: Number,
    required: true
  },
  perPieceSellingPrice: {
    type: Number,
    required: true
  }
});

const Product = mongoose.model("product", ProductSchema);
exports.ProductSchema = ProductSchema;
exports.Product = Product;
