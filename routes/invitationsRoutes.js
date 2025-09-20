const express = require("express");
const mongoose = require("mongoose");

// Set up router
const router = express.Router();

// Import models
const Assignment = require("../models/Assignment");
const Invitation = require("../models/Invitation");


// 1. Endpoint to filter invitations by status
router.post("/filters", async (req, res) => {
  try {
    const connectedUserId = req.user?.id;

    const { status = {} } = req.body;

    const professorIdQuery = mongoose.Types.ObjectId.isValid(connectedUserId)
      ? new mongoose.Types.ObjectId(connectedUserId)
      : connectedUserId;

    // Build filters
    const statusKeys = Object.keys(status).filter((key) => status[key]);

    let pendingInvitations = [];
    let completedInvitations = [];

    if (statusKeys.length > 0) {
      // User selected specific statuses
      if (statusKeys.includes("pending")) {
        pendingInvitations = await Invitation.find({
          "professor.id": professorIdQuery,
          status: "pending",
        })
          .sort({ createdAt: -1 })
          .lean();
      }
      const completedStatuses = statusKeys.filter((s) =>
        ["accepted", "rejected"].includes(s)
      );
      if (completedStatuses.length > 0) {
        completedInvitations = await Invitation.find({
          "professor.id": professorIdQuery,
          status: { $in: completedStatuses },
        })
          .sort({ createdAt: -1 })
          .lean();
      }
    } else {
      // No filter → return both like /invitations
      [pendingInvitations, completedInvitations] = await Promise.all([
        Invitation.find({
          "professor.id": professorIdQuery,
          status: "pending",
        })
          .sort({ createdAt: -1 })
          .lean(),
        Invitation.find({
          "professor.id": professorIdQuery,
          status: { $in: ["accepted", "rejected"] },
        })
          .sort({ createdAt: -1 })
          .lean(),
      ]);
    }

    // Attach assignment details
    const enrichWithAssignment = async (inv) => {
      const assignmentId = mongoose.Types.ObjectId.isValid(inv.thesisId)
        ? new mongoose.Types.ObjectId(inv.thesisId)
        : inv.thesisId;

      const assignment = await Assignment.findById(assignmentId)
        .select(
          "title description filePath student.fullName student.idNumber professors.supervisor.fullName"
        )
        .lean();

      return {
        ...inv,
        thesis: assignment
          ? {
              title: assignment.title,
              description: assignment.description,
              filePath: assignment.filePath,
              studentFullName: assignment.student?.fullName || "",
              studentIdNumber: assignment.student?.idNumber || "",
              supervisorFullName:
                assignment.professors?.supervisor?.fullName || "",
            }
          : null,
      };
    };

    const [pendingList, completedList] = await Promise.all([
      Promise.all(pendingInvitations.map(enrichWithAssignment)),
      Promise.all(completedInvitations.map(enrichWithAssignment)),
    ]);

    return res.json({ success: true, pendingList, completedList });
  } catch (err) {
    console.error("Error filtering invitations:", err);
    res.status(500).json({ error: "Error filtering invitations" });
  }
});


// 2. Endpoint to reply to an invitation
router.post("/reply/:id", async (req, res) => {
  try {
    const invitationId = req.params.id;

    if (!invitationId || !mongoose.Types.ObjectId.isValid(invitationId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing invitation ID." });
    }

    const { status } = req.body; // "accepted" or "rejected"

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    // Find invitation
    const invitation = await Invitation.findById(invitationId).lean();
    if (!invitation) {
      return res
        .status(404)
        .json({ success: false, error: "Invitation not found" });
    }

    // Check if the connected user is the invited professor
    const connectedUserId = req.user?.id;
    if (invitation.professor.id.toString() !== connectedUserId) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Not authorized to respond to this invitation",
        });
    }

    if (invitation.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, error: "Invitation already responded to" });
    }

    // Update invitation status
    await Invitation.findByIdAndUpdate(invitationId, { status });

    if (status === "accepted") {
      const assignmentId = new mongoose.Types.ObjectId(invitation.thesisId);
      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) {
        return res
          .status(404)
          .json({ success: false, error: "Assignment not found" });
      }

      const professorData = {
        id: invitation.professor.id,
        fullName: invitation.professor.fullName,
        assignmentRole: null,
      };

      let updatedFields = {};
      if (!assignment.professors.memberA?.id) {
        professorData.assignmentRole = "memberA";
        updatedFields["professors.memberA"] = professorData;
      } else if (!assignment.professors.memberB?.id) {
        professorData.assignmentRole = "memberB";
        updatedFields["professors.memberB"] = professorData;
      }

      if (Object.keys(updatedFields).length > 0) {
        await Assignment.findByIdAndUpdate(assignmentId, {
          $set: updatedFields,
        });
      }

      const updatedAssignment = await Assignment.findById(assignmentId);

      if (
        updatedAssignment.professors.memberA?.id &&
        updatedAssignment.professors.memberB?.id
      ) {
        await Invitation.deleteMany({
          thesisId: invitation.thesisId,
          status: "pending",
        });
        updatedAssignment.status = "active";
        updatedAssignment.pendingChanges = true;
        await updatedAssignment.save();
      }
    }

    // Reload invitation with assignment details
    const savedInvitation = await Invitation.findById(invitationId).lean();
    let assignmentData = null;

    if (savedInvitation) {
      const assignment = await Assignment.findById(savedInvitation.thesisId)
        .select(
          "title description filePath student.fullName student.idNumber professors.supervisor.fullName"
        )
        .lean();

      if (assignment) {
        assignmentData = {
          title: assignment.title,
          description: assignment.description,
          filePath: assignment.filePath,
          studentFullName: assignment.student?.fullName || "",
          studentIdNumber: assignment.student?.idNumber || "",
          supervisorFullName: assignment.professors?.supervisor?.fullName || "",
        };
      }
    }

    return res.json({
      success: true,
      invitation: {
        ...savedInvitation,
        thesis: assignmentData,
      },
    });
  } catch (err) {
    console.error("Error replying to invitation:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to reply to invitation" });
  }
});

module.exports = router;
