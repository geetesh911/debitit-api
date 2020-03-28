const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const { Drawing } = require("../models/Drawing");
const { Product } = require("../models/Product");
const { Cash } = require("../models/Cash");
const mongoose = require("mongoose");
const Fawn = require("fawn");

const router = express.Router();

router.get("/", async (req, res) => {
  const cash = await Drawing.find();
  res.json(cash);
});

router.post(
  "/",
  [
    auth,
    [
      check("name", "Name is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }
    const { name, amount, products } = req.body;

    let tAmount = 0;

    if (products) {
      for (let i = 0; i < products.length; i++) {
        product = await Product.findById(products[i].productId);

        if (!product) {
          return res.status(400).json({ msg: "Invalid product." });
        }

        if (products[i].quantity > product.numberInStock) {
          return res.status(400).json({ msg: "Enough stock is not available" });
        }

        tAmount += products[i].quantity * products[i].price;
      }
    }

    try {
      if (name === "stock") {
        const newTransaction = new Drawing({
          name,
          amount: tAmount,
          user: req.user.id
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
      if (name === "cash") {
        const newTransaction = new Drawing({
          name,
          amount,
          user: req.user.id
        });
        const newCash = new Cash({
          source: "drawings",
          type: "cr",
          amount,
          user: req.user.id
        });
        let task = new Fawn.Task();

        task.save("drawings", newTransaction);
        task.save("cashes", newCash);
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
