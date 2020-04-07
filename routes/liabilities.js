const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const mongoose = require("mongoose");
const { Liability } = require("../models/Liability");
const { Cash } = require("../models/Cash");
const { Bank } = require("../models/Bank");
const Fawn = require("fawn");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const liability = await Liability.find({ user: req.user.id })
      .sort("type")
      .sort("date");
    // .sort("date");
    res.json(liability);
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
      check("name", "Name is required").not().isEmpty(),
      check("amount", "Amount is required").not().isEmpty(),
      check("interestRate", "Interest Rate is required").not().isEmpty(),
      check("time", "Time is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }
    const {
      name,
      amount,
      time,
      source,
      interestRate,
      otherExpenses,
    } = req.body;

    const timeInYears = time / 12;

    let interestAmount = (amount * interestRate * timeInYears) / 100;

    try {
      let othExp = 0;
      if (otherExpenses) othExp = otherExpenses;

      const newCash = new Cash({
        source: name,
        type: "dr",
        amount: amount + othExp,
        user: req.user.id,
      });

      const newBank = new Bank({
        source: name,
        type: "dr",
        amount: amount + othExp,
        user: req.user.id,
      });

      const newLiability = new Liability({
        name,
        amount: amount + interestAmount,
        interestRate,
        time,
        otherExpenses: othExp,
        user: req.user.id,
      });

      let task = new Fawn.Task();

      if (source === "cash") {
        task = task.save("liabilities", newLiability);
        task = task.save("cashes", newCash);
      }
      if (source === "bank") {
        task = task.save("liabilities", newLiability);
        task = task.save("banks", newBank);
      }

      task.run();

      res.json(newLiability);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

router.post(
  "/:id",
  [auth, [check("amount", "Amount is required").not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }
    const { amount, payment, otherExpenses } = req.body;

    try {
      const liability = await Liability.findById(req.params.id);
      if (!liability) return res.status(400).json({ msg: "Invalid Liability" });

      if (amount > liability.amount)
        return res
          .status(400)
          .json({ msg: "Amount can't be greater than loan amount" });

      let othExp = 0;

      if (otherExpenses) othExp = otherExpenses;

      const cashCr = await Cash.find({
        $and: [{ user: req.user.id }, { type: "cr" }],
      });
      const cashDr = await Cash.find({
        $and: [{ user: req.user.id }, { type: "dr" }],
      });

      let cashCrTotal = 0;
      let cashDrTotal = 0;

      cashCr.forEach((cr) => (cashCrTotal += cr.amount));
      cashDr.forEach((dr) => (cashDrTotal += dr.amount));

      const netCash = cashDrTotal - cashCrTotal;

      const newCash = new Cash({
        source: liability.name,
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
        source: liability.name,
        type: "cr",
        amount: amount,
        user: req.user.id,
      });

      if (payment === "cash") {
        if (netCash < amount)
          return res.status(400).json({ msg: "Enough Cash is not available" });

        let task = new Fawn.Task();

        task = task.update(
          "liabilities",
          { _id: mongoose.Types.ObjectId(req.params.id) },
          { $inc: { amount: -amount } }
        );
        task = task.save("cashes", newCash);
        task.run();
      }
      if (payment === "bank") {
        if (netBank < amount)
          return res
            .status(400)
            .json({ msg: "Enough amount is not available in bank" });

        let task = new Fawn.Task();

        task = task.update(
          "liabilities",
          { _id: mongoose.Types.ObjectId(req.params.id) },
          { $inc: { amount: -amount } }
        );
        task = task.save("banks", newBank);
        task.run();
      }

      res.json({
        amount: liability.amount - amount,
        name: liability.name,
        otherExpenses: othExp,
        payment,
        user: liability.id,
        id: req.params.id,
        date: Date.now,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

module.exports = router;
