const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const bcrypt = require("bcrypt");

router.post("/", async (req, res) => {
  console.log("Login request received");
  try {
    console.log("Request body:", req.body);
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        type: "missing_fields",
        error: "Username and password are required",
      });
    }

    const user = await User.findOne({ username }).lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        type: "invalid_credentials",
        error: "Invalid username or password",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        type: "invalid_credentials",
        error: "Invalid username or password",
      });
    }

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role,
    };

    if (rememberMe) {
      // Cookie lasts 1 year
      req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
      req.session.touch(); // refresh session TTL in MongoDB
    } else {
      // Non-remember: session cookie + 1 day TTL in DB
      req.session.cookie.expires = false; // session cookie expires on browser close
      req.session.cookie.maxAge = undefined; // ensure session cookie
      req.session.touch(); // refresh TTL
      // override TTL in MongoStore
      req.sessionStore.ttl = 24 * 60 * 60; // 1 day in seconds
    }

    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role },
      "supersecret",
      { expiresIn: rememberMe ? "365d" : "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // set true if HTTPS
      maxAge: rememberMe ? 365 * 24 * 60 * 60 * 1000 : null,
    });

    return res.json({
      success: true,
    });
  } catch (e) {
    console.error("Error during login", e);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

module.exports = router;
