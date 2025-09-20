const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs").promises;

const User = require("../models/User");

const { fsUnlinkSafe } = require("../utils-backend/utils-server");
const { profileImageUpload } = require("../config/multer");

// 1. Endpoint to update communication data (email, phone, mobile) (user or secretary)
router.put("/update/communication/:id", async (req, res) => {
  try {
    const reqUserId = req.params.id;
    console.log("Request to update communication data for user ID:", reqUserId);
    console.log("Request body:", req.body);
    if (!reqUserId || !mongoose.Types.ObjectId.isValid(reqUserId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID." });
    }

    const { email, phone, mobile } = req.body;

    if (!email || !mobile) {
      return res
        .status(400)
        .json({ success: false, message: "Email and mobile are required" });
    }

    //check email pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format" });
    }

    //check if email exists for another user
    const existingUser = await User.findOne({ email: email });
    if (existingUser && existingUser._id.toString() !== reqUserId) {
      return res.status(400).json({
        success: false,
        message: "Email already in use by another user",
      });
    }

    if (
      req.user.role !== "secretary" &&
      reqUserId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to update this user's communication data.",
      });
    }

    console.log("Updating user:", reqUserId);

    await User.findByIdAndUpdate(
      reqUserId,
      {
        email,
        phone,
        mobilePhone: mobile || null,
      },
      { new: true }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating communication data:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// 2. Endpoint to update account data (username, password, profile photo) (user)
router.put(
  "/update/account",
  profileImageUpload.single("photo"),
  async (req, res) => {
    let uploadedFilePath = null;
    try {
      const { username, new_password, old_password } = req.body;
      console.log("Received data:", {
        username,
        new_password,
        old_password,
        file: req.file,
      });

      const currentId = req.user.id;

      if (req.file) {
        uploadedFilePath = "/uploads/profile_photo/" + req.file.filename;
      }

      if (!currentId || !mongoose.Types.ObjectId.isValid(currentId)) {
        await fsUnlinkSafe(uploadedFilePath);
        return res.status(400).json({
          success: false,
          message: "Invalid user ID.",
        });
      }

      const user = await User.findById(currentId);
      if (!user) {
        await fsUnlinkSafe(uploadedFilePath);
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // -------- Password Validation --------
      const changingPassword = new_password || old_password;
      if (changingPassword) {
        if (!old_password || !new_password) {
          await fsUnlinkSafe(uploadedFilePath);
          return res.status(400).json({
            success: false,
            credFlag: true,
            message:
              "Both old and new passwords are required to change password",
          });
        }

        if (new_password.length < 5 || new_password.length > 20) {
          await fsUnlinkSafe(uploadedFilePath);
          return res.status(400).json({
            success: false,
            credFlag: true,
            message: "New password must be between 5 and 20 characters long",
          });
        }

        const isMatch = await user.comparePassword(old_password);
        if (!isMatch) {
          await fsUnlinkSafe(uploadedFilePath);
          return res.status(400).json({
            success: false,
            credFlag: true,
            message: "Invalid credentials",
          });
        }

        user.password = new_password; // hashed automatically in pre-save
      }

      // -------- Username Validation --------
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ username });
        if (
          existingUser &&
          existingUser._id.toString() !== user._id.toString()
        ) {
          await fsUnlinkSafe(uploadedFilePath);
          return res.status(400).json({
            success: false,
            credFlag: true,
            message: "Username already taken",
          });
        }
        user.username = username;

        // update portMap if using mock auth
        const port = req.socket.localPort;
        if (global.portMap && global.portMap[port]) {
          global.portMap[port].username = username;
        }
      }

      // -------- Profile Photo --------
      if (req.file) {
        console.log("New profile photo uploaded:", req.file);

        // delete old photo
        if (user.profilePhoto && user.profilePhoto !== "/icons/profile.png") {
          const oldFilePath = path.join(__dirname, "..", user.profilePhoto);
          try {
            await fs.unlink(oldFilePath);
          } catch (err) {
            if (err.code !== "ENOENT")
              console.error("Error deleting old photo:", err);
          }
        }

        // save uploaded file path as string
        user.profilePhoto = "/uploads/profile_photo/" + req.file.filename;
      }

      await user.save();

      const data = {
        username: user.username,
        profilePhoto: user.profilePhoto,
      };

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Error updating account data:", error);

      // --- Delete uploaded file if route fails ---
      if (uploadedFilePath) {
        await fsUnlinkSafe(uploadedFilePath);
      }
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

module.exports = router;
