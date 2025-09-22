const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Models
const User = require("../models/User");
const Topic = require("../models/Topic");
const Assignment = require("../models/Assignment");
const Invitation = require("../models/Invitation");
const Evaluation = require("../models/Evaluation");
const Announcement = require("../models/Announcement");

// Utility functions
const { parseDateDDMMYYYY } = require("../utils-backend/utils-server");
const { formatProtocolDate } = require("../utils-backend/utils-protocol");
const { formatDate } = require("../public/scripts/utils");

const { requirePageRoles } = require("../middleware/auth");
const { error } = require("console");

const allRoles = ["professor", "student", "secretary"];
const notStudentRoles = ["professor", "secretary"];
const onlyStudentRoles = ["student"];
const onlyProfessorRoles = ["professor"];
const onlySecretaryRoles = ["secretary"];
const notSecretaryRoles = ["professor", "student"];

// 1. Login Page
router.get("/login", (req, res) => {
  if (res.locals.isAuth) {
    // User is already logged in, redirect to dashboard or home
    req.flash("success", "Έχετε ήδη συνδεθεί.");
    return res.redirect("/home");
  }

  res.render("login", {
    pageTitle: "Είσοδος",
    userRole: null,
    currentPage: "login",
    message: res.locals.errorMsg,
  });
});

// 2. Redirect root to /home
router.get("/", requirePageRoles(allRoles), async (req, res, next) => {
  try {
    res.redirect("/home");
  } catch (error) {
    console.error(error);
    error.status = error.status || 500;
    next(error);
  }
});

// 3. Home Page (all roles)
router.get("/home", requirePageRoles(allRoles), (req, res) => {
  res.render("home", {
    pageTitle: "Αρχική Σελίδα",
    currentPage: "home",
    message: res.locals.successMsg,
  });
});

// 4. Users List (only secretary)
router.get(
  "/users",
  requirePageRoles(onlySecretaryRoles),
  async (req, res, next) => {
    try {
      const allUsers = await User.find()
        .select("username firstName lastName role profilePhoto studentId")
        .lean();

      allUsers.sort((a, b) => {
        const lastA = a.lastName || "";
        const lastB = b.lastName || "";
        return lastA.localeCompare(lastB, "el", { sensitivity: "base" });
      });

      res.render("users", {
        pageTitle: "Χρήστες",
        currentPage: "users",
        usersList: allUsers,
      });
    } catch (error) {
      console.error(error);
      error.status = error.status || 500;
      next(error);
    }
  }
);

// 5. User Details (only secretary)
router.get(
  "/user/:username",
  requirePageRoles(onlySecretaryRoles),
  async (req, res, next) => {
    try {
      const { username } = req.params;

      if (!username) {
        const error = new Error("Username parameter is required");
        error.status = 400;
        return next(error);
      }

      // If creating a new user
      if (username === "new_user") {
        return res.render("profile", {
          pageTitle: "Νέος Χρήστης",
          currentPage: "new_user",
          user: null,
        });
      }

      // Find user in DB
      const responseUser = await User.findOne({ username })
        .select("-password -__v") // exclude sensitive/internal fields
        .lean();

      if (!responseUser) {
        const error = new Error("User not found");
        error.status = 404;
        return next(error);
      }

      res.render("profile", {
        pageTitle: `${responseUser.firstName} ${responseUser.lastName}`,
        currentPage: "user_details",
        user: responseUser,
      });
    } catch (error) {
      console.error(error);
      error.status = error.status || 500;
      next(error);
    }
  }
);

// 6. User Profile (all roles)
router.get("/profile", requirePageRoles(allRoles), async (req, res, next) => {
  try {
    const username = res.locals.connectedUserUsername;

    // Query the database for the current user by username
    const currentUser = await User.findOne({ username }).lean();

    if (!currentUser) {
      const error = new Error("User not found");
      error.status = 404;
      return next(error);
    }

    res.render("profile", {
      pageTitle: "Προφίλ Χρήστη",
      currentPage: "profile",
      user: currentUser,
    });
  } catch (error) {
    console.error(error);
    error.status = error.status || 500;
    next(error);
  }
});

// 7. Topics List (professors and students but professors only see their own)
router.get(
  "/topics",
  requirePageRoles(notSecretaryRoles),
  async (req, res, next) => {
    try {
      let query = {};

      // Filter topics for professors to only show their own
      if (res.locals.connectedUserRole === "professor") {
        query.createdBy = res.locals.connectedUserId;
      }

      // Fetch topics from DB
      let topics = await Topic.find(query)
        .collation({ locale: "el", strength: 1 })
        .sort({ title: 1 })
        .lean();

      // Only attach supervisorFullName if the connected user is a student
      if (res.locals.connectedUserRole === "student") {
        const creatorIds = [...new Set(topics.map((t) => t.createdBy))];
        const objectIds = creatorIds.map(
          (id) => new mongoose.Types.ObjectId(id)
        );
        const users = await User.find({ _id: { $in: objectIds } })
          .select("firstName lastName username")
          .lean();
        const userMap = {};
        users.forEach((u) => {
          userMap[u._id.toString()] = `${u.lastName} ${u.firstName}`;
        });
        topics = topics.map((topic) => ({
          ...topic,
          supervisorFullName: userMap[topic.createdBy] || "-",
        }));
      }

      res.render("topics", {
        pageTitle: "Διαθέσιμα Θέματα",
        currentPage: "topics",
        topics,
      });
    } catch (error) {
      console.error(error);
      error.status = error.status || 500;
      next(error);
    }
  }
);

// 8. Assignments List (professors and secretaries)
router.get(
  "/assignments",
  requirePageRoles(notStudentRoles),
  async (req, res, next) => {
    try {
      let query = {};

      if (res.locals.connectedUserRole === "secretary") {
        query.status = { $in: ["active", "review"] };
      } else if (res.locals.connectedUserRole === "professor") {
        query.$or = [
          { "professors.supervisor.id": res.locals.connectedUserId },
          { "professors.memberA.id": res.locals.connectedUserId },
          { "professors.memberB.id": res.locals.connectedUserId },
        ];
      } else {
        query = { _id: null }; // return empty for others
      }

      let assignments = await Assignment.find(query)
        .collation({ locale: "el", strength: 1 }) // Greek collation
        .sort({ title: 1 }) // Sort by title
        .lean();

      res.render("assignments", {
        pageTitle: "Αναθέσεις",
        currentPage: "assignments",
        assignments,
      });
    } catch (error) {
      console.error(error);
      error.status = error.status || 500;
      next(error);
    }
  }
);

// 9. Assignment Details (professors and secretaries only
router.get(
  "/assignment/:id",
  requirePageRoles(notStudentRoles),
  async (req, res, next) => {
    try {
      const requestedThesisId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(requestedThesisId)) {
        const error = new Error("Invalid thesis ID");
        error.status = 400;
        return next(error);
      }

      // Convert string to ObjectId
      const thesisObjectId = new mongoose.Types.ObjectId(requestedThesisId);

      // Fetch from assignments collection
      const responseThesis = await Assignment.findById(thesisObjectId).lean();
      if (!responseThesis) {
        const error = new Error("Assignment not found");
        error.status = 404;
        return next(error);
      }

      let userThesisRole = "";
      if (res.locals.connectedUserRole === "secretary") {
        if (
          responseThesis.status !== "active" &&
          responseThesis.status !== "review"
        ) {
          const error = new Error("Access Denied");
          error.status = 403;
          return next(error);
        }
        userThesisRole = res.locals.connectedUserRole;
      } else if (res.locals.connectedUserRole === "professor") {
        const connectedId = new mongoose.Types.ObjectId(
          res.locals.connectedUserId
        );
        if (connectedId.equals(responseThesis.professors?.supervisor?.id)) {
          userThesisRole = "supervisor";
        } else if (connectedId.equals(responseThesis.professors?.memberA?.id)) {
          userThesisRole = "memberA";
        } else if (connectedId.equals(responseThesis.professors?.memberB?.id)) {
          userThesisRole = "memberB";
        }
      }

      if (!userThesisRole) {
        const error = new Error("Access Denied");
        error.status = 403;
        return next(error);
      }

      res.render("assignment", {
        pageTitle: responseThesis.title,
        currentPage: "assignment",
        userThesisRole: userThesisRole,
        thesis: responseThesis,
      });
    } catch (error) {
      console.error(error);
      error.status = error.status || 500;
      next(error);
    }
  }
);

// 10. Student's Thesis (students only)
router.get(
  "/thesis",
  requirePageRoles(onlyStudentRoles),
  async (req, res, next) => {
    try {
      const userRole = res.locals.connectedUserRole;
      const username = res.locals.connectedUserUsername;

      let thesis = null;

      if (userRole === "student") {
        // Find student by username
        const studentUser = await User.findOne({
          username,
          role: "student",
        }).lean();
        if (!studentUser) {
          const error = new Error("Student not found");
          error.status = 404;
          return next(error);
        }

        if (!studentUser.thesisId) {
          return res.render("no-assignment", {
            pageTitle: "Χωρίς Ανάθεση",
            currentPage: "thesis",
            yearOfStudies: studentUser.yearOfStudies,
          });
        }

        // Fetch thesis assigned to student
        thesis = await Assignment.findById(studentUser.thesisId).lean();
        if (!thesis) {
          const error = new Error("Thesis not found");
          error.status = 404;
          return next(error);
        }
      } else {
        // Optional: professors or secretaries logic
        const error = new Error("Access Denied");
        error.status = 403;
        return next(error);
      }

      res.render("assignment", {
        pageTitle: thesis.title,
        currentPage: "thesis",
        userThesisRole: "student",
        thesis: thesis,
      });
    } catch (error) {
      console.error(error);
      error.status = error.status || 500;
      next(error);
    }
  }
);

// 11. Invitations List (professors only)
router.get(
  "/invitations",
  requirePageRoles(onlyProfessorRoles),
  async (req, res, next) => {
    try {
      const connectedUserId = res.locals.connectedUserId;
      const professorIdQuery = mongoose.Types.ObjectId.isValid(connectedUserId)
        ? new mongoose.Types.ObjectId(connectedUserId)
        : connectedUserId;

      // Run both queries in parallel
      const [invitationsPending, invitationsCompleted] = await Promise.all([
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

      // Helper for enriching invitations with assignment data
      const enrichWithAssignment = async (inv) => {
        const assignment = await Assignment.findById(inv.thesisId)
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

      // Enrich both lists in parallel
      const [responsePending, responseCompleted] = await Promise.all([
        Promise.all(invitationsPending.map(enrichWithAssignment)),
        Promise.all(invitationsCompleted.map(enrichWithAssignment)),
      ]);

      res.render("invitations", {
        pageTitle: "Προσκλήσεις",
        currentPage: "invitations",
        pendingList: responsePending,
        completedList: responseCompleted,
      });
    } catch (error) {
      console.error(error);
      error.status = error.status || 500;
      next(error);
    }
  }
);

// 12 Evaluation Protocol Details (all roles but students only see their own)
router.get(
  "/protocol/:id",
  requirePageRoles(allRoles),
  async (req, res, next) => {
    try {
      const thesisId = req.params.id;

      if (!thesisId || !mongoose.Types.ObjectId.isValid(thesisId)) {
        const error = new Error("Invalid assignment ID");
        error.status = 400;
        return next(error);
      }

      console.log("Thesis ID:", thesisId);

      const assignment = await Assignment.findById(thesisId).lean();
      const currentUserId = res.locals.connectedUserId;

      if (res.locals.connectedUserRole !== "secretary") {
        if (res.locals.connectedUserRole === "professor") {
          if (
            assignment.professors.supervisor.id.toString() !== currentUserId &&
            assignment.professors.memberA.id.toString() !== currentUserId &&
            assignment.professors.memberB.id.toString() !== currentUserId
          ) {
            const error = new Error("Access Denied");
            error.status = 403;
            return next(error);
          }
        } else if (res.locals.connectedUserRole === "student") {
          const findUser = await User.findById(currentUserId).lean();
          console.log("Find User:", findUser);

          if (!findUser) {
            const error = new Error("User not found");
            error.status = 404;
            return next(error);
          } else if (findUser.studentId !== assignment.student.idNumber) {
            const error = new Error("Access Denied");
            error.status = 403;
            return next(error);
          }
        }
      }

      // Load from DB
      const evaluation = await Evaluation.findOne({
        thesisId: thesisId.toString(),
      });

      if (!evaluation) {
        const error = new Error("Evaluation not found");
        error.status = 404;
        return next(error);
      }

      const dateParts = formatProtocolDate(evaluation.protocolDate);

      res.render("protocol_details", {
        pageTitle: "Πρακτικό Εξέτασης",
        protocol: evaluation,
        protocolFormattedDate: dateParts.date,
        protocolDay: dateParts.day,
        protocolTime: dateParts.time,
        protocolCombined: dateParts.combined,
      });
    } catch (error) {
      console.error(error);
      error.status = error.status || 500;
      next(error);
    }
  }
);

router.get(
  "/stats",
  requirePageRoles(onlyProfessorRoles),
  async (req, res, next) => {
    try {
      res.render("stats", {
        pageTitle: "Στατιστικά",
        currentPage: "stats",
      });
    } catch (error) {
      console.error(error);
      error.status = error.status || 500;
      next(error);
    }
  }
);

router.get("/logout", requirePageRoles(allRoles), async (req, res, next) => {
  try {
    
    // Also clear the session from the store (MongoDB)
    req.session.destroy((error) => {
      if (error) {
        console.error(error);
        error.status = error.status || 500;
        return next(error);
      }

      res.clearCookie("connect.sid", {
        httpOnly: true,
        secure: false, // set true if using HTTPS
      });

      res.clearCookie("token", {
        httpOnly: true,
        secure: false, // set true if using HTTPS
      });

      return res.redirect("/login");
    });
  } catch (error) {
    console.error(error);
    error.status = error.status || 500;
    next(error);
  }
});

router.get("/announcements", (req, res, next) => {
  try {
    res.render("announcements", {
      pageTitle: "Ανακοινώσεις",
      currentPage: "announcements",
    });
  } catch (error) {
    console.error(error);
    error.status = error.status || 500;
    next(error);
  }
});

// Public endpoint
router.get("/announcements/public", async (req, res, next) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const from = parseDateDDMMYYYY(req.query.from);
    const to = parseDateDDMMYYYY(req.query.to);
    const typeFile = req.query.file;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use dd-mm-yyyy",
      });
    }

    //check if from is after to
    if (from > to) {
      return res.status(400).json({
        success: false,
        message: "'From' date cannot be after 'To' date",
      });
    }

    if (!typeFile) {
      return res.status(400).json({
        success: false,
        message: "'file' query parameter is required",
      });
    }

    if (typeFile !== "xml" && typeFile !== "json") {
      return res.status(400).json({
        success: false,
        message: "'file' query parameter must be either 'xml' or 'json'",
      });
    }

    if (typeFile === "xml") {
      res.setHeader("Content-Type", "application/xml");
    } else {
      res.setHeader("Content-Type", "application/json");
    }

    // Fetch announcements within date range
    const announcements = await Announcement.find({
      presentationDateTime: { $gte: from, $lte: to },
    })
      .select(
        "-_id thesisTitle presentationDateTime description place1 place2 studentName supervisorName members"
      )
      .sort({ updatedAt: 1 }); // optional: sort by date

    if (typeFile === "json") {
      res.json({
        success: true,
        from: formatDate(from),
        to: formatDate(to),
        announcements: [...announcements],
      });
    } else {
      // Convert to XML format
      let xmlResponse = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xmlResponse += "<announcements>\n";
      xmlResponse += `  <from>${formatDate(from)}</from>\n`;
      xmlResponse += `  <to>${formatDate(to)}</to>\n`;
      xmlResponse += "  <announcements_list>\n";
      announcements.forEach((ann) => {
        xmlResponse += "    <announcement>\n";
        xmlResponse += `      <thesisTitle>${ann.thesisTitle}</thesisTitle>\n`;
        xmlResponse += `      <description>${ann.description}</description>\n`;
        xmlResponse += `      <presentationDateTime>${formatDate(
          ann.presentationDateTime
        )}</presentationDateTime>\n`;
        xmlResponse += `      <place1>${ann.place1}</place1>\n`;
        xmlResponse += `      <place2>${ann.place2 || ""}</place2>\n`;
        xmlResponse += `      <studentName>${ann.studentName}</studentName>\n`;
        xmlResponse += `      <supervisorName>${ann.supervisorName}</supervisorName>\n`;
        xmlResponse += "      <members>\n";
        ann.members.forEach((member) => {
          xmlResponse += `        <member>${member}</member>\n`;
        });
        xmlResponse += "      </members>\n";
        xmlResponse += "    </announcement>\n";
      });
      xmlResponse += "  </announcements_list>\n";
      xmlResponse += "</announcements>\n";

      return res.send(xmlResponse);
    }
  } catch (error) {
    console.error("Error rendering public announcements page", error);
    res.status(500).send("Error rendering public announcements page");
  }
});

module.exports = router;
