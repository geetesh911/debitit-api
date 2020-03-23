const mongoose = require("mongoose");
const { CustomerSchema } = require("./Customer");

const SalesSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users"
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  payment: {
    type: String,
    required: true
  },
  customer: {
    type: CustomerSchema
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  otherExpenses: {
    type: Number,
    required: true,
    default: 0
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

const Sales = mongoose.model("sales", SalesSchema);
exports.SalesSchema = SalesSchema;
exports.Sales = Sales;
