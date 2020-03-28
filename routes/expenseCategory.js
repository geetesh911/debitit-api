const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const { ExpenseCategory } = require("../models/ExpenseCategory");
const { Expense } = require("../models/Expense");
const Fawn = require("fawn");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const categories = await ExpenseCategory.find({ user: req.user.id }).sort({
      date: -1
    });
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.post(
  "/",
  [
    auth,
    [
      check("name", "Name is required")
        .not()
        .isEmpty(),
      check("amount", "Amount is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }
    const { name, amount } = req.body;

    try {
      const newCategory = new ExpenseCategory({
        name,
        user: req.user.id
      });
      const newExpense = new Expense({
        name,
        amount,
        user: req.user.id
      });

      new Fawn.Task()
        .save("expensecategories", newCategory)
        .save("expenses", newExpense)
        .run();

      res.json({ newCategory, newExpense });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

router.put("/:id", auth, async (req, res) => {
  const { name } = req.body;

  // Build a card object
  const categoryFields = {};

  if (name) categoryFields.name = name;

  try {
    let category = await ExpenseCategory.findById(req.params.id);

    if (!category) return res.status(500).json({ msg: "Not found" });

    // Make sure user owns card
    if (category.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not Authorized" });
    }

    category = await ExpenseCategory.findOneAndUpdate(
      { _id: req.params.id },
      { $set: categoryFields },
      { new: true }
    );

    res.json(category);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    let category = await ExpenseCategory.findById(req.params.id);

    if (!category) return res.status(500).json({ msg: "Category not found" });

    // Make sure user owns the customer
    // if (customer.user.toString() !== req.user.id) {
    //   return res.status(401).json({ msg: "Not Authorized" });
    // }

    await ExpenseCategory.findByIdAndRemove(req.params.id);

    res.json({ msg: "Category Removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/:id", [auth], async (req, res) => {
  const category = await ExpenseCategory.findById(req.params.id).select("-__v");

  if (!category)
    return res
      .status(404)
      .send("The category with the given ID was not found.");

  res.json(category);
});

module.exports = router;
