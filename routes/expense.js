const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const { Expense } = require("../models/Expense");
const { Cash } = require("../models/Cash");
const { Bank } = require("../models/Bank");
const Fawn = require("fawn");

const router = express.Router();

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
    const { name, amount, payment } = req.body;

    try {
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
      let cashDrTotal = 0;

      cashCr.forEach((cr) => (cashCrTotal += cr.amount));
      cashDr.forEach((dr) => (cashDrTotal += dr.amount));

      const netCash = cashDrTotal - cashCrTotal;

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
          .save("expenses", newExpense)
          .save("banks", newBank)
          .run();
      }

      res.json(newExpense);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

module.exports = router;
