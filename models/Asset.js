const mongoose = require("mongoose");

const AssetSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users"
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  otherExpenses: {
    type: Number,
    required: true,
    default: 0
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  }
});

const Asset = mongoose.model("asset", AssetSchema);
exports.AssetSchema = AssetSchema;
exports.Asset = Asset;
