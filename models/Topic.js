const mongoose = require("mongoose");
const { normalizeGreek } = require("../utils-backend/utils-server");

const topicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    filePath: { type: String, default: null },
    searchTitle: { type: String, index: true },
    searchDescription: { type: String, index: true },
  },
  { timestamps: true }
);

// Pre-save: normalize Greek for search
topicSchema.pre("save", function (next) {
  try {
    if (this.title) this.searchTitle = normalizeGreek(this.title).toLowerCase();
    if (this.description)
      this.searchDescription = normalizeGreek(this.description).toLowerCase();
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.models.Topic || mongoose.model("Topic", topicSchema);
