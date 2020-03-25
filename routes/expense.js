const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const { Expense } = require("../models/Expense");

const router = express.Router();

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
      const newExpense = new Expense({
        name,
        amount,
        user: req.user.id
      });

      const expense = await newExpense.save();

      res.json(expense);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

module.exports = router;
