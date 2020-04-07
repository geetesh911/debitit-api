const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const { Drawing } = require("../models/Drawing");
const { Product } = require("../models/Product");
const { Cash } = require("../models/Cash");
const { Bank } = require("../models/Bank");
const mongoose = require("mongoose");
const Fawn = require("fawn");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const cash = await Drawing.find({ user: req.user.id });
    res.json(cash);
  } catch (error) {
    res.status(500).json({ msg: "Server Error" });
  }
});

router.post(
  "/",
  [auth, [check("name", "Name is required").not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }
    const { name, amount, products } = req.body;

    let tAmount = 0;

    try {
      if (products) {
        for (let i = 0; i < products.length; i++) {
          product = await Product.findById(products[i].productId);

          if (!product) {
            return res.status(400).json({ msg: "Invalid product." });
          }

          if (products[i].quantity > product.numberInStock) {
            return res
              .status(400)
              .json({ msg: "Enough stock is not available" });
          }

          tAmount += products[i].quantity * products[i].price;
        }
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
        source: "drawings",
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
        source: "drawings",
        type: "cr",
        amount,
        user: req.user.id,
      });

      if (name === "stock") {
        const newTransaction = new Drawing({
          name,
          amount: tAmount,
          user: req.user.id,
        });
        let task = new Fawn.Task();

        task.save("drawings", newTransaction);

        for (let i = 0; i < products.length; i++) {
          if (!mongoose.Types.ObjectId.isValid(products[i].productId)) {
            return res.status(404).json({ msg: "Invalid ID." });
          }

          task = task.update(
            "products",
            { _id: mongoose.Types.ObjectId(products[i].productId) },
            { $inc: { numberInStock: -products[i].quantity } }
          );
        }
        task.run();
        res.json(newTransaction);
      }
      if (name === "cash" || name === "bank") {
        const newTransaction = new Drawing({
          name,
          amount,
          user: req.user.id,
        });

        let task = new Fawn.Task();

        task.save("drawings", newTransaction);

        if (name === "cash") {
          if (netCash < amount)
            return res
              .status(400)
              .json({ msg: "Enough Cash is not available" });
          task.save("cashes", newCash);
        }
        if (name === "bank") {
          if (netBank < amount)
            return res
              .status(400)
              .json({ msg: "Enough amount is not available in bank" });

          task.save("banks", newBank);
        }

        task.run();
        res.json(newTransaction);
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

module.exports = router;
