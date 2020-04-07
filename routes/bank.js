const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const { Bank } = require("../models/Bank");
const isodate = require("isodate");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const bank = await Bank.find({ user: req.user.id })
      .sort("type")
      .sort("date");
    // .sort("date");
    res.json(bank);
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
      check("source", "Name is required").not().isEmpty(),
      check("type", "Transaction type is required").not().isEmpty(),
      check("amount", "Amount is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }
    const { source, type, amount } = req.body;

    try {
      const newTransaction = new Bank({
        source,
        type,
        amount,
        user: req.user.id,
      });

      const transaction = await newTransaction.save();

      res.json(transaction);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

router.get("/range", auth, async (req, res) => {
  try {
    let lRange = req.query.lRange;
    let uRange = req.query.uRange;

    lRange = isodate(new Date(lRange));
    uRange = isodate(new Date(uRange));

    const bank = await Bank.find({
      $and: [
        { user: req.user.id },
        {
          date: {
            $gte: lRange,
            $lt: uRange,
          },
        },
      ],
    })
      .sort("type")
      .sort("date");
    // .sort("date");
    res.json(bank);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
