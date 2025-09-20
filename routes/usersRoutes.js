const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { generateUniqueUsername } = require("../utils-backend/username");
const { normalizeGreek } = require("../utils-backend/utils-server");
const { jsonFileUpload } = require("../config/multer");

function parseBirthDate(dateStr) {
  // Expecting format: dd/mm/yyyy
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months 0-11
  const year = parseInt(parts[2], 10);

  const date = new Date(year, month, day); // time will default to 00:00:00
  return isNaN(date.getTime()) ? null : date;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape special chars
}

const requiredFields = {
  student: [
    "role",
    "firstName",
    "lastName",
    "birthDate",
    "mobilePhone",
    "phone",
    "department",
    "email",
    "yearOfStudies",
    "studentId",
    "hasThesis",
    "thesisId",
    "gender",
  ],
  professor: [
    "role",
    "firstName",
    "lastName",
    "birthDate",
    "mobilePhone",
    "phone",
    "department",
    "typeProfessor",
    "email",
    "gender",
  ],
  secretary: [
    "role",
    "firstName",
    "lastName",
    "birthDate",
    "mobilePhone",
    "phone",
    "department",
    "email",
    "gender",
  ],
};

// 1. Endpoint to create a new user (secretary)
router.post("/create", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      birthDate,
      department,
      email,
      mobilePhone,
      phone,
      gender,
      userType,
      extraField,
    } = req.body;

    if (req.user.role !== "secretary") {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (
      !firstName ||
      !lastName ||
      !email ||
      !userType ||
      !["student", "professor", "secretary"].includes(userType)
    ) {
      return res
        .status(400)
        .json({ error: "Missing required fields or invalid userType" });
    }

    // Check for existing email
    const existingEmail = await User.findOne({ email: email });
    if (existingEmail) {
      return res.status(400).json({ error: `Το email "${email}" υπάρχει ήδη` });
    }

    // For students, check studentId in extraField
    if (userType === "student") {
      if (!extraField || !extraField.studentId || !extraField.yearOfStudies) {
        return res.status(400).json({
          error: "Missing studentId or yearOfStudies for student userType",
        });
      }
      const existingStudentId = await User.findOne({
        studentId: String(extraField.studentId),
      });
      if (existingStudentId) {
        return res.status(400).json({
          error: `Ο Αριθμός Μητρώου "${extraField.studentId}" υπάρχει ήδη`,
        });
      }
    }

    // Generate username and set default password
    const password = "12345678"; // default password
    const username = await generateUniqueUsername(firstName, lastName);
    const parsedBirthDate = birthDate ? parseBirthDate(birthDate) : null;

    const tmpNewUser = {
      username,
      email,
      role: userType, // map userType to role
      firstName,
      lastName,
      password,
      department: department || null,
      mobilePhone: mobilePhone || null,
      phone: phone || null,
      gender: gender || null,
      birthDate: parsedBirthDate,
    };
    // Handle extraField based on userType
    if (userType === "professor") {
      tmpNewUser.typeOfProfessor = extraField || null; // new field for professors
    } else if (userType === "student") {
      tmpNewUser.yearOfStudies = extraField.yearOfStudies || null; // extraField = yearOfStudies
      tmpNewUser.studentId = String(extraField.studentId) || null; // extraField = studentId
    }

    const newUser = new User(tmpNewUser);
    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "User created successfully",
    });
  } catch (err) {
    res.status(500).json({ error: "Server error while creating user" });
  }
});

// 2. Endpoint to bulk upload users via JSON file or link (secretary)
router.post("/upload", jsonFileUpload.single("jsonFile"), async (req, res) => {
  try {
    let data = [];

    if (req.user.role !== "secretary") {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (req.file) {
      const fileText = req.file.buffer.toString("utf-8");
      const cleanText = fileText.replace(/\/\/.*$/gm, ""); // remove JS-style comments
      const fileData = JSON.parse(cleanText);
      data = data.concat(fileData);
    }

    if (req.body.jsonLink) {
      let url = req.body.jsonLink;
      if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }

      const response = await fetch(url);
      if (!response.ok) {
        return res.status(400).json({ error: "Cannot fetch JSON from link" });
      }
      const linkData = await response.json();
      data = data.concat(linkData);
    }

    if (data.length === 0) {
      return res.status(400).json({ error: "No JSON file or link provided" });
    }

    if (!Array.isArray(data)) {
      return res
        .status(400)
        .json({ error: "JSON must be an array of objects" });
    }

    const usersToInsert = [];

    for (const [index, item] of data.entries()) {
      const role = item.role;
      if (!role || !requiredFields[role]) {
        return res
          .status(400)
          .json({ error: `Unknown role at index ${index}` });
      }

      // Check for missing fields
      const missingFields = requiredFields[role].filter((f) => !(f in item));
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing fields for role ${role} at index ${index}: ${missingFields.join(
            ", "
          )}`,
        });
      }

      // Build user object
      const password = "12345678"; // default password
      const username = await generateUniqueUsername(
        item.firstName,
        item.lastName
      );

      const newUser = {
        username,
        email: item.email,
        role: role,
        firstName: item.firstName,
        lastName: item.lastName,
        password,
        department: item.department || null,
        mobilePhone: item.mobilePhone || null,
        phone: item.phone || null,
        birthDate: item.birthDate,
        gender: item.gender,
      };

      // Handle extra fields based on role
      if (role === "professor")
        newUser.typeOfProfessor = item.typeProfessor || null;
      if (role === "student") {
        newUser.yearOfStudies = item.yearOfStudies || null;
        newUser.studentId = String(item.studentId) || null; // extraField = studentId
      }

      usersToInsert.push(newUser);
      console.log("New user to insert:", newUser);
    }
    for (const [index, userData] of usersToInsert.entries()) {
      // Check username
      const existingUsername = await User.findOne({
        username: userData.username,
      });
      if (existingUsername) {
        return res.status(400).json({
          error: `Το username "${userData.username}" υπάρχει ήδη (αντικείμενο ${index})`,
        });
      }

      // Check email (if required to be unique)
      if (userData.email) {
        const existingEmail = await User.findOne({ email: userData.email });
        if (existingEmail) {
          return res.status(400).json({
            error: `Το email "${userData.email}" υπάρχει ήδη (αντικείμενο ${index})`,
          });
        }
      }

      if (userData.studentId) {
        const existingStudentId = await User.findOne({
          studentId: userData.studentId,
        });
        if (existingStudentId) {
          return res.status(400).json({
            error: `Ο Αριθμός Μητρώου "${userData.studentId}" υπάρχει ήδη (αντικείμενο ${index})`,
          });
        }
      }
    }

    for (const userData of usersToInsert) {
      const user = new User(userData);
      await user.save();
    }

    const allUsers = await User.find({}).lean();

    console.log("All users after insertion:", allUsers.length);

    allUsers.sort((a, b) => {
      const lastA = a.lastName || "";
      const lastB = b.lastName || "";
      return lastA.localeCompare(lastB, "el", { sensitivity: "base" });
    });

    return res.status(201).json({
      success: true,
      message: "Όλοι οι χρήστες καταχωρήθηκαν επιτυχώς",
      data: allUsers,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error while creating users" });
  }
});

// 3. Endpoint to search users (all roles)
router.get("/", async (req, res) => {
  try {
    if (req.user.role !== "secretary") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const query = req.query.q?.trim() || "";
    const normalizedQuery = normalizeGreek(query).toLowerCase();

    let filter = {};
    if (query.length > 0) {
      const regex = new RegExp(normalizedQuery, "i"); // case-insensitive
      filter = {
        $or: [
          { searchFullName: regex },
          { username: regex },
          { email: regex },
          { mobilePhone: regex },
          { phone: regex },
          { studentId: regex },
        ],
      };
    }

    let users = await User.find(
      filter,
      "username firstName lastName role profilePhoto studentId"
    ).lean();

    if (!users) {
      users = [];
    }

    // Sort by lastName (Greek locale)
    users.sort((a, b) => {
      const lastA = a.lastName || "";
      const lastB = b.lastName || "";
      return lastA.localeCompare(lastB, "el", { sensitivity: "base" });
    });

    return res.json({ success: true, users });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to search users." });
  }
});

// 4. Endpoint to check username availability (all roles)
router.get("/available/username/:username", async (req, res) => {
  try {
    const username = req.params.username?.trim();
    if (!username) {
      return res
        .status(400)
        .json({ success: false, error: "No username provided." });
    }

    if (username.toLowerCase() === "new_user") {
      return res.json({ success: true, available: false });
    }

    const regex = new RegExp(`^${escapeRegex(username)}$`, "i");
    const exists = await User.exists({ username: regex });

    return res.json({ success: true, available: !exists });
  } catch (err) {
    console.error("Error checking username availability:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to check username availability.",
    });
  }
});

// 5. Endpoint to check email availability (all roles)
router.get("/available/email/:email", async (req, res) => {
  try {
    const email = req.params.email?.trim();
    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "No username provided." });
    }

    const exists = await User.exists({ email: email });

    return res.json({ success: true, available: !exists });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to check email availability." });
  }
});

// 6. Endpoint to get available students for thesis assignment (professors)
router.get("/students/available", async (req, res) => {
  try {
    if (req.user.role !== "professor") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const query = req.query.q?.trim() || "";
    const normalizedQuery = normalizeGreek(query).toLowerCase();
    const numericQuery = Number(query);

    // Base filter: only students without thesis and year >= 5
    let filter = {
      role: "student",
      hasThesis: false,
      yearOfStudies: { $gte: 5 },
    };

    if (query.length > 0) {
      const regex = new RegExp(normalizedQuery, "i");
      filter.$or = [
        { searchFullName: regex },
        { email: regex },
        { username: regex },
        { studentId: regex },
      ];
    }

    // Fetch matching students
    let students = await User.find(
      filter,
      "firstName lastName studentId"
    ).lean();

    if (!students) students = [];

    // Sort by lastName (Greek locale)
    students.sort((a, b) => {
      const lastA = a.lastName || "";
      const lastB = b.lastName || "";
      return lastA.localeCompare(lastB, "el", { sensitivity: "base" });
    });

    // Response format
    const responseStudents = students.map((u) => ({
      userId: u.studentId,
      fullName: `${u.lastName} ${u.firstName}`,
    }));

    console.log("Available students found:", responseStudents.length);

    return res.json({ success: true, students: responseStudents });
  } catch (err) {
    console.error("Error fetching available students:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load students" });
  }
});

module.exports = router;
