const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const { Product } = require("../models/Product");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const products = await Product.find({ user: req.user.id }).sort({
      date: -1
    });
    res.json(products);
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
      numberInStock,
      perPieceCost,
      perPieceSellingPrice
    } = req.body;

    try {
      const newProduct = new Product({
        productName,
        numberInStock,
        perPieceCost,
        perPieceSellingPrice,
        user: req.user.id
      });

      const product = await newProduct.save();

      res.json(product);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

router.put("/:id", auth, async (req, res) => {
  const {
    productName,
    numberInStock,
    perPieceCost,
    perPieceSellingPrice
  } = req.body;

  // Build a card object
  const productFields = {};

  if (productName) productFields.productName = productName;
  if (numberInStock) productFields.numberInStock = numberInStock;
  if (perPieceCost) productFields.perPieceCost = perPieceCost;
  if (perPieceSellingPrice)
    productFields.perPieceSellingPrice = perPieceSellingPrice;

  try {
    let product = await Product.findById(req.params.id);

    if (!product) return res.status(500).json({ msg: "Not found" });

    // Make sure user owns card
    if (product.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not Authorized" });
    }

    product = await Product.findOneAndUpdate(
      { _id: req.params.id },
      { $set: productFields },
      { new: true }
    );

    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) return res.status(500).json({ msg: "Product not found" });

    // Make sure user owns the product
    if (product.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not Authorized" });
    }

    await Product.findByIdAndRemove(req.params.id);

    res.json({ msg: "Product Removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/:id", [auth], async (req, res) => {
  const product = await Product.findById(req.params.id).select("-__v");

  if (!product)
    return res.status(404).send("The Product with the given ID was not found.");

  res.json(product);
});

module.exports = router;
