const mongoose = require("mongoose");

const CreditorSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users"
  },
  name: {
    type: String,
    required: true
  },
  due: {
    type: Number,
    required: true,
    default: 0
  },
  contact: {
    type: String,
    required: true
  }
});

const Creditor = mongoose.model("creditor", CreditorSchema);
exports.CreditorSchema = CreditorSchema;
exports.Creditor = Creditor;
