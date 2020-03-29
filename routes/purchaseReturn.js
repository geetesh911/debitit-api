const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const validateObjectId = require("../middleware/validateObjectId");
const { PurchaseReturn } = require("../models/PurchaseReturn");
const { Purchase } = require("../models/Purchase");
const { Product } = require("../models/Product");
const { Creditor } = require("../models/Creditor");
const Fawn = require("fawn");
const mongoose = require("mongoose");

// Fawn.init(mongoose);

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const purchaseReturn = await PurchaseReturn.find({
      user: req.user.id
    }).sort({
      date: -1
    });

    res.json(purchaseReturn);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.post(
  "/",
  [
    // validateObjectId,
    auth,
    [
      check("purchaseId", "Purcahse Id is required")
        .not()
        .isEmpty(),
      check("productId", "Product Id is required")
        .not()
        .isEmpty(),
      check("quantity", "Quantity is required")
        .not()
        .isEmpty(),
      check("perPieceCost", "Per piece cost is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }
    const { purchaseId, productId, quantity, perPieceCost } = req.body;

    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) return res.status(400).json({ msg: "Invalid purchase" });

    const product = await Product.findById(productId);
    if (!product) return res.status(400).json({ msg: "Invalid product." });

    const totalProductReturn = await PurchaseReturn.find({
      "purchase._id": purchase._id
    });

    let purchaseReturnQuantityTotal = 0;
    totalProductReturn.forEach(productReturn => {
      purchaseReturnQuantityTotal += productReturn.quantity;
    });

    if (
      quantity > purchase.quantity - purchaseReturnQuantityTotal &&
      quantity > product.numberInStock
    )
      return res.status(400).json({ msg: "Cannot return more than purchased" });

    try {
      const newPurchaseReturn = new PurchaseReturn({
        purchase: {
          _id: purchase._id,
          productName: purchase.productName,
          payment: purchase.payment,
          quantity: purchase.quantity,
          perPieceCost: purchase.perPieceCost,
          perPieceSellingPrice: purchase.perPieceSellingPrice,
          otherExpenses: purchase.otherExpenses,
          totalCost: purchase.totalCost,
          date: purchase.date,
          creditor: {
            _id: purchase.creditor._id,
            name: purchase.creditor.name,
            contact: purchase.creditor.contact
          },
          user: purchase.user
        },
        quantity,
        perPieceCost,
        totalAmount: quantity * perPieceCost,
        user: req.user.id
      });

      const amount = quantity * perPieceCost;

      if (!mongoose.Types.ObjectId.isValid(productId))
        return res.status(404).json({ msg: "Invalid ID." });

      new Fawn.Task()
        .save("purchasereturns", newPurchaseReturn)
        .update(
          "creditors",
          { _id: mongoose.Types.ObjectId(purchase.creditor._id) },
          { $inc: { due: -amount } }
        )
        .update(
          "products",
          { _id: mongoose.Types.ObjectId(productId) },
          { $inc: { numberInStock: -quantity } }
        )
        .run();

      res.json(newPurchaseReturn);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

router.put("/:id", auth, async (req, res) => {
  const { name, contact } = req.body;

  // Build a card object
  const creditorFields = {};

  if (name) creditorFields.name = name;
  if (contact) creditorFields.contact = contact;

  try {
    let creditor = await Creditor.findById(req.params.id);

    if (!creditor) return res.status(500).json({ msg: "Not found" });

    // Make sure user owns card
    if (creditor.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not Authorized" });
    }

    creditor = await Creditor.findOneAndUpdate(
      { _id: req.params.id },
      { $set: creditorFields },
      { new: true }
    );

    res.json(creditor);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    let creditor = await Creditor.findById(req.params.id);

    if (!creditor) return res.status(500).json({ msg: "Creditor not found" });

    // Make sure user owns the creditor
    // if (creditor.user.toString() !== req.user.id) {
    //   return res.status(401).json({ msg: "Not Authorized" });
    // }

    await Creditor.findByIdAndRemove(req.params.id);

    res.json({ msg: "Creditor Removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/:id", [auth], async (req, res) => {
  const creditor = await Creditor.findById(req.params.id).select("-__v");

  if (!creditor)
    return res
      .status(404)
      .send("The creditor with the given ID was not found.");

  res.json(creditor);
});

module.exports = router;
