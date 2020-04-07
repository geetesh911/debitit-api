const { Creditor } = require("../models/Creditor");
const { Cash } = require("../models/Cash");
const { Bank } = require("../models/Bank");
const Fawn = require("fawn");
const mongoose = require("mongoose");
const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");

const router = express.Router();

router.post(
  "/",
  [
    auth,
    [
      check("creditorId", "Customer ID is required").not().isEmpty(),
      check("amount", "Amount is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const { amount, payment, creditorId } = req.body;

    try {
      let creditor = await Creditor.findById(creditorId);

      if (!creditor) return res.status(500).json({ msg: "Not found" });

      // Make sure user owns card
      if (creditor.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: "Not Authorized" });
      }

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
        source: creditor.name,
        type: "cr",
        amount,
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
        source: creditor.name,
        type: "cr",
        amount,
        user: req.user.id,
      });
      if (payment === "cash") {
        if (netCash < amount)
          return res.status(400).json({ msg: "Enough Cash is not available" });

        new Fawn.Task()
          .save("cashes", newCash)
          .update(
            "creditors",
            { _id: mongoose.Types.ObjectId(creditorId) },
            { $inc: { due: -amount } }
          )
          .run();
      }
      if (payment === "bank") {
        if (netBank < amount)
          return res
            .status(400)
            .json({ msg: "Enough amount is not available in bank" });

        new Fawn.Task()
          .save("banks", newBank)
          .update(
            "creditors",
            { _id: mongoose.Types.ObjectId(creditorId) },
            { $inc: { due: -amount } }
          )
          .run();
      }
      res.json(creditor);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);
module.exports = router;
