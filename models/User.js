const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { normalizeGreek } = require("../utils-backend/utils-server");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    role: { type: String, default: null },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    birthDate: { type: Date, default: null },
    mobilePhone: { type: String, default: null },
    phone: { type: String, default: null },
    department: { type: String, default: null },
    email: { type: String, required: true, unique: true },
    profilePhoto: { type: String, default: "/icons/profile.png" },
    studentId: { type: String, default: null },
    yearOfStudies: { type: Number, default: null },
    hasThesis: { type: Boolean, default: false },
    thesisId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", default: null },
    gender: { type: String, enum: ["male", "female"], default: null },
    typeOfProfessor: { type: String, default: null },
    password: { type: String, required: true },
    searchFullName: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

// Pre-save
userSchema.pre("save", async function (next) {
  try {
    if (this.isModified("password") && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    if (this.firstName && this.lastName && this.role !== "secretary") {
      this.searchFullName = normalizeGreek(
        `${this.firstName} ${this.lastName}`
      ).toLowerCase();
    }

    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
