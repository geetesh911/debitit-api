const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const { Sales } = require("../models/Sales");
const { Customer } = require("../models/Customer");
const { Product } = require("../models/Product");
const Fawn = require("fawn");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const product = req.query.product;
  try {
    let sales;
    if (product) {
      sales = await Sales.find({
        $and: [
          { user: req.user.id },
          { productName: product },
          { payment: "credit" }
        ]
      });
    } else {
      sales = await Sales.find({ user: req.user.id }).sort({
        date: -1
      });
    }
    res.json(sales);
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
      customerId,
      quantity,
      price,
      otherExpenses,
      date,
      productId
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(400).json({ msg: "Invalid product." });

    let customer;

    if (customerId) {
      customer = await Customer.findById(customerId);
      if (!customer) return res.status(400).json({ msg: "Invalid customer" });
    }

    if (quantity > product.numberInStock) {
      return res.status(400).json({ msg: "Enough stock is not available" });
    }

    try {
      let newSale;
      if (customer) {
        newSale = new Sales({
          productName,
          payment,
          quantity,
          price,
          otherExpenses,
          totalCost: quantity * price + otherExpenses,
          date,
          customer: {
            _id: customer._id,
            name: customer.name,
            mobile: customer.mobile
          },
          user: req.user.id
        });
      } else {
        newSale = new Sales({
          productName,
          payment,
          quantity,
          price,
          otherExpenses,
          totalCost: quantity * price + otherExpenses,
          date,
          user: req.user.id
        });
      }

      if (!mongoose.Types.ObjectId.isValid(productId))
        return res.status(404).json({ msg: "Invalid ID." });
      new Fawn.Task()
        .save("sales", newSale)
        .update(
          "products",
          { _id: mongoose.Types.ObjectId(productId) },
          { $inc: { numberInStock: -quantity } }
        )
        .run();

      res.json(newSale);
    } catch (err) {
      console.error(err.message);
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
    let purchase = await Sales.findById(req.params.id);

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

    purchase = await Sales.findOneAndUpdate(
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
    let purchase = await Sales.findById(req.params.id);

    if (!purchase) return res.status(500).json({ msg: "Purchase not found" });

    // Make sure user owns the purchase
    if (purchase.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not Authorized" });
    }

    await Sales.findByIdAndRemove(req.params.id);

    res.json({ msg: "Purchase Removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
