const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const { Cash } = require("../models/Cash");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const cash = await Cash.find({ user: req.user.id })
      .sort("type")
      .sort("date");
    // .sort("date");
    res.json(cash);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.post(
  "/",
  [
    auth,
    [
      check("source", "Name is required")
        .not()
        .isEmpty(),
      check("type", "Transaction type is required")
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
    const { source, type, amount } = req.body;

    try {
      const newTransaction = new Cash({
        source,
        type,
        amount,
        user: req.user.id
      });

      const transaction = await newTransaction.save();

      res.json(transaction);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

module.exports = router;
