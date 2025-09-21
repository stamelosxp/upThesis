const jwt = require("jsonwebtoken");
const User = require("../models/User");

const SECRET = "supersecret";

// 1. Function to set res.locals based on session or JWT
async function setLocals(req, res, next) {
	try {
		// default guest state
		res.locals.isAuth = false;
		res.locals.connectedUserRole = "guest";
		res.locals.connectedUserUsername = "Guest";
		res.locals.connectedUserId = null;
		res.locals.connectedUserPhoto = "/public/icons/profile.png";

		let user = null;

		console.log("Checking session and JWT for user authentication...");

		// --- 1. Check express-session (MongoStore)
		if (req.session?.userId) {
			user = await User.findById(req.session.userId).lean();
			if (user) {
				console.log("Session user found:", user.username);
				req.user = {
					id: user._id.toString(),
					username: user.username,
					role: user.role,
				};
			}
		}

		// --- 2. Fallback to JWT if no valid session
		if (!user && req.cookies?.token) {
			try {
				const decoded = jwt.verify(req.cookies.token, SECRET);
				user = await User.findById(decoded.id).lean();
				if (user) {
					req.user = {
						id: user._id.toString(),
						username: user.username,
						role: user.role,
					};
				}
			} catch (err) {
				console.warn("Invalid JWT:", err.message);
			}
		}

		// --- 3. If we have a user, set locals
		if (user) {
			res.locals.isAuth = true;
			res.locals.connectedUserRole = user.role;
			res.locals.connectedUserUsername = user.username;
			res.locals.connectedUserId = user._id.toString();
			res.locals.connectedUserPhoto =
				user.profilePhoto || "/public/icons/profile.png";
		}

		next();
	} catch (err) {
		console.error("Auth middleware error:", err);
		next(err);
	}
}

// 2. Middleware to authenticate page access based on roles
function requirePageRoles(roles = []) {
	return (req, res, next) => {
		if (!res.locals.isAuth) {
			req.flash("error", "Παρακαλώ συνδεθείτε για να συνεχίσετε.");
			return res.redirect("/login");
		}
		if (!roles.includes(res.locals.connectedUserRole)) {
			// Create an error object with status 403 and pass it to next
			const err = new Error("Access Denied");
			err.status = 403;
			return next(err); // <- This triggers your 403 error page
		}

		next();
	};
}

// 3. Middleware to authenticate API requests via JWT
function requireApiAuth(req, res, next) {
	const token =
		req.cookies?.token || req.headers["authorization"]?.split(" ")[1];
	if (!token) {
		return res.status(401).json({ success: false, error: "Unauthorized" });
	}

	try {
		const decoded = jwt.verify(token, "supersecret");
		req.user = decoded;
		next();
	} catch (err) {
		return res
			.status(401)
			.json({ success: false, error: "Invalid or expired token" });
	}
}

module.exports = { setLocals, requirePageRoles, requireApiAuth };
