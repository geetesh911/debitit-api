const mongoose = require("mongoose");

const BankSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  source: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

const Bank = mongoose.model("bank", BankSchema);
exports.BankSchema = BankSchema;
exports.Bank = Bank;
