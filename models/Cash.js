const mongoose = require("mongoose");

const CashSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users"
  },
  source: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  }
});

const Cash = mongoose.model("cash", CashSchema);
exports.CashSchema = CashSchema;
exports.Cash = Cash;
