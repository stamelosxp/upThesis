const express = require("express");
const Mongoose = require("mongoose");

// Set up router
const router = express.Router();

// Import Models
const Note = require("../models/Note");

// 1. Endpoint to get all notes for a thesis
router.get("/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;
    if (!thesisId) {
      return res
        .status(400)
        .json({ success: false, error: "No thesis ID provided." });
    }

    if (!["professor", "student"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized." });
    }

    const notes = await Note.find({
      thesisId,
      userId: new Mongoose.Types.ObjectId(req.user.id),
    }).sort({ createdAt: -1 });

    const responseNotes = notes.map((note) => {
      return {
        id: note._id.toString(),
        userId: note.userId,
        thesisId: note.thesisId,
        noteTitle: note.noteTitle,
        noteContent: note.noteContent,
        dateCreated: note.createdAt,
      };
    });

    return res.json({ success: true, notes: responseNotes });
  } catch (e) {
    console.error("Error fetching notes", e);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load notes" });
  }
});

// 2. Endpoint to delete a note by ID
router.delete("/:id", async (req, res) => {
  try {
    const noteId = req.params.id;
    if (!noteId) {
      return res
        .status(400)
        .json({ success: false, error: "No note ID provided." });
    }

    if (!["professor", "student"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized." });
    }

    //Cast id to objectId
    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({ success: false, error: "Note not found." });
    }

    // Authorization check
    if (note.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, error: "Not authorized to delete this note." });
    }

    await Note.findByIdAndDelete(noteId);

    return res.json({ success: true });
  } catch (err) {
    console.error("Error deleting note:", err);
    res.status(500).json({ success: false, error: "Failed to delete note." });
  }
});

// 3. Endpoint to add a new note to a thesis
router.post("/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;
    const { noteTitle, noteDetails } = req.body;

    if (!["professor", "student"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized." });
    }

    if (!thesisId) {
      return res
        .status(400)
        .json({ success: false, error: "No thesis ID provided." });
    }
    if (!noteTitle || noteTitle.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Note title is required." });
    }
    if (!noteDetails || noteDetails.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Note details are required." });
    }

    const newNote = new Note({
      userId: new Mongoose.Types.ObjectId(req.user.id),
      noteTitle: noteTitle.trim(),
      noteContent: noteDetails.trim(),
      thesisId,
    });

    await newNote.save();

    const responseNote = {
      id: newNote._id.toString(),
      userId: newNote.userId,
      thesisId: newNote.thesisId,
      noteTitle: newNote.noteTitle,
      noteContent: newNote.noteContent,
      dateCreated: newNote.createdAt,
    };

    return res.json({ success: true, note: responseNote });
  } catch (err) {
    console.error("Error saving note:", err);
    res.status(500).json({ success: false, error: "Failed to save note." });
  }
});

module.exports = router;
