const mongoose = require("mongoose");

const LiabilitySchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  interestRate: {
    type: Number,
    required: true,
  },
  time: {
    type: Number,
    required: true,
  },
  otherExpenses: {
    type: Number,
    required: true,
    default: 0,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

const Liability = mongoose.model("liability", LiabilitySchema);
exports.LiabilitySchema = LiabilitySchema;
exports.Liability = Liability;
