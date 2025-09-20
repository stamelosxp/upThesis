// db.js
const mongoose = require("mongoose");
mongoose.set("debug", true);
async function connectDB() {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/upThesis");
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err.message);
        process.exit(1);
    }
}

module.exports = connectDB;
