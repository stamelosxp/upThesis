const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");

// Models
const Topic = require("../models/Topic"); 
const Assignment = require("../models/Assignment");
const Invitation = require("../models/Invitation");

router.get("/dashboard/:professorId", async (req, res) => {
  try {
    const professorId = req.params.professorId;

    if (!professorId || !mongoose.Types.ObjectId.isValid(professorId)) {
      return res.status(400).json({ error: "Invalid professor ID" });
    }

    // Theses supervised by professor (status: review or active)
    const totalThesesSupervising = await Assignment.countDocuments({
      "professors.supervisor.id": professorId,
      status: { $in: ["review", "active"] },
    });

    // Theses where professor is memberA or memberB (status: review or active)
    const totalThesesMember = await Assignment.countDocuments({
      $or: [
        { "professors.memberA.id": professorId },
        { "professors.memberB.id": professorId },
      ],
      status: { $in: ["review", "active"] },
    });

    // Pending invitations
    const totalPendingInvitations = await Invitation.countDocuments({
      "professor.id": professorId,
      status: "pending",
    });

    // Topics created by professor
    const totalAvailableTopics = await Topic.countDocuments({
      createdBy: professorId,
    });

    const stats = {
      totalThesesSupervising,
      totalTheses: totalThesesMember,
      totalPendingInvitations,
      totalAvailableTopics,
    };

    return res.json(stats);
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    return res.status(500).json({ error: "Failed to load dashboard stats" });
  }
});

module.exports = router;
