const jwt = require("jsonwebtoken");
const User = require("../models/User");

const SECRET = "supersecret";

// 1. Function to set res.locals based on session or JWT
async function setLocals(req, res, next) {
  try {
    res.locals.isAuth = false;
    res.locals.connectedUserRole = "guest";
    res.locals.connectedUserUsername = "Guest";
    res.locals.connectedUserId = null;

    let user = null;

    // Check session from database
    if (req.cookies?.sessionId) {
      const session = await Session.findOne({
        sessionId: req.cookies.sessionId,
        isAuth: true,
        expiresAt: { $gt: new Date() }, // not expired
      })
        .populate("userId")
        .lean();

      // Check if session is valid
      if (session?.userId) {
        console.log("Session found for user:", session.userId.username);
        user = session.userId;
        req.user = {
          id: user._id.toString(),
          username: user.username,
          role: user.role,
        };
      }
    }

    // Fallback to JWT if no valid session
    if (!user && req.cookies?.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, SECRET);
        user = await User.findById(decoded.id).lean();
        req.user = decoded;
      } catch (err) {
        console.warn("Invalid JWT:", err.message);
      }
    } 

    // Populate res.locals if user found
    if (user) {
      res.locals.isAuth = true;
      res.locals.connectedUserRole = user.role;
      res.locals.connectedUserUsername = user.username;
      res.locals.connectedUserId = user._id.toString();
      res.locals.connectedUserPhoto =
        user.profilePhoto || "/public/icons/profile.png";
      req.user = req.user || {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
      };
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
