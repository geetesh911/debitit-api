const mongoose = require("mongoose");
const PurchaseSchema = require("../models/Purchase");

const PurchaseReturnSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users"
  },
  purchase: {
    type: PurchaseSchema
  },
  quantity: {
    type: Number,
    required: true
  },
  perPieceCost: {
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

const PurchaseReturn = mongoose.model("purchasereturn", PurchaseReturnSchema);
exports.PurchaseReturnSchema = PurchaseReturnSchema;
exports.PurchaseReturn = PurchaseReturn;
