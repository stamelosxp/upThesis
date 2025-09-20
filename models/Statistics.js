const mongoose = require("mongoose");

const statisticsSchema = new mongoose.Schema({
    professorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    durationAverage: {
        supervisor: { type: Number, default: null },
        member: { type: Number, default: null }
    },
    numberAssignments: {
        supervisor: { type: Number, default: null },
        member: { type: Number, default: null }
    },
    averageGrade: {
        supervisor: { type: Number, default: null },
        member: { type: Number, default: null }
    }
}, { timestamps: true });

module.exports = mongoose.models.Statistics || mongoose.model("Statistics", statisticsSchema);