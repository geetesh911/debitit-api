const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const validateObjectId = require("../middleware/validateObjectId");
const { SalesReturn } = require("../models/SalesReturn");
const { Sales } = require("../models/Sales");
const { Product } = require("../models/Product");
const { Creditor } = require("../models/Creditor");
const Fawn = require("fawn");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const salesReturn = await SalesReturn.find({
      user: req.user.id
    }).sort({
      date: -1
    });

    res.json(salesReturn);
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
      check("salesId", "Sales Id is required")
        .not()
        .isEmpty(),
      check("productId", "Product Id is required")
        .not()
        .isEmpty(),
      check("quantity", "Quantity is required")
        .not()
        .isEmpty(),
      check("price", "price is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }
    const { salesId, productId, quantity, price } = req.body;

    const sales = await Sales.findById(salesId);
    if (!sales) return res.status(400).json({ msg: "Invalid sale" });

    const product = await Product.findById(productId);
    if (!product) return res.status(400).json({ msg: "Invalid product." });

    const totalProductReturn = await SalesReturn.find({
      "sales._id": sales._id
    });

    let salesReturnQuantityTotal = 0;
    totalProductReturn.forEach(productReturn => {
      salesReturnQuantityTotal += productReturn.quantity;
    });

    if (quantity > sales.quantity - salesReturnQuantityTotal)
      return res.status(400).json({ msg: "Cannot return more than sold" });

    try {
      const newSalesReturn = new SalesReturn({
        sales: {
          _id: sales._id,
          productName: sales.productName,
          payment: sales.payment,
          quantity: sales.quantity,
          price: sales.price,
          otherExpenses: sales.otherExpenses,
          totalCost: sales.totalCost,
          date: sales.date,
          customer: {
            _id: sales.customer._id,
            name: sales.customer.name,
            contact: sales.customer.contact
          },
          user: sales.user
        },
        quantity,
        price,
        totalAmount: quantity * price,
        user: req.user.id
      });

      if (!mongoose.Types.ObjectId.isValid(productId))
        return res.status(404).json({ msg: "Invalid ID." });

      new Fawn.Task()
        .save("salesreturns", newSalesReturn)
        .update(
          "products",
          { _id: mongoose.Types.ObjectId(productId) },
          { $inc: { numberInStock: quantity } }
        )
        .run();

      res.json(newSalesReturn);
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
