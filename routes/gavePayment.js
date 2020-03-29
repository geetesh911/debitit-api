const { Creditor } = require("../models/Creditor");
const { Cash } = require("../models/Cash");
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
      check("creditorId", "Customer ID is required")
        .not()
        .isEmpty(),
      check("amount", "Amount is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const { amount, creditorId } = req.body;

    try {
      let creditor = await Creditor.findById(creditorId);

      if (!creditor) return res.status(500).json({ msg: "Not found" });

      // Make sure user owns card
      if (creditor.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: "Not Authorized" });
      }

      const newTransaction = new Cash({
        source: creditor.name,
        type: "cr",
        amount,
        user: req.user.id
      });

      new Fawn.Task()
        .save("cashes", newTransaction)
        .update(
          "creditors",
          { _id: mongoose.Types.ObjectId(creditorId) },
          { $inc: { due: -amount } }
        )
        .run();

      res.json(creditor);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);
module.exports = router;
