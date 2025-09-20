const express = require("express");
const router = express.Router();

const Statistics = require("../models/Statistics");

// 1. Endpoint to get professor statistics (professor)
router.get("/", async (req, res) => {
  try {
    if (req.user.role !== "professor") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const professorId = req.user.id;
    if (!professorId) {
      return res
        .status(400)
        .json({ error: "Bad Request: Missing professor ID" });
    }

    if (req.user.role !== "professor") {
      return res.status(403).send("Access denied");
    }

    const stats = await Statistics.findOne({
      professorId: req.user.id,
    }).lean();

    // Helper: convert days -> months (approx 30 days) and keep one decimal
    const toMonths1Decimal = (v) =>
      v == null ? null : Number((v / 30).toFixed(1));

    const responseStats = stats
      ? {
          durationAverage: {
            supervisor: toMonths1Decimal(stats?.durationAverage?.supervisor),
            member: toMonths1Decimal(stats?.durationAverage?.member),
          },
          numberAssignments: {
            supervisor: stats?.numberAssignments?.supervisor ?? 0,
            member: stats?.numberAssignments?.member ?? 0,
          },
          averageGrade: {
            supervisor: stats?.averageGrade?.supervisor ?? 0,
            member: stats?.averageGrade?.member ?? 0,
          },
        }
      : null;

    res.status(200).json({ success: true, stats: responseStats || {} });
  } catch (err) {
    console.error("Error fetching statistics:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
