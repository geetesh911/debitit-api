const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const mongoose = require("mongoose");
const { Asset } = require("../models/Asset");
const { Creditor } = require("../models/Creditor");
const { Cash } = require("../models/Cash");
const Fawn = require("fawn");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const asset = await Asset.find({ user: req.user.id })
      .sort("type")
      .sort("date");
    // .sort("date");
    res.json(asset);
  } catch (error) {
    console.error(error.message);
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
      check("amount", "Amount is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }
    const { name, amount, otherExpenses, creditorId } = req.body;

    try {
      let asset = await Asset.findOne({ name: name.toLowerCase() });
      if (asset) {
        return res.status(400).json({ msg: "Asset already exist" });
      }

      let creditor;

      if (creditorId) {
        creditor = await Creditor.findById(creditorId);
        if (!creditor) return res.status(400).json({ msg: "Invalid creditor" });
      }

      let othExp = 0;
      if (otherExpenses) othExp = otherExpenses;
      const cashCr = await Cash.find({
        $and: [{ user: req.user.id }, { type: "cr" }]
      });
      const cashDr = await Cash.find({
        $and: [{ user: req.user.id }, { type: "dr" }]
      });

      let crTotal = 0;
      let drTotal = 0;

      cashCr.forEach(cr => (crTotal += cr.amount));
      cashDr.forEach(dr => (drTotal += dr.amount));

      const netCash = drTotal - crTotal;

      const newCash = new Cash({
        source: name,
        type: "cr",
        amount: amount + othExp,
        user: req.user.id
      });

      const newAsset = new Asset({
        name,
        amount,
        otherExpenses: othExp,
        user: req.user.id
      });
      if (creditorId) {
        let task = new Fawn.Task();

        task = task.save("assets", newAsset);
        task = task.update(
          "creditors",
          { _id: mongoose.Types.ObjectId(creditorId) },
          { $inc: { due: amount } }
        );
        task.run();
      } else {
        if (netCash < amount)
          return res.status(400).json({ msg: "Enough Cash is not available" });

        let task = new Fawn.Task();

        task = task.save("assets", newAsset);
        task = task.save("cashes", newCash);
        task.run();
      }

      res.json(newAsset);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

router.post(
  "/:id",
  [
    auth,
    [
      check("amount", "Amount is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()[0].msg });
    }
    const { amount, otherExpenses, creditorId } = req.body;

    try {
      let creditor;

      if (creditorId) {
        creditor = await Creditor.findById(creditorId);
        if (!creditor) return res.status(400).json({ msg: "Invalid creditor" });
      }
      const asset = await Asset.findById(req.params.id);
      if (!asset) return res.status(400).json({ msg: "Invalid Asset" });

      let othExp = 0;
      if (otherExpenses) othExp = otherExpenses;
      const cashCr = await Cash.find({
        $and: [{ user: req.user.id }, { type: "cr" }]
      });
      const cashDr = await Cash.find({
        $and: [{ user: req.user.id }, { type: "dr" }]
      });

      let crTotal = 0;
      let drTotal = 0;

      cashCr.forEach(cr => (crTotal += cr.amount));
      cashDr.forEach(dr => (drTotal += dr.amount));

      const netCash = drTotal - crTotal;

      const newCash = new Cash({
        source: asset.name,
        type: "cr",
        amount: amount + othExp,
        user: req.user.id
      });

      if (creditorId) {
        let task = new Fawn.Task();

        task = task.update(
          "assets",
          { _id: mongoose.Types.ObjectId(req.params.id) },
          { $inc: { amount: amount } }
        );
        task = task.update(
          "creditors",
          { _id: mongoose.Types.ObjectId(creditorId) },
          { $inc: { due: amount } }
        );
        task.run();
      } else {
        if (netCash < amount)
          return res.status(400).json({ msg: "Enough Cash is not available" });

        let task = new Fawn.Task();

        task = task.update(
          "assets",
          { _id: mongoose.Types.ObjectId(req.params.id) },
          { $inc: { amount: amount } }
        );
        task = task.save("cashes", newCash);
        task.run();
      }
      res.json({
        amount,
        name: asset.name,
        otherExpenses: othExp,
        user: asset.id,
        id: req.params.id,
        date: Date.now
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

module.exports = router;
