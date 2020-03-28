const mongoose = require("mongoose");

const DrawingSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users"
  },
  name: {
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

const Drawing = mongoose.model("drawing", DrawingSchema);
exports.DrawingSchema = DrawingSchema;
exports.Drawing = Drawing;
