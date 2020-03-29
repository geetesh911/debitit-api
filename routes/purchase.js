const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const { Purchase } = require("../models/Purchase");
const { Creditor } = require("../models/Creditor");
const { Product } = require("../models/Product");
const { Cash } = require("../models/Cash");
const Fawn = require("fawn");
const mongoose = require("mongoose");

Fawn.init(mongoose);

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const product = req.query.product;
  try {
    let purchase;
    if (product) {
      purchase = await Purchase.find({
        $and: [
          { user: req.user.id },
          { productName: product },
          { payment: "credit" }
        ]
      });
    } else {
      purchase = await Purchase.find({ user: req.user.id }).sort({
        date: -1
      });
    }
    res.json(purchase);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.post(
  "/",
  [
    auth,
    [
      check("productName", "Name is required")
        .not()
        .isEmpty(),
      check("payment", "Payment method is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }

    const {
      productName,
      payment,
      creditorId,
      quantity,
      perPieceCost,
      perPieceSellingPrice,
      otherExpenses,
      date,
      newPur,
      productId
    } = req.body;

    let othExp = 0;
    otherExpenses ? (othExp = otherExpenses) : (othExp = 0);
    const tAmount = quantity * perPieceCost + othExp;

    if (newPur || productId) {
      let product;

      if (productId) {
        product = await Product.findById(productId);
        if (!product) return res.status(400).json({ msg: "Invalid product." });
      }

      let creditor;

      if (creditorId) {
        creditor = await Creditor.findById(creditorId);
        if (!creditor) return res.status(400).json({ msg: "Invalid creditor" });
      }

      try {
        let newPurchase;
        if (creditor) {
          newPurchase = new Purchase({
            productName,
            payment,
            quantity,
            perPieceCost,
            perPieceSellingPrice,
            otherExpenses,
            totalCost: tAmount,
            date,
            creditor: {
              _id: creditor._id,
              name: creditor.name,
              contact: creditor.contact
            },
            user: req.user.id
          });
        } else {
          newPurchase = new Purchase({
            productName,
            payment,
            quantity,
            perPieceCost,
            perPieceSellingPrice,
            otherExpenses,
            totalCost: tAmount,
            date,
            user: req.user.id
          });
        }

        const cashCr = await Cash.find({ type: "cr" });
        const cashDr = await Cash.find({ type: "dr" });

        let crTotal = 0;
        let drTotal = 0;

        cashCr.forEach(cr => (crTotal += cr.amount));
        cashDr.forEach(dr => (drTotal += dr.amount));

        const netCash = drTotal - crTotal;

        const newCash = new Cash({
          source: "purchase",
          type: "cr",
          amount: tAmount,
          user: req.user.id
        });

        if (newPur) {
          const newProduct = new Product({
            productName,
            numberInStock: quantity,
            perPieceCost,
            perPieceSellingPrice,
            user: req.user.id
          });
          if (creditor) {
            if (!mongoose.Types.ObjectId.isValid(creditorId))
              return res.status(404).json({ msg: "Invalid ID." });

            new Fawn.Task()
              .save("purchases", newPurchase)
              .update(
                "creditors",
                { _id: mongoose.Types.ObjectId(creditorId) },
                { $inc: { due: tAmount } }
              )
              .save("products", newProduct)
              .run();
          } else {
            if (netCash < tAmount)
              return res
                .status(400)
                .json({ msg: "Enough Cash is not available" });

            new Fawn.Task()
              .save("purchases", newPurchase)
              .save("products", newProduct)
              .save("cashes", newCash)
              .run();
          }

          res.json({ newPurchase, newProduct });
        } else {
          if (!mongoose.Types.ObjectId.isValid(productId))
            return res.status(404).json({ msg: "Invalid ID." });
          if (creditor) {
            new Fawn.Task()
              .save("purchases", newPurchase)
              .update(
                "creditors",
                { _id: mongoose.Types.ObjectId(creditorId) },
                { $inc: { due: tAmount } }
              )
              .update(
                "products",
                { _id: mongoose.Types.ObjectId(productId) },
                { $inc: { numberInStock: quantity } }
              )
              .run();
          } else {
            if (netCash < tAmount)
              return res
                .status(400)
                .json({ msg: "Enough Cash is not available" });
            new Fawn.Task()
              .save("purchases", newPurchase)
              .update(
                "products",
                { _id: mongoose.Types.ObjectId(productId) },
                { $inc: { numberInStock: quantity } }
              )
              .save("cashes", newCash)
              .run();
          }

          res.json(newPurchase);
        }
      } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: "Server Error" });
      }
    } else {
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

router.put("/:id", auth, async (req, res) => {
  const {
    productName,
    payment,
    creditorId,
    quantity,
    perPieceCost,
    perPieceSellingPrice,
    date
  } = req.body;

  // Build a card object
  const purchaseFields = {};

  if (productName) purchaseFields.productName = productName;
  if (payment) purchaseFields.payment = payment;
  if (quantity) purchaseFields.quantity = quantity;
  if (perPieceCost) purchaseFields.perPieceCost = perPieceCost;
  if (perPieceSellingPrice)
    purchaseFields.perPieceSellingPrice = perPieceSellingPrice;
  if (date) purchaseFields.date = date;

  try {
    let purchase = await Purchase.findById(req.params.id);

    if (!purchase) return res.status(500).json({ msg: "Not found" });

    // Make sure user owns card
    if (purchase.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not Authorized" });
    }

    if (creditorId) {
      const creditor = await Creditor.findById(creditorId);
      if (!creditor) return res.status(400).json({ msg: "Invalid creditor" });

      purchaseFields.creditor = {
        _id: creditor._id,
        name: creditor.name,
        contact: creditor.contact
      };
    }

    purchase = await Purchase.findOneAndUpdate(
      { _id: req.params.id },
      { $set: purchaseFields },
      { new: true }
    );

    res.json(purchase);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    let purchase = await Purchase.findById(req.params.id);

    if (!purchase) return res.status(500).json({ msg: "Purchase not found" });

    // Make sure user owns the purchase
    if (purchase.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not Authorized" });
    }

    await Purchase.findByIdAndRemove(req.params.id);

    res.json({ msg: "Purchase Removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
