const { Customer } = require("../models/Customer");
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
      check("customerId", "Customer ID is required").not().isEmpty(),
      check("amount", "Amount is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const { amount, source, customerId } = req.body;

    try {
      let customer = await Customer.findById(customerId);

      if (!customer) return res.status(500).json({ msg: "Not found" });

      // Make sure user owns card
      if (customer.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: "Not Authorized" });
      }

      const newCash = new Cash({
        source: customer.name,
        type: "dr",
        amount,
        user: req.user.id,
      });
      const newBank = new Bank({
        source: customer.name,
        type: "dr",
        amount,
        user: req.user.id,
      });

      if (source === "cash") {
        new Fawn.Task()
          .save("cashes", newCash)
          .update(
            "customers",
            { _id: mongoose.Types.ObjectId(customerId) },
            { $inc: { due: -amount } }
          )
          .run();
      }
      if (source === "bank") {
        new Fawn.Task()
          .save("banks", newBank)
          .update(
            "customers",
            { _id: mongoose.Types.ObjectId(customerId) },
            { $inc: { due: -amount } }
          )
          .run();
      }

      res.json(customer);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);
module.exports = router;
