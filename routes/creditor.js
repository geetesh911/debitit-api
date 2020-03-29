const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const validateObjectId = require("../middleware/validateObjectId");
const { Creditor } = require("../models/Creditor");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const creditors = await Creditor.find({ user: req.user.id }).sort({
      date: -1
    });
    res.json(creditors);
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
      check("contact", "Contact number is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }
    const { name, due, contact } = req.body;

    try {
      const newCreditor = new Creditor({
        name,
        due,
        contact,
        user: req.user.id
      });

      const creditor = await newCreditor.save();

      res.json(creditor);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

router.put("/:id", auth, async (req, res) => {
  const { name, due, contact } = req.body;

  // Build a card object
  const creditorFields = {};

  if (name) creditorFields.name = name;
  if (due) creditorFields.due = due;
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
