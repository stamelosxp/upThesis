const mongoose = require("mongoose");
const { normalizeGreek } = require("../utils-backend/utils-server");

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true, maxlength: 500 },
    filePath: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "active", "review", "completed", "cancelled"],
      default: "pending",
    },
    temporaryAssignmentDate: { type: Date, default: null },
    officialAssignmentDate: { type: Date, default: null },
    underReviewDate: { type: Date, default: null },
    presentationDate: { type: Date, default: null },
    completedDate: { type: Date, default: null },
    cancelledDate: { type: Date, default: null },
    student: {
      fullName: { type: String, required: true },
      idNumber: { type: String, required: true },
      gender: { type: String, enum: ["male", "female"], default: null },
    },
    // Use indexes on professors' ids for faster queries
    professors: {
      supervisor: {
        fullName: { type: String, required: true },
        id: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
        assignmentRole: { type: String, required: true },
      },
      memberA: {
        fullName: { type: String, default: null },
        id: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
        assignmentRole: { type: String, default: null },
      },
      memberB: {
        fullName: { type: String, default: null },
        id: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
        assignmentRole: { type: String, default: null },
      },
    },
    gradesExists: {
      supervisor: { type: Boolean, default: false },
      memberA: { type: Boolean, default: false },
      memberB: { type: Boolean, default: false },
    },
    protocolNumberAssignment: { type: String, default: null },
    protocolNumberCancelled: { type: String, default: null },
    reasonForCancellation: { type: String, default: null },
    temporaryReportFile: { type: String, default: null },
    temporaryLinks: { type: [String], default: [] },
    protocolExists: { type: Boolean, default: false },
    nemertesLink: { type: String, default: "" },
    finalGrade: { type: Number, min: 0, max: 10, default: null },
    pendingChanges: { type: Boolean, default: false },
    searchTitle: { type: String, index: true },
    searchDescription: { type: String, index: true },
    searchStudentIdNumber: { type: String, index: true },
    searchStudentFullName: { type: String, index: true },
  },
  { timestamps: true }
);

// Pre-save: normalize Greek for search
assignmentSchema.pre("save", function (next) {
  try {
    if (this.title) this.searchTitle = normalizeGreek(this.title).toLowerCase();
    if (this.description)
      this.searchDescription = normalizeGreek(this.description).toLowerCase();
    if (this.student && this.student.idNumber)
      this.searchStudentIdNumber = normalizeGreek(
        this.student.idNumber
      ).toLowerCase();
    if (this.student && this.student.fullName)
      this.searchStudentFullName = normalizeGreek(
        this.student.fullName
      ).toLowerCase();
    next();
  } catch (err) {
    next(err);
  }
});

module.exports =
  mongoose.models.Assignment || mongoose.model("Assignment", assignmentSchema);
