const express = require("express");
const mongoose = require("mongoose");
const { Parser } = require("json2csv");

// Router Setup
const router = express.Router();

// Models
const Assignment = require("../models/Assignment");

// Utility functions
const { normalizeGreek, formatDate } = require("../utils-backend/utils-server");

// 1. Endpoint to get assignments based on filters
router.post("/filters", async (req, res) => {
  try {
    const filters = req.body;
    const professorId = req.user.id;
    const role = req.user.role;

    const query = {};

    // Build professor role condition
    let professorConditions = [];
    if (req.user.role === "professor") {
      console.log("Filtering for professor ID:", req.user.id);

      professorConditions = [
        {
          "professors.supervisor.id": new mongoose.Types.ObjectId(req.user.id),
        },
        { "professors.memberA.id": new mongoose.Types.ObjectId(req.user.id) },
        { "professors.memberB.id": new mongoose.Types.ObjectId(req.user.id) },
      ];
    }

    // Build search conditions
    let searchConditions = [];
    if (filters.search && filters.search.trim().length > 0) {
      const normSearchTerm = normalizeGreek(
        filters.search.trim()
      ).toLowerCase();
      console.log("Search term:", normSearchTerm);

      searchConditions = [
        { searchTitle: { $regex: normSearchTerm, $options: "i" } },
        { searchDescription: { $regex: normSearchTerm, $options: "i" } },
        { searchStudentIdNumber: { $regex: normSearchTerm, $options: "i" } },
        { searchStudentFullName: { $regex: normSearchTerm, $options: "i" } },
      ];
    }

    // Combine into query
    if (professorConditions.length && searchConditions.length) {
      // Require BOTH professor involvement AND search match
      query.$and = [{ $or: professorConditions }, { $or: searchConditions }];
    } else if (professorConditions.length) {
      query.$or = professorConditions;
    } else if (searchConditions.length) {
      query.$or = searchConditions;
    }

    if (filters.status && Object.keys(filters.status).length > 0) {
      if (req.user.role === "secretary") {
        // Secretaries can see only review and active theses
        const allowedStatuses = ["review", "active"];
        Object.keys(filters.status).forEach((statusKey) => {
          if (!allowedStatuses.includes(statusKey)) {
            delete filters.status[statusKey];
          }
        });
      }
      query.status = { $in: Object.keys(filters.status) };
    } else {
      // If no status filter is applied, restrict based on role
      if (req.user.role === "secretary") {
        query.status = { $in: ["active", "review"] };
      }
    }

    if (filters.year) {
      const yearRange = filters.year.range || {};
      const yearKeys = Object.keys(filters.year).filter((k) => k !== "range");
      const yearValues = yearKeys.map((k) => Number(k.replace(/^year-/, "")));

      if (yearValues.length > 0) {
        // Exact years
        query.officialAssignmentDate = {
          $gte: new Date(Math.min(...yearValues), 0, 1),
          $lte: new Date(Math.max(...yearValues), 11, 31),
        };
      } else if (yearRange.from || yearRange.to) {
        // Range filtering
        const dateFilter = {};

        if (yearRange.from) {
          dateFilter.$gte = new Date(Number(yearRange.from), 0, 1);
        }
        if (yearRange.to) {
          dateFilter.$lte = new Date(Number(yearRange.to), 11, 31);
        }

        query.officialAssignmentDate = dateFilter;
      }
    }

    if (
      filters.professorRole &&
      Object.keys(filters.professorRole).length > 0
    ) {
      const roleKeys = Object.keys(filters.professorRole);

      console.log("Filtering by professor role:", roleKeys);

      const roleConditions = [];

      if (roleKeys.includes("supervisor")) {
        roleConditions.push({
          "professors.supervisor.id": new mongoose.Types.ObjectId(professorId),
        });
      }
      if (roleKeys.includes("member")) {
        roleConditions.push({
          "professors.memberA.id": new mongoose.Types.ObjectId(professorId),
        });
        roleConditions.push({
          "professors.memberB.id": new mongoose.Types.ObjectId(professorId),
        });
      }

      if (roleConditions.length) {
        if (query.$or) {
          query.$and = (query.$and || []).concat([
            { $or: query.$or },
            { $or: roleConditions },
          ]);
          delete query.$or; // move everything into $and
        } else {
          // no $or yet, just assign
          query.$or = roleConditions;
        }
      }
    }

    const sortOptions = {};
    if (filters.sortBy) {
      if (filters.sortBy === "title") {
        sortOptions.title = 1; // Asc
      } else if (filters.sortBy === "date") {
        sortOptions.officialAssignmentDate = -1; // Desc
      }
    }

    if (req.user.role === "secretary" && filters.pendingChanges) {
      query.pendingChanges = filters.pendingChanges;
    }

    const theses = await Assignment.find(query).sort(sortOptions).lean();

    const mappedTheses = theses.map((thesis) => {
      let professorRole = null;
      let responseChanges = null;
      if (role === "professor") {
        if (thesis.professors?.supervisor?.id.toString() === professorId) {
          professorRole = "supervisor";
        } else if (thesis.professors?.memberA?.id.toString() === professorId) {
          professorRole = "memberA";
        } else if (thesis.professors?.memberB?.id.toString() === professorId) {
          professorRole = "memberB";
        }
      }
      if (role === "secretary") {
        responseChanges = thesis.pendingChanges;
      }

      return {
        _id: thesis._id,
        title: thesis.title,
        status: thesis.status,
        professorRole,
        pendingChanges: responseChanges,
      };
    });

    return res.json({ success: true, theses: mappedTheses });
  } catch (err) {
    console.error("Filtering error:", err);
    res.status(500).json({ success: false, error: "Failed to filter theses" });
  }
});

// 2. Endpoint to export selected theses as JSON
router.post("/export-json", async (req, res) => {
  try {
    const ids = req.body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No thesis IDs provided." });
    }

    //! Need to check if user can export these IDs
    // Normalize IDs as ObjectId
    const idSet = ids.map((id) => new mongoose.Types.ObjectId(id));

    // Fetch assignments from MongoDB
    const theses = await Assignment.find({ _id: { $in: idSet } }).select({
      _id: 0,
      title: 1,
      description: 1,
      temporaryAssignmentDate: 1,
      officialAssignmentDate: 1,
      underReviewDate: 1,
      presentationDate: 1,
      completedDate: 1,
      cancelledDate: 1,
      "student.fullName": 1,
      "professors.supervisor.fullName": 1,
      "professors.memberA.fullName": 1,
      "professors.memberB.fullName": 1,
      protocolNumberAssignment: 1,
      protocolNumberCancelled: 1,
      reasonForCancellation: 1,
      temporaryLinks: 1,
      nemertesLink: 1,
      finalGrade: 1,
    });

    return res.json({ success: true, theses });
  } catch (err) {
    console.error("Error exporting theses:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to export theses." });
  }
});

// 3. Endpoint to export selected theses as CSV
router.post("/export-csv", async (req, res) => {
  try {
    const ids = req.body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No thesis IDs provided." });
    }

    //! Need to check if user can export these IDs
    // Normalize IDs as ObjectId
    const idSet = ids.map((id) => new mongoose.Types.ObjectId(id));

    const theses = await Assignment.find({ _id: { $in: idSet } }).select({
      _id: 0,
      title: 1,
      description: 1,
      temporaryAssignmentDate: 1,
      officialAssignmentDate: 1,
      underReviewDate: 1,
      presentationDate: 1,
      completedDate: 1,
      cancelledDate: 1,
      "student.fullName": 1,
      "professors.supervisor.fullName": 1,
      "professors.memberA.fullName": 1,
      "professors.memberB.fullName": 1,
      protocolNumberAssignment: 1,
      protocolNumberCancelled: 1,
      reasonForCancellation: 1,
      temporaryLinks: 1,
      nemertesLink: 1,
      finalGrade: 1,
    });

    const data = theses.map((t) => ({
      title: t.title,
      description: t.description,
      temporaryAssignmentDate: formatDate(t.temporaryAssignmentDate),
      officialAssignmentDate: formatDate(t.officialAssignmentDate),
      underReviewDate: formatDate(t.underReviewDate),
      presentationDate: formatDate(t.presentationDate),
      completedDate: formatDate(t.completedDate),
      cancelledDate: formatDate(t.cancelledDate),
      studentFullName: t.student?.fullName || "",
      supervisorFullName: t.professors?.supervisor?.fullName || "",
      memberAFullName: t.professors?.memberA?.fullName || "",
      memberBFullName: t.professors?.memberB?.fullName || "",
      protocolNumberAssignment: t.protocolNumberAssignment,
      protocolNumberCancelled: t.protocolNumberCancelled,
      reasonForCancellation: t.reasonForCancellation,
      temporaryLinks: (t.temporaryLinks || []).join("; "),
      nemertesLink: t.nemertesLink,
      finalGrade: t.finalGrade,
    }));

    // Define Greek headers
    const fields = [
      { label: "Τίτλος", value: "title" },
      { label: "Περιγραφή", value: "description" },
      { label: "Ημερ. Προσωρινής Ανάθεσης", value: "temporaryAssignmentDate" },
      { label: "Ημερ. Επίσημης Ανάθεσης", value: "officialAssignmentDate" },
      { label: "Ημερ. Σε Εξέταση", value: "underReviewDate" },
      { label: "Ημερ. Παρουσίασης", value: "presentationDate" },
      { label: "Ημερ. Ολοκλήρωσης", value: "completedDate" },
      { label: "Ημερ. Ακύρωσης", value: "cancelledDate" },
      { label: "Φοιτητής", value: "studentFullName" },
      { label: "Επιβλέπων Καθηγητής", value: "supervisorFullName" },
      { label: "Μέλος Α", value: "memberAFullName" },
      { label: "Μέλος Β", value: "memberBFullName" },
      {
        label: "Αριθμός Πρωτοκόλλου Ανάθεσης",
        value: "protocolNumberAssignment",
      },
      {
        label: "Αριθμός Πρωτοκόλλου Ακύρωσης",
        value: "protocolNumberCancelled",
      },
      { label: "Λόγος Ακύρωσης", value: "reasonForCancellation" },
      { label: "Προσωρινά Links", value: "temporaryLinks" },
      { label: "Σύνδεσμος Nemertes", value: "nemertesLink" },
      { label: "Τελικός Βαθμός", value: "finalGrade" },
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment("theses.csv");
    return res.send(csv);
  } catch (err) {
    console.error("Error exporting theses CSV:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to export theses CSV." });
  }
});

module.exports = router;
