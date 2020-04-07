const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const { ExpenseCategory } = require("../models/ExpenseCategory");
const { Expense } = require("../models/Expense");
const { Cash } = require("../models/Cash");
const { Bank } = require("../models/Bank");
const Fawn = require("fawn");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const categories = await ExpenseCategory.find({ user: req.user.id }).sort({
      date: -1,
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
      check("name", "Name is required").not().isEmpty(),
      check("amount", "Amount is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }
    const { name, payment, amount } = req.body;

    try {
      const newCategory = new ExpenseCategory({
        name,
        user: req.user.id,
      });
      const newExpense = new Expense({
        name,
        amount,
        payment,
        user: req.user.id,
      });

      const cashCr = await Cash.find({
        $and: [{ user: req.user.id }, { type: "cr" }],
      });
      const cashDr = await Cash.find({
        $and: [{ user: req.user.id }, { type: "dr" }],
      });

      let cashCrTotal = 0;
      let csahDrTotal = 0;

      cashCr.forEach((cr) => (cashCrTotal += cr.amount));
      cashDr.forEach((dr) => (csahDrTotal += dr.amount));

      const netCash = csahDrTotal - cashCrTotal;

      const newCash = new Cash({
        source: name,
        type: "cr",
        amount: amount,
        user: req.user.id,
      });

      const bankCr = await Bank.find({
        $and: [{ user: req.user.id }, { type: "cr" }],
      });
      const bankDr = await Bank.find({
        $and: [{ user: req.user.id }, { type: "dr" }],
      });

      let bankCrTotal = 0;
      let bankDrTotal = 0;

      bankCr.forEach((cr) => (bankCrTotal += cr.amount));
      bankDr.forEach((dr) => (bankDrTotal += dr.amount));

      const netBank = bankDrTotal - bankCrTotal;

      const newBank = new Bank({
        source: name,
        type: "cr",
        amount: amount,
        user: req.user.id,
      });
      if (payment === "cash") {
        if (netCash < amount)
          return res.status(400).json({ msg: "Enough Cash is not available" });

        new Fawn.Task()
          .save("expensecategories", newCategory)
          .save("expenses", newExpense)
          .save("cashes", newCash)
          .run();
      }
      if (payment === "bank") {
        if (netBank < amount)
          return res
            .status(400)
            .json({ msg: "Enough amount is not available in bank" });

        new Fawn.Task()
          .save("expensecategories", newCategory)
          .save("expenses", newExpense)
          .save("banks", newBank)
          .run();
      }

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
