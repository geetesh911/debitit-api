const mongoose = require("mongoose");
const { CreditorSchema } = require("./Creditor");

const PurchaseSchema = mongoose.Schema({
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
  creditor: {
    type: CreditorSchema
  },
  quantity: {
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
  },
  otherExpenses: {
    type: Number,
    required: true,
    default: 0
  },
  totalCost: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  }
});

const Purchase = mongoose.model("purchase", PurchaseSchema);
exports.PurchaseSchema = PurchaseSchema;
exports.Purchase = Purchase;
