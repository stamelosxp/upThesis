const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Set up router
const router = express.Router();

// Import Models
const Assignment = require("../models/Assignment"); // Your Assignment model
const Topic = require("../models/Topic"); // Your Topic model
const User = require("../models/User"); // Your User model
const Invitation = require("../models/Invitation"); // Your Invitation model
const Note = require("../models/Note"); // Your Note model
const Announcement = require("../models/Announcement"); // Your Announcement model
const Evaluation = require("../models/Evaluation"); // Your Evaluation model
const Statistics = require("../models/Statistics"); // Your Statistics model

// Utility functions
const {
  normalizeGreek,
  fsUnlinkSafe,
} = require("../utils-backend/utils-server");

const { tmpReportUpload } = require("../config/multer");

// 1.Query to calculate professor stats after assignment completion
async function getProfessorStats(professorId) {
  const [result] = await Assignment.aggregate([
    {
      $match: {
        status: "completed",
        $or: [
          { "professors.supervisor.id": professorId },
          { "professors.memberA.id": professorId },
          { "professors.memberB.id": professorId },
        ],
      },
    },
    {
      $addFields: {
        // Determine if the professor is supervisor or member
        isSupervisor: { $eq: ["$professors.supervisor.id", professorId] },
        isMember: {
          $or: [
            { $eq: ["$professors.memberA.id", professorId] },
            { $eq: ["$professors.memberB.id", professorId] },
          ],
        },
        // Calculate duration in days between officialAssignmentDate and completedDate
        durationDays: {
          //cond operator to handle null dates
          $cond: [
            { $and: ["$officialAssignmentDate", "$completedDate"] },
            {
              // dateDiff operator to calculate difference in days
              $dateDiff: {
                startDate: "$officialAssignmentDate",
                endDate: "$completedDate",
                unit: "day",
              },
            },
            null,
          ],
        },
      },
    },
    {
      // Separate pipelines for supervisor and member roles
      $facet: {
        supervisor: [
          { $match: { isSupervisor: true } },
          {
            $group: {
              _id: null,
              durationAverage: { $avg: "$durationDays" },
              numberAssignments: { $sum: 1 },
              averageGrade: { $avg: "$finalGrade" },
            },
          },
        ],
        member: [
          { $match: { isMember: true } },
          {
            // group operator to calculate averages and counts
            $group: {
              _id: null,
              // calculate average duration in days
              durationAverage: { $avg: "$durationDays" },
              // count number of assignments
              numberAssignments: { $sum: 1 },
              // calculate average final grade
              averageGrade: { $avg: "$finalGrade" },
            },
          },
        ],
      },
    },
    {
      // project to format the output
      $project: {
        durationAverage: {
          supervisor: {
            $ifNull: [{ $arrayElemAt: ["$supervisor.durationAverage", 0] }, 0],
          },
          member: {
            $ifNull: [{ $arrayElemAt: ["$member.durationAverage", 0] }, 0],
          },
        },
        numberAssignments: {
          supervisor: {
            $ifNull: [
              { $arrayElemAt: ["$supervisor.numberAssignments", 0] },
              0,
            ],
          },
          member: {
            $ifNull: [{ $arrayElemAt: ["$member.numberAssignments", 0] }, 0],
          },
        },
        averageGrade: {
          supervisor: {
            $ifNull: [{ $arrayElemAt: ["$supervisor.averageGrade", 0] }, 0],
          },
          member: {
            $ifNull: [{ $arrayElemAt: ["$member.averageGrade", 0] }, 0],
          },
        },
      },
    },
  ]).exec();

  await Statistics.findOneAndUpdate(
    { professorId },
    {
      $set: {
        durationAverage: result.durationAverage,
        numberAssignments: result.numberAssignments,
        averageGrade: result.averageGrade,
      },
    },
    { upsert: true, new: true }
  );
}

// 2. Endpoint to cancel a temporary assignment and revert to topic
router.delete("/cancel-temporary/:id", async (req, res) => {
  try {
    const assignmentId = req.params.id;

    if (!assignmentId || !mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing assignment ID." });
    }

    // Find the assignment in DB
    const assignment = await Assignment.findById(assignmentId).lean();
    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, error: "Thesis not found." });
    }

    if (assignment.professors?.supervisor?.id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to cancel this thesis.",
      });
    }

    // Create a new Topic from the cancelled assignment
    const newTopic = new Topic({
      title: assignment.title,
      description: assignment.description,
      filePath: assignment.filePath,
      createdBy: assignment.professors.supervisor.id,
    });

    await newTopic.save();

    // Update student: remove thesis
    if (assignment.student?.idNumber) {
      await User.updateOne(
        { studentId: assignment.student.idNumber, role: "student" },
        { $set: { hasThesis: false, thesisId: null } }
      );
    }

    // Remove related invitations
    await Invitation.deleteMany({ thesisId: assignmentId });

    // Remove related notes
    await Note.deleteMany({ thesisId: assignmentId });

    // Delete the assignment itself
    await Assignment.findByIdAndDelete(assignmentId);
    return res.json({
      success: true,
      message: `Η προσωρινή ανάθεσή "${newTopic.title}" ακυρώθηκε επιτυχώς.`,
    });
  } catch (err) {
    console.error("Error cancelling temporary thesis:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to cancel temporary thesis." });
  }
});

// 3. Endpoint to send invitations to professors for a thesis
router.post("/invitation/send/:id", async (req, res) => {
  try {
    const assignmentId = req.params.id;

    if (!assignmentId || !mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing assignment ID." });
    }

    const { professorIds } = req.body; // Expecting { professorIds: ["id1","id2",...] }

    if (!assignmentId) {
      return res
        .status(400)
        .json({ success: false, error: "No thesis ID provided." });
    }
    if (
      !professorIds ||
      !Array.isArray(professorIds) ||
      professorIds.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, error: "No professor IDs provided." });
    }

    // Make sure thesis exists
    const thesis = await Assignment.findById(assignmentId);
    if (!thesis) {
      return res
        .status(404)
        .json({ success: false, error: "Thesis not found." });
    }

    const newInvitations = [];

    for (let professorId of professorIds) {
      // Validate professorId
      if (!mongoose.Types.ObjectId.isValid(professorId)) {
        console.warn(`Invalid professor ID format: ${professorId}`);
        continue;
      }

      // Ensure professor exists in DB
      const professor = await User.findOne({
        _id: professorId,
        role: "professor",
      });
      if (!professor) {
        console.warn(`Professor not found: ${professorId}`);
        continue;
      }

      // Check if invitation already exists (compare string values!)
      const existingInvitation = await Invitation.findOne({
        thesisId: assignmentId,
        "professor.id": professorId,
      });

      if (existingInvitation) {
        console.warn(`Invitation already exists for professor: ${professorId}`);
        continue;
      }

      // Create new invitation (store IDs as strings)
      const newInvitation = new Invitation({
        thesisId: assignmentId,
        professor: {
          id: professor._id,
          fullName: `${professor.lastName} ${professor.firstName}`,
        },
        status: "pending",
      });

      await newInvitation.save();
      newInvitations.push(newInvitation);
    }

    return res.json({
      success: true,
      sent: newInvitations.map((inv) => inv.professor.fullName),
    });
  } catch (err) {
    console.error("Error sending invitations:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to send invitations." });
  }
});

// 4. Endpoint to get available professors for invitation (excluding already invited and supervisor)
router.get("/invitation/available/professors/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;
    if (!thesisId) {
      return res
        .status(400)
        .json({ success: false, error: "No thesis ID provided." });
    }

    const query = req.query.q?.toLowerCase() || "";
    const searchValue = normalizeGreek(query.trim());

    // Validate thesisId
    if (!mongoose.Types.ObjectId.isValid(thesisId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid thesis ID format." });
    }

    // Get all invitations for this thesis (store thesisId as string!)
    const invitations = await Invitation.find({
      thesisId: thesisId,
    }).lean();
    const invitedProfessorIds = new Set(
      invitations.map((inv) => inv.professor.id)
    );

    // Get supervisor for this thesis
    const thesis = await Assignment.findById(thesisId).lean();
    if (!thesis) {
      return res
        .status(404)
        .json({ success: false, error: "Thesis not found." });
    }
    if (thesis.professors?.supervisor?.id) {
      invitedProfessorIds.add(thesis.professors.supervisor.id);
    }

    // Fetch professors excluding invited ones
    let availableProfessors = await User.find({
      role: "professor",
      _id: {
        $nin: [...invitedProfessorIds]
          .map((id) =>
            mongoose.Types.ObjectId.isValid(id)
              ? new mongoose.Types.ObjectId(id)
              : null
          )
          .filter(Boolean),
      },
    }).lean();

    // Apply search filtering
    if (searchValue.length > 0) {
      availableProfessors = availableProfessors.filter(
        (u) =>
          `${normalizeGreek(u.firstName)} ${normalizeGreek(u.lastName)}`
            .toLowerCase()
            .includes(searchValue) ||
          (u.email && u.email.toLowerCase().includes(searchValue))
      );
    }

    const responseProfessors = availableProfessors.map((u) => ({
      userId: u._id.toString(),
      fullName: `${u.lastName} ${u.firstName}`,
    }));

    return res.json({ success: true, professors: responseProfessors });
  } catch (err) {
    console.error("Error searching users:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to search users." });
  }
});

// 5. Endpoint to get all invitations for a thesis, separated by status
router.get("/invitations/get/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;
    if (!thesisId) {
      return res
        .status(400)
        .json({ success: false, error: "No thesis ID provided." });
    }

    // Make sure thesisId is string since you store it like that in invitations
    const invitations = await Invitation.find({
      thesisId: thesisId,
    }).lean();

    if (!invitations.length) {
      return res.json({ success: true, pending: [], completed: [] });
    }

    // Separate pending vs completed
    const pending = invitations
      .filter((inv) => inv.status === "pending")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const completed = invitations
      .filter((inv) => inv.status !== "pending")
      .sort((a, b) =>
        (a.professor.fullName || "").localeCompare(
          b.professor.fullName || "",
          "el",
          { sensitivity: "base" }
        )
      );
    return res.json({ success: true, pending, completed });
  } catch (e) {
    console.error("Error loading thesis invitations", e);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load invitations" });
  }
});

// 6. Endpoint to mark assignment as "active" (by secretary)
router.put("/assign/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;
    const { protocolNumber } = req.body;

    if (!thesisId) {
      return res
        .status(400)
        .json({ success: false, error: "No thesis ID provided." });
    }

    // Check authorization: only secretary can assign
    if (req.user.role !== "secretary") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to change assignment status.",
      });
    }

    // Convert string to ObjectId for Mongo query
    const assignment = await Assignment.findById(
      new mongoose.Types.ObjectId(thesisId)
    );
    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, error: "Assignment not found." });
    }

    // Update the protocol number and status
    assignment.officialAssignmentDate = new Date();
    assignment.protocolNumberAssignment = protocolNumber;
    assignment.status = "active"; // set status to active
    assignment.pendingChanges = false; // optional: mark pending changes as false
    await assignment.save();

    return res.json({
      success: true,
      message: "Assignment successfully updated.",
    });
  } catch (err) {
    console.error("Error setting assignment status to active:", err);
    res.status(500).json({
      success: false,
      error: "Failed to set assignment status to active.",
    });
  }
});

// 7. Endpoint to mark assignment as "under review" (by supervisor)
router.put("/review/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;

    if (!thesisId || !mongoose.Types.ObjectId.isValid(thesisId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing assignment ID." });
    }

    // Convert string to ObjectId for Mongo query
    const assignment = await Assignment.findById(
      new mongoose.Types.ObjectId(thesisId)
    );
    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, error: "Assignment not found." });
    }

    //only supervisor can set to review
    if (assignment.professors?.supervisor?.id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to change assignment status.",
      });
    }

    // Update the status to "review" and set the underReviewDate
    assignment.status = "review";
    assignment.underReviewDate = new Date();
    await assignment.save();

    return res.json({
      success: true,
      message: "Η ανάθεση τέθηκε σε κατάσταση Υπό-Αξιολόγησης.",
    });
  } catch (error) {
    console.error("Error setting assignment status to review:", error);
    res.status(500).json({
      success: false,
      error: "Failed to set assignment status to review.",
    });
  }
});

// 8. Endpoint to mark assignment as "completed" (by secretary)
router.put("/complete/:id", async (req, res) => {
  try {
    const assignmentId = req.params.id;

    if (!assignmentId || !mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing assignment ID." });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, error: "Assignment not found." });
    }

    // only secretary can set to complete
    if (req.user.role !== "secretary") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to change assignment status.",
      });
    }

    // Update the status to "completed" and set the completedDate
    assignment.status = "completed";
    assignment.completedDate = new Date();

    //delete description file if exists
    if (assignment.filePath) {
      const filePath = path.join(__dirname, "..", assignment.filePath);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting assignment file:", err);
          return;
        }
      });
      assignment.filePath = null;
    }

    await assignment.save();

    //delete all notes
    await Note.deleteMany({ thesisId: assignmentId });

    await Promise.all(
      Object.values(assignment.professors)
        .filter((p) => p?.id)
        .map((p) => getProfessorStats(p.id))
    );

    return res.json({
      success: true,
      message: "Η ανάθεση τέθηκε σε κατάσταση Ολοκληρωμένη.",
    });
  } catch (err) {
    console.error("Error setting assignment status to complete:", err);
    res.status(500).json({
      success: false,
      error: "Failed to set assignment status to complete.",
    });
  }
});

// 9. Endpoint to cancel an assignment (by secretary or professor)
router.put("/cancel/:id", async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const { protocolNumber, protocolDetails } = req.body;

    if (!assignmentId || !mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing assignment ID." });
    }

    if (req.user.role !== "secretary" && req.user.role !== "professor") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to cancel assignment.",
      });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, error: "Assignment not found." });
    }

    // If professor, ensure they are the supervisor
    if (
      req.user.role === "professor" &&
      assignment.professors?.supervisor?.id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to cancel this assignment. 2nd",
      });
    }

    // Professor can cancel after 2 years from official assignment date
    if (assignment.officialAssignmentDate && req.user.role === "professor") {
      const twoYearsLater = new Date(assignment.officialAssignmentDate);
      twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
      const now = new Date();
      if (now < twoYearsLater) {
        return res.status(403).json({
          success: false,
          error:
            "Not authorized to cancel assignment before 2 years from official assignment date.",
        });
      }
    }

    // Update assignment status to "cancelled"
    assignment.status = "cancelled";
    assignment.cancelledDate = new Date();
    assignment.protocolNumberCancelled = protocolNumber;
    assignment.reasonForCancellation = protocolDetails || null;

    //Remove file if exists
    if (assignment.filePath) {
      const filePath = path.join(__dirname, "..", assignment.filePath);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting assignment file:", err);
          return;
        }
      });
      assignment.filePath = null;
    }

    await assignment.save();

    // Update student: remove thesis
    if (assignment.student?.idNumber) {
      await User.updateOne(
        { studentId: assignment.student.idNumber, role: "student" },
        { $set: { hasThesis: false } }
      );
    }

    // Delete all notes
    await Note.deleteMany({ thesisId: assignmentId });

    return res.json({
      success: true,
      message: "Η ανάθεση ακυρώθηκε επιτυχώς.",
    });
  } catch (error) {
    console.error("Error cancelling assignment:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to cancel assignment." });
  }
});

// 10. Endpoint for student to upload temporary thesis report file and/or links
router.put(
  "/student/upload-temp/:id",
  tmpReportUpload.single("file"),
  async (req, res) => {
    let updatedFilePath = null;
    try {
      const thesisId = req.params.id;
      if (req.file) {
        updatedFilePath = "/uploads/temp_thesis_files/" + req.file.filename;
      }

      if (!thesisId || !mongoose.Types.ObjectId.isValid(thesisId)) {
        await fsUnlinkSafe(updatedFilePath);
        return res
          .status(400)
          .json({ success: false, error: "Invalid or missing thesis ID." });
      }

      // Find assignment by ID
      const assignment = await Assignment.findById(thesisId);
      if (!assignment) {
        await fsUnlinkSafe(updatedFilePath);
        return res
          .status(404)
          .json({ success: false, error: "Assignment not found." });
      }

      let getStudentNumber = null;
      if (req.user.role !== "student") {
        await fsUnlinkSafe(updatedFilePath);
        return res.status(403).json({
          success: false,
          error: "Not authorized to upload temporary thesis file.",
        });
      } else {
        // If connected user is student, get their studentId from DB
        const connectedUserId = new mongoose.Types.ObjectId(req.user.id);
        const student = await User.findById(connectedUserId).lean();
        getStudentNumber = student.studentId;
      }

      // Check student authorization
      if (assignment.student.idNumber !== getStudentNumber) {
        await fsUnlinkSafe(updatedFilePath);
        return res.status(403).json({
          success: false,
          error: "Not authorized to upload temporary thesis file.",
        });
      }

      let responseFilePath = assignment.temporaryReportFile || null;
      let responseLinks = assignment.temporaryLinks || [];

      // Direct upload file
      if (req.file) {
        assignment.temporaryReportFile =
          "/uploads/temp_thesis_files/" + req.file.filename;
        responseFilePath = assignment.temporaryReportFile;
      }

      // Handle links from request body
      const links = req.body.links ? JSON.parse(req.body.links) : [];
      if (Array.isArray(links) && links.length > 0) {
        assignment.temporaryLinks = links;
        responseLinks = assignment.temporaryLinks;
      }

      await assignment.save();
      let existsBoth = false;
      if (
        assignment.temporaryReportFile &&
        assignment.temporaryLinks.length > 0
      ) {
        existsBoth = true;
      }

      return res.json({
        success: true,
        filePath: req.file ? responseFilePath : null,
        links: req.body.links ? responseLinks : null,
        existsBoth,
      });
    } catch (err) {
      console.error("Error uploading temporary thesis file:", err);
      await fsUnlinkSafe(updatedFilePath);
      res.status(500).json({
        success: false,
        error: "Failed to upload temporary thesis file.",
      });
    }
  }
);

// 11. Endpoint to get presentation announcement for a thesis
router.get("/announcement/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;

    if (!thesisId || !mongoose.Types.ObjectId.isValid(thesisId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid thesis ID" });
    }

    const announcement = await Announcement.findOne({
      thesisId: thesisId,
    }).lean();

    if (!announcement) {
      return res.json({
        success: true,
        exists: false,
        announcement: null,
      });
    }

    const responseAnnouncement = {
      dateTime: announcement.presentationDateTime,
      content: announcement.description,
      place1: announcement.place1,
      place2: announcement.place2,
    };

    return res.json({
      success: true,
      exists: true,
      announcement: responseAnnouncement,
    });
  } catch (e) {
    console.error("Error fetching announcement:", e);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load announcement" });
  }
});

// 12. Endpoint to create a presentation announcement (by supervisor or student)
router.post("/announcement/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;
    const { dateTime, content, place1, place2 } = req.body;

    if (!thesisId || !mongoose.Types.ObjectId.isValid(thesisId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing thesis ID.",
      });
    }

    // Find assignment
    const assignment = await Assignment.findById(thesisId).lean();
    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, error: "Assignment not found." });
    }
    // Only supervisor or student can create announcement
    if (req.user.role !== "professor" && req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to create announcement.",
      });
    } else if (req.user.role === "professor") {
      if (assignment.professors?.supervisor?.id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to create announcement.",
        });
      }
    } else if (req.user.role === "student") {
      let getStudentNumber = null;
      // If connected user is student, get their studentId from DB
      const connectedUserId = new mongoose.Types.ObjectId(req.user.id);
      const student = await User.findById(connectedUserId).lean();
      getStudentNumber = student.studentId;

      // Check student authorization
      if (assignment.student.idNumber !== getStudentNumber) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to upload temporary thesis file.",
        });
      }
    }

    // Create new announcement document
    const newAnnouncement = new Announcement({
      thesisId: thesisId,
      thesisTitle: assignment.title,
      presentationDateTime: new Date(dateTime),
      description: content,
      place1: place1 || null,
      place2: place2 || null,
      studentName: assignment.student?.fullName || "",
      supervisorName: assignment.professors?.supervisor?.fullName || "",
      members: [
        assignment.professors?.memberA?.fullName || "",
        assignment.professors?.memberB?.fullName || "",
      ].filter(Boolean), // remove empty strings
      hasModified: false,
    });

    await newAnnouncement.save();

    // Update assignment's presentation date
    await Assignment.findByIdAndUpdate(thesisId, {
      presentationDate: new Date(dateTime),
    });

    const responseAnnouncement = {
      dateTime: newAnnouncement.presentationDateTime,
      content: newAnnouncement.description,
      place1: newAnnouncement.place1,
      place2: newAnnouncement.place2,
    };

    return res.json({
      success: true,
      exists: true,
      announcement: responseAnnouncement,
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create announcement.",
    });
  }
});

// 13. Endpoint to update a presentation announcement (by supervisor or student)
router.put("/announcement/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;
    const { dateTime, content, place1, place2 } = req.body;

    if (!thesisId || !mongoose.Types.ObjectId.isValid(thesisId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing thesis ID.",
      });
    }

    // Find assignment
    const assignment = await Assignment.findById(thesisId).lean();
    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, error: "Assignment not found." });
    }
    // Only supervisor or student can update announcement
    if (req.user.role !== "professor" && req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update announcement.",
      });
    } else if (req.user.role === "professor") {
      if (assignment.professors?.supervisor?.id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to update announcement.",
        });
      }
    } else if (req.user.role === "student") {
      let getStudentNumber = null;
      // If connected user is student, get their studentId from DB
      const connectedUserId = new mongoose.Types.ObjectId(req.user.id);
      const student = await User.findById(connectedUserId).lean();
      getStudentNumber = student.studentId;

      // Check student authorization
      if (assignment.student.idNumber !== getStudentNumber) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to update announcement.",
        });
      }
    }

    // Find existing announcement
    const announcement = await Announcement.findOne({
      thesisId: thesisId,
    });
    if (!announcement) {
      return res
        .status(404)
        .json({ success: false, error: "Announcement not found." });
    }

    // Update announcement fields
    announcement.presentationDateTime = new Date(dateTime);
    announcement.description = content;
    announcement.place1 = place1 || null;
    announcement.place2 = place2 || null;
    announcement.hasModified = true;

    await announcement.save();

    // Update assignment's presentation date
    await Assignment.findByIdAndUpdate(thesisId, {
      presentationDate: new Date(dateTime),
    });

    const responseAnnouncement = {
      dateTime: announcement.presentationDateTime,
      content: announcement.description,
      place1: announcement.place1,
      place2: announcement.place2,
    };

    return res.json({
      success: true,
      exists: true,
      announcement: responseAnnouncement,
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update announcement.",
    });
  }
});

// 14. Endpoint to get evaluation grades for a thesis
router.get("/grades/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;

    if (!thesisId || !mongoose.Types.ObjectId.isValid(thesisId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid thesis ID" });
    }

    const evaluation = await Evaluation.findOne({
      thesisId: thesisId,
    }).lean();

    if (!evaluation) {
      return res.json({
        success: true,
        grades: {
          supervisor: {
            quality: null,
            duration: null,
            report: null,
            presentation: null,
          },
          memberA: {
            quality: null,
            duration: null,
            report: null,
            presentation: null,
          },
          memberB: {
            quality: null,
            duration: null,
            report: null,
            presentation: null,
          },
        },
      });
    }

    return res.json({
      success: true,
      grades: {
        supervisor: evaluation.supervisor,
        memberA: evaluation.memberA,
        memberB: evaluation.memberB,
      },
    });
  } catch (e) {
    console.error("Error fetching evaluation:", e);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load evaluation" });
  }
});

// 15. Endpoint to submit evaluation grades (by professors)
router.post("/grades/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;
    const { quality, duration, report, presentation } = req.body;

    if (!thesisId || !mongoose.Types.ObjectId.isValid(thesisId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid thesis ID." });
    }

    const assignment = await Assignment.findById(thesisId);
    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, error: "Thesis not found." });
    }

    let userRole = null;

    if (req.user.role === "professor") {
      // Determine professor's role
      if (assignment.professors?.supervisor?.id.toString() === req.user.id) {
        userRole = "supervisor";
      } else if (
        assignment.professors?.memberA?.id.toString() === req.user.id
      ) {
        userRole = "memberA";
      } else if (
        assignment.professors?.memberB?.id.toString() === req.user.id
      ) {
        userRole = "memberB";
      } else {
        return res.status(403).json({
          success: false,
          error: "Not authorized to submit evaluation for this thesis.",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        error: "Not authorized to submit evaluation.",
      });
    }

    async function getProfessorType(professorId) {
      try {
        if (!professorId) return "Unknown";

        // Ensure we have a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(professorId)) {
          return "Unknown";
        }

        const professor = await User.findById(professorId).lean();

        return professor?.typeOfProfessor;
      } catch (err) {
        console.error("Error fetching professor type:", err);
        return "Unknown";
      }
    }

    // Find or create evaluation entry
    let evaluation = await Evaluation.findOne({ thesisId });
    if (!evaluation) {
      evaluation = new Evaluation({
        thesisId: thesisId.toString(),
        thesisTitle: assignment.title,
        student: {
          fullName: assignment.student.fullName,
          idNumber: assignment.student.idNumber,
          gender: assignment.student.gender,
        },
        members: {
          supervisor: {
            fullName: assignment.professors.supervisor?.fullName,
            typeProfessor: await getProfessorType(
              assignment.professors.supervisor?.id
            ),
          },
          memberA: {
            fullName: assignment.professors.memberA?.fullName,
            typeProfessor: await getProfessorType(
              assignment.professors.memberA?.id
            ),
          },
          memberB: {
            fullName: assignment.professors.memberB?.fullName,
            typeProfessor: await getProfessorType(
              assignment.professors.memberB?.id
            ),
          },
        },
      });
    }

    // Update the specific role’s evaluation
    evaluation[userRole] = { quality, duration, report, presentation };

    await evaluation.save();

    assignment.gradesExists[userRole] = true;
    await assignment.save();

    return res.json({ success: true, evaluation });
  } catch (err) {
    console.error("Error saving evaluation:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to save evaluation." });
  }
});

// 16. Endpoint to submit evaluation grades (by professors)
router.put("/grades/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;
    const { quality, duration, report, presentation } = req.body;

    if (!thesisId || !mongoose.Types.ObjectId.isValid(thesisId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid thesis ID.",
      });
    }

    const assignment = await Assignment.findById(thesisId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: "Thesis not found.",
      });
    }

    let userRole = null;
    if (req.user.role === "professor") {
      if (assignment.professors?.supervisor?.id.toString() === req.user.id) {
        userRole = "supervisor";
      } else if (
        assignment.professors?.memberA?.id.toString() === req.user.id
      ) {
        userRole = "memberA";
      } else if (
        assignment.professors?.memberB?.id.toString() === req.user.id
      ) {
        userRole = "memberB";
      } else {
        return res.status(403).json({
          success: false,
          error: "Not authorized to update evaluation for this thesis.",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update evaluation.",
      });
    }

    // Find the evaluation entry (must exist for PUT)
    const evaluation = await Evaluation.findOne({ thesisId });
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: "Evaluation not found. Use POST to create a new one.",
      });
    }

    // Update only this professor’s evaluation
    evaluation[userRole] = { quality, duration, report, presentation };

    await evaluation.save();

    assignment.gradesExists[userRole] = true;
    await assignment.save();

    return res.json({ success: true, evaluation });
  } catch (err) {
    console.error("Error updating evaluation:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update evaluation.",
    });
  }
});

// 17. Endpoint to submit protocol details and suggested/final grade (by supervisor)
router.put("/protocol/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;
    const { dateTime, place, tmpGrade, finalGrade } = req.body;

    if (!thesisId || !mongoose.Types.ObjectId.isValid(thesisId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid thesis ID." });
    }

    // Find assignment
    const assignment = await Assignment.findById(thesisId);
    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, error: "Thesis not found." });
    }

    if (assignment.professors?.supervisor?.id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to submit protocol for this thesis.",
      });
    }

    // Find evaluation entry
    const evaluation = await Evaluation.findOne({
      thesisId: thesisId,
    });
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: "Evaluation entry not found for this thesis.",
      });
    }

    // Update evaluation protocol details
    evaluation.protocolDate = dateTime ? new Date(dateTime) : null;
    evaluation.protocolPlace = place || null;
    evaluation.suggestedGrade = tmpGrade;
    evaluation.finalGrade = finalGrade;
    await evaluation.save();

    // Update assignment flags
    assignment.protocolExists = true;
    assignment.finalGrade = finalGrade;
    await assignment.save();

    return res.json({ success: true });
  } catch (err) {
    console.error("Error saving protocol:", err);
    res.status(500).json({ success: false, error: "Failed to save protocol." });
  }
});

// 18. Endpoint to submit Nemertes ID (by student)
router.put("/nemertes/:id", async (req, res) => {
  try {
    const thesisId = req.params.id;
    const { link } = req.body;

    if (!thesisId || !mongoose.Types.ObjectId.isValid(thesisId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid thesis ID." });
    }

    if (!link || link.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No Nemertes ID provided." });
    }

    // Find thesis
    const assignment = await Assignment.findById(thesisId);
    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, error: "Thesis not found." });
    }

    if (
      req.user.role !== "student" &&
      assignment.student?.id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to submit Nemertes ID for this thesis.",
      });
    }

    // Update Nemertes link
    assignment.nemertesLink = link.trim();
    assignment.pendingChanges = true;

    await assignment.save();

    return res.json({ success: true });
  } catch (err) {
    console.error("Error saving Nemertes link:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to save to Nemertes." });
  }
});

module.exports = router;
