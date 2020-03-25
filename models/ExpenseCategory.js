const mongoose = require("mongoose");

const ExpenseCategorySchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users"
  },
  name: {
    type: String,
    required: true
  }
});

const ExpenseCategory = mongoose.model(
  "expensecategory",
  ExpenseCategorySchema
);
exports.ExpenseCategorySchema = ExpenseCategorySchema;
exports.ExpenseCategory = ExpenseCategory;
