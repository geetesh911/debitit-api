const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const { Customer } = require("../models/Customer");
const { Cash } = require("../models/Cash");
const Fawn = require("fawn");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const customers = await Customer.find({ user: req.user.id }).sort({
      date: -1
    });
    res.json(customers);
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
      check("name", "Name is required")
        .not()
        .isEmpty(),
      check("mobile", "Mobile number is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }
    const { name, due, mobile } = req.body;

    try {
      const newCustomer = new Customer({
        name,
        due,
        mobile,
        user: req.user.id
      });

      const customer = await newCustomer.save();

      res.json(customer);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

router.put("/:id", auth, async (req, res) => {
  const { name, due, mobile } = req.body;

  // Build a card object
  const customerFields = {};

  if (name) customerFields.name = name;
  if (due) customerFields.due = due;
  if (mobile) customerFields.mobile = mobile;

  try {
    let customer = await Customer.findById(req.params.id);

    if (!customer) return res.status(500).json({ msg: "Not found" });

    // Make sure user owns card
    if (customer.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not Authorized" });
    }

    customer = await Customer.findOneAndUpdate(
      { _id: req.params.id },
      { $set: customerFields },
      { new: true }
    );

    res.json(customer);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    let customer = await Customer.findById(req.params.id);

    if (!customer) return res.status(500).json({ msg: "Customer not found" });

    // Make sure user owns the customer
    // if (customer.user.toString() !== req.user.id) {
    //   return res.status(401).json({ msg: "Not Authorized" });
    // }

    await Customer.findByIdAndRemove(req.params.id);

    res.json({ msg: "Customer Removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/:id", [auth], async (req, res) => {
  const customer = await Customer.findById(req.params.id).select("-__v");

  if (!customer)
    return res
      .status(404)
      .send("The customer with the given ID was not found.");

  res.json(customer);
});

module.exports = router;
