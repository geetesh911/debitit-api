const mongoose = require("mongoose");
const SalesSchema = require("../models/Sales");

const SalesReturnSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users"
  },
  sales: {
    type: SalesSchema
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  }
});

const SalesReturn = mongoose.model("salesreturn", SalesReturnSchema);
exports.SalesReturnSchema = SalesReturnSchema;
exports.SalesReturn = SalesReturn;
