const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  sessionId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isAuth: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
});

module.exports =
  mongoose.models.Session || mongoose.model("Session", sessionSchema);
