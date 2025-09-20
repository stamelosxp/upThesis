const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema(
  {
    thesisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    thesisTitle: {
      type: String,
      required: true,
    },
    supervisor: {
      quality: { type: Number, min: 0, max: 10 },
      duration: { type: Number, min: 0, max: 10 },
      report: { type: Number, min: 0, max: 10 },
      presentation: { type: Number, min: 0, max: 10 },
    },
    memberA: {
      quality: { type: Number, min: 0, max: 10 },
      duration: { type: Number, min: 0, max: 10 },
      report: { type: Number, min: 0, max: 10 },
      presentation: { type: Number, min: 0, max: 10 },
    },
    memberB: {
      quality: { type: Number, min: 0, max: 10 },
      duration: { type: Number, min: 0, max: 10 },
      report: { type: Number, min: 0, max: 10 },
      presentation: { type: Number, min: 0, max: 10 },
    },
    student: {
      fullName: { type: String, required: true },
      idNumber: { type: String, required: true },
      gender: { type: String, enum: ["male", "female"], required: true },
    },
    members: {
      supervisor: {
        fullName: { type: String, required: true },
        typeProfessor: { type: String, required: true },
      },
      memberA: {
        fullName: { type: String, required: true },
        typeProfessor: { type: String, required: true },
      },
      memberB: {
        fullName: { type: String, required: true },
        typeProfessor: { type: String, required: true },
      },
    },
    protocolDate: {
      type: Date,
      default: null,
    },
    protocolPlace: {
      type: String,
      default: null,
    },
    suggestedGrade: {
      type: Number,
      min: 0,
      max: 10,
    },
    finalGrade: {
      type: Number,
      min: 0,
      max: 10,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Evaluation || mongoose.model("Evaluation", evaluationSchema);
