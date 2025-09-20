const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    thesisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    thesisTitle: {
      type: String,
      required: true,
    },
    presentationDateTime: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    place1: {
      type: String,
      required: true,
    },
    place2: {
      type: String,
      default: null,
    },
    studentName: {
      type: String,
      required: true,
    },
    supervisorName: {
      type: String,
      required: true,
    },
    members: {
      type: [String],
      default: [],
    },
    hasModified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema);
