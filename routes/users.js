const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const config = require("config");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");

const router = express.Router();

// @routes  POST api/users
// @desc    Register a user
// @access  Public
router.post(
  "/",
  [
    check("name", "Please add a name")
      .not()
      .isEmpty(),
    check("gender", "Please specify your gender")
      .not()
      .isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, gender, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({ msg: "User already exist" });
      }

      let femaleIcons = [
        "https://i.ibb.co/YNML0vX/avataaars-8.png",
        "https://i.ibb.co/3y67fTm/avataaars-7.png",
        "https://i.ibb.co/59JsjzL/avataaars-6.png",
        "https://i.ibb.co/1TgMw3W/avataaars-4.png"
      ];

      let maleIcons = [
        "https://i.ibb.co/qNjPpV9/avataaars-5.png",
        "https://i.ibb.co/44Fj4FH/avataaars-2.png",
        "https://i.ibb.co/3M6MHhK/avataaars-1.png",
        "https://i.ibb.co/NxQrY72/avataaars-3.png",
        "https://i.ibb.co/r4mkYC1/avataaars.png"
      ];

      let icon;
      gender === "male"
        ? (icon = maleIcons[Math.ceil(Math.random() * 5)])
        : (icon = femaleIcons[Math.ceil(Math.random() * 4)]);

      user = new User({ name, email, gender, password, icon });

      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        config.get("jwtSecret"),
        {
          expiresIn: 3600000000
        },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

module.exports = router;
