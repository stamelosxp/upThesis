const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const bcrypt = require("bcrypt");

// Login route
router.post("/", async (req, res) => {
	console.log("Login request received");
	try {
		const { username, password, rememberMe } = req.body;

		if (!username || !password) {
			return res.status(400).json({
				success: false,
				type: "missing_fields",
				error: "Username and password are required",
			});
		}

		// Find user
		const user = await User.findOne({ username });
		if (!user) {
			return res.status(401).json({
				success: false,
				type: "invalid_credentials",
				error: "Invalid username or password",
			});
		}

		// Validate password
		const match = await bcrypt.compare(password, user.password);
		if (!match) {
			return res.status(401).json({
				success: false,
				type: "invalid_credentials",
				error: "Invalid username or password",
			});
		}

		req.session.userId = user._id.toString();

		// Configure cookie lifetime
		if (rememberMe) {
			req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
		} else {
			req.session.cookie.expires = false; // session cookie, deleted on browser close
			req.session.touch();
		}

		// issue JWT as fallback for APIs / mobile clients
		const token = jwt.sign(
			{ id: user._id.toString(), username: user.username, role: user.role },
			"supersecret",
			{ expiresIn: rememberMe ? "365d" : "1d" }
		);

		// Send JWT in cookie
		res.cookie("token", token, {
			httpOnly: true,
			secure: false,
			...(rememberMe
				? { maxAge: 365 * 24 * 60 * 60 * 1000 } // persistent cookie
				: { expires: false }), // session-only cookie
		});

		return res.json({
			success: true,
			message: "Login successful",
		});
	} catch (e) {
		console.error("Error during login", e);
		res.status(500).json({ success: false, error: "Login failed" });
	}
});

module.exports = router;
