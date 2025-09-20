const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const mongoose = require("mongoose");

// Initialize router
const router = express.Router();

// Import models
const Topic = require("../models/Topic"); // your Topic model
const User = require("../models/User");
const Assignment = require("../models/Assignment");

// Import middleware and utilities
const { topicUpload } = require("../config/multer");

// Helper functions
const {
  normalizeGreek,
  fsUnlinkSafe,
} = require("../utils-backend/utils-server");


// Update topic helper
async function updateTopic(topic, req) {
  const { title, description, fileRemoved } = req.body;

  if (title) {
    topic.title = title.trim();
    topic.searchTitle = normalizeGreek(title.trim());
  }
  if (description) {
    topic.description = description.trim();
    topic.searchDescription = normalizeGreek(description.trim());
  }

  if (req.file) {
    // delete old file if exists
    if (topic.filePath) {
      const oldFilePath = path.join(__dirname, "..", topic.filePath);
      try {
        await fs.unlink(oldFilePath);
      } catch (err) {
        if (err.code !== "ENOENT")
          console.error("Error deleting old file:", err);
      }
    }
    topic.filePath = "/uploads/topics/" + req.file.filename;
  } else if (fileRemoved === "true") {
    // client explicitly requested removal of existing file
    if (topic.filePath) {
      const oldFilePath = path.join(__dirname, "..", topic.filePath);
      try {
        await fs.unlink(oldFilePath);
      } catch (err) {
        if (err.code !== "ENOENT")
          console.error("Error deleting old file:", err);
      }
      topic.filePath = null;
    }
  }

  await topic.save();
}

// 1. Endpoint to filter topics (sort, search)
router.post("/filters", async (req, res) => {
  try {
    const { search, sort } = req.body;

    // Build MongoDB query
    const query = {};

    // Professors see only their own topics
    if (req.user.role === "professor") {
      query.createdBy = req.user.id;
    }

    // Search filter
    if (search && search.trim().length > 0) {
      const normalizedSearch = normalizeGreek(search.trim().toLowerCase());
      query.$or = [
        { searchTitle: { $regex: normalizedSearch, $options: "i" } },
        { searchDescription: { $regex: normalizedSearch, $options: "i" } },
      ];
    }

    // Build sort object
    let sortObj = {};
    if (sort === "topic_title") {
      sortObj = { title: 1 }; // ascending
    } else if (sort === "date_created") {
      sortObj = { updatedAt: -1 }; // descending
    }

    // Fetch topics from DB
    let topics;
    if (sort === "topic_title") {
      topics = await Topic.find(query)
        .collation({ locale: "el", strength: 1 })
        .sort(sortObj)
        .lean();
    } else {
      topics = await Topic.find(query).sort(sortObj).lean();
    }

    res.json({ success: true, topics });
  } catch (err) {
    console.error("Error filtering topics:", err);
    res.status(500).json({ error: "Error filtering topics" });
  }
});

// 2. Endpoint to create a new topic
router.post("/create", topicUpload.single("file"), async (req, res) => {
  let updatedFilePath = null;
  try {
    if (req.file) {
      updatedFilePath = "/uploads/topics/" + req.file.filename;
    }

    if (req.user.role !== "professor") {
      await fsUnlinkSafe(updatedFilePath);
      return res
        .status(403)
        .json({ success: false, error: "Not authorized to create topics." });
    }

    const { title, description } = req.body;

    if (!title || title.trim().length === 0) {
      await fsUnlinkSafe(updatedFilePath);
      return res
        .status(400)
        .json({ success: false, error: "Title is required." });
    }
    if (!description || description.trim().length === 0) {
      await fsUnlinkSafe(updatedFilePath);
      return res
        .status(400)
        .json({ success: false, error: "Description is required." });
    }

    const newTopic = new Topic({
      title: title.trim(),
      description: description.trim(),
      createdBy: req.user.id,
      filePath: req.file ? "/uploads/topics/" + req.file.filename : null,
    });

    await newTopic.save();

    return res.json({
      success: true,
      message: `Το θέμα "${newTopic.title}" δημιουργήθηκε επιτυχώς.`,
      topic: newTopic,
    });
  } catch (err) {
    console.error("Error creating topic:", err);
    await fsUnlinkSafe(updatedFilePath);
    res.status(500).json({ success: false, error: "Failed to create topic." });
  }
});

// 3. Endpoint to delete a topic
router.delete("/delete/:id", async (req, res) => {
  try {
    const topicId = req.params.id;

    if (!topicId || !mongoose.Types.ObjectId.isValid(topicId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing topic ID." });
    }

    // Find topic by _id
    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res
        .status(404)
        .json({ success: false, error: "Topic not found." });
    }

    // Authorization check
    if (
      req.user.role !== "professor" ||
      topic.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this topic.",
      });
    }

    const topicTitle = topic.title;

    // Delete associated file if exists
    if (topic.filePath) {
      const filePath = path.join(__dirname, "..", topic.filePath);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error("Error deleting topic file:", err);
        }
      }
    }

    // Remove topic from DB
    await Topic.findByIdAndDelete(topicId);

    return res.json({
      success: true,
      message: `Το θέμα "${topicTitle}" διαγράφηκε επιτυχώς.`,
    });
  } catch (err) {
    console.error("Error deleting topic:", err);
    res.status(500).json({ success: false, error: "Failed to delete topic." });
  }
});

// 4. Endpoint to update a topic
router.put("/update/:id", topicUpload.single("file"), async (req, res) => {
  let updatedFilePath = null;

  try {
    const topicId = req.params.id;
    if (req.file) {
      updatedFilePath = "/uploads/topics/" + req.file.filename;
    }

    if (!topicId || !mongoose.Types.ObjectId.isValid(topicId)) {
      await fsUnlinkSafe(updatedFilePath);
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing topic ID." });
    }

    // Find topic
    const topic = await Topic.findById(topicId);
    if (!topic) {
      await fsUnlinkSafe(updatedFilePath);
      return res
        .status(404)
        .json({ success: false, error: "Topic not found." });
    }

    // Authorization
    if (
      req.user.role !== "professor" ||
      topic.createdBy.toString() !== req.user.id
    ) {
      await fsUnlinkSafe(updatedFilePath);
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this topic.",
      });
    }

    await updateTopic(topic, req);

    return res.json({
      success: true,
      message: `Το θέμα "${topic.title}" ενημερώθηκε επιτυχώς.`,
      topic,
    });
  } catch (err) {
    await fsUnlinkSafe(updatedFilePath);
    console.error("Error updating topic:", err);
    res.status(500).json({ success: false, error: "Failed to update topic." });
  }
});

// 5. Endpoint to assign a topic to a student
router.put("/assign/:id", topicUpload.single("file"), async (req, res) => {
  let updatedFilePath = null;
  try {
    const topicId = req.params.id;
    if (req.file) {
      updatedFilePath = "/uploads/topics/" + req.file.filename;
    }

    if (!topicId || !mongoose.Types.ObjectId.isValid(topicId)) {
      await fsUnlinkSafe(updatedFilePath);
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing topic ID." });
    }

    const topic = await Topic.findById(topicId);
    if (!topic) {
      await fsUnlinkSafe(updatedFilePath);
      return res
        .status(404)
        .json({ success: false, error: "Topic not found." });
    }

    // Authorization
    if (
      req.user.role !== "professor" ||
      topic.createdBy.toString() !== req.user.id
    ) {
      await fsUnlinkSafe(updatedFilePath);
      return res.status(403).json({
        success: false,
        error: "Not authorized to assign this topic.",
      });
    }

    await updateTopic(topic, req);

    const { assignment } = req.body;

    if (!assignment) {
      await fsUnlinkSafe(updatedFilePath);
      return res
        .status(400)
        .json({ success: false, error: "Missing student assignment ID." });
    }

    // Find student
    const studentUser = await User.findOne({
      studentId: assignment,
      role: "student",
      hasThesis: false,
    });
    if (!studentUser) {
      await fsUnlinkSafe(updatedFilePath);
      return res.status(400).json({
        success: false,
        error: "Invalid or unavailable student for assignment.",
      });
    }

    const professorUser = await User.findOne({
      _id: topic.createdBy,
      role: "professor",
    }).lean();
    if (!professorUser) {
      await fsUnlinkSafe(updatedFilePath);
      return res
        .status(400)
        .json({ success: false, error: "Invalid professor for assignment." });
    }

    // Build new assignment
    const newAssignment = new Assignment({
      title: topic.title,
      description: topic.description,
      filePath: topic.filePath,
      status: "pending",
      temporaryAssignmentDate: new Date().toISOString(),
      student: {
        fullName: `${studentUser.lastName} ${studentUser.firstName}`,
        idNumber: studentUser.studentId,
        gender: studentUser.gender,
      },
      professors: {
        supervisor: {
          fullName: `${professorUser.lastName} ${professorUser.firstName}`,
          id: topic.createdBy,
          assignmentRole: "supervisor",
        },
        memberA: null,
        memberB: null,
      },
    });

    // Save assignment
    await newAssignment.save();

    // Remove topic
    await Topic.findByIdAndDelete(topicId);

    // Update student
    studentUser.hasThesis = true;
    studentUser.thesisId = newAssignment._id.toString();
    await studentUser.save();

    return res.json({
      success: true,
      message: `Το θέμα "${topic.title}" ανατέθηκε επιτυχώς στον/στην ${studentUser.lastName} ${studentUser.firstName}.`,
    });
  } catch (err) {
    console.error("Error assigning topic:", err);
    await fsUnlinkSafe(updatedFilePath);
    res.status(500).json({ success: false, error: "Failed to assign topic." });
  }
});

module.exports = router;
