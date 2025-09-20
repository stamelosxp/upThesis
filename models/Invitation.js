const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
  {
    thesisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    professor: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      fullName: {
        type: String,
        required: true,
      },
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Invitation || mongoose.model("Invitation", invitationSchema);
