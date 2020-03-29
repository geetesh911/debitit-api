const mongoose = require("mongoose");

const CustomerSchema = mongoose.Schema({
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
  mobile: {
    type: String,
    required: true
  }
});

const Customer = mongoose.model("customer", CustomerSchema);
exports.CustomerSchema = CustomerSchema;
exports.Customer = Customer;
