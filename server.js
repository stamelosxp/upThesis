const fs = require("fs").promises;
const path = require("path");

const express = require("express");

const app = express();

app.listen(3000, () => {
    console.log("Server is running on port 3000!");
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use("/data", express.static("data"));
app.use(express.urlencoded({extended: false}));

app.use(async function (req, res, next) {
    // Set default user role for development
    res.locals.connectedUserRole = "professor"; // Change this to "professor" or "student" as needed

    if (res.locals.connectedUserRole === "professor") {
        res.locals.connectedUserId = "prof_001"
        res.locals.professorRole = "memberA";
    } else if (res.locals.connectedUserRole === "student") {
        res.locals.connectedUserId = "stud_001"

        const userData = await fs.readFile(
            path.join(__dirname, "data", "sampleUsers.json"),
            "utf-8"
        );
        const allUsers = JSON.parse(userData);
        const currentUser = allUsers.find(user => user.userId === res.locals.connectedUserId);
        res.locals.userThesisId = currentUser.thesisId;
    }
    else if (res.locals.userRole === "secretary") {
        res.locals.connectedUserId = "sec_001";
    }
    next();
});
app.get("/", (req, res) => {
    if (res.locals.connectedUserRole === "professor") {
        return res.redirect("/professor");
    } else if (res.locals.connectedUserRole === "student") {
        return res.redirect("/student");
    } else if (res.locals.connectedUserRole === "secretary") {
        return res.redirect("/secretary");
    } else {
        return res.redirect("/login");
    }
});

app.get("/professor", (req, res) => {
    res.render("home", {
        pageTitle: "Αρχική Σελίδα",
        currentPage: "home",
        notificationsList: [],
        eventsList: [],
    });
});

app.get("/professor/topics", async (req, res) => {
    try {
        const data = await fs.readFile(
            path.join(__dirname, "data", "sampleTopics.json"),
            "utf-8"
        );
        const allTopics = JSON.parse(data);
        const professorTopics = allTopics.filter((topic) => topic.status === null && topic.createdBy === res.locals.connectedUserId);

        res.render("topics", {
            pageTitle: "Διαθέσιμα Θέματα",
            currentPage: "topics",
            topics: professorTopics,
        });
    } catch (err) {
        res.status(500).send("Error loading topics");
    }
});

app.get("/professor/assignments", async (req, res) => {
    try {
        const data = await fs.readFile(
            path.join(__dirname, "data", "sampleTopics.json"),
            "utf-8"
        );
        const allTopics = JSON.parse(data);
        const topics = allTopics.filter((topic) => topic.status !== null);
        res.render("assignments", {
            pageTitle: "Εργασίες",
            userRole: "professor",
            currentPage: "assignments",
            topics,
        });
    } catch (err) {
        res.status(500).send("Error loading assignments");
    }
});

app.get("/professor/assignments/:id", async (req, res) => {
    try {
        const currentTopicID = req.params.id;
        const topicsData = await fs.readFile(
            path.join(__dirname, "data", "sampleTopics.json"),
            "utf-8"
        );
        const allTopics = JSON.parse(topicsData);

        const notesData = await fs.readFile(
            path.join(__dirname, "data", "notesSamples.json"),
            "utf-8"
        );
        const allNotes = JSON.parse(notesData);

        const meetingsData = await fs.readFile(
            path.join(__dirname, "data", "sampleMeetings.json"),
            "utf-8"
        );
        const allMeetings = JSON.parse(meetingsData);

        const resNotes = allNotes.filter(
            (note) =>
                note.topicId == currentTopicID && note.userId == res.locals.connectedUserId
        );

        // Filter meetings for this professor and topic, then sort by newest date
        const professorMeetings = allMeetings
            .filter(
                (meeting) =>
                    meeting.participants.professor == res.locals.connectedUserId &&
                    String(meeting.thesisId) == String(currentTopicID)
            )
            .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

        const topic = allTopics.find((t) => t.id == currentTopicID);

        if (!topic) {
            return res.status(404).send("Topic not found");
        }

        // Calculate if cancellation is enabled
        let canCancel = false;
        if (topic.status === "pending") {
            canCancel = true;
        } else if (topic.status === "active" && topic.assignmentDate) {
            // Parse assignment date (DD/MM/YYYY format)
            const [day, month, year] = topic.assignmentDate.split("/");
            const assignmentDate = new Date(year, month - 1, day);
            const currentDate = new Date();
            const twoYearsInMs = 2 * 365 * 24 * 60 * 60 * 1000;
            canCancel = currentDate - assignmentDate > twoYearsInMs;
        }

        // Calculate showEvaluation: true if presentationDate exists and is before today
        let showEvaluation = false;
        if (topic.presentationDate) {
            const [day, month, year] = topic.presentationDate.split("/").map(Number);
            const presDate = new Date(year, month - 1, day);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            if (presDate < now) {
                showEvaluation = true;
            }
        }

        res.render("assignment_detail", {
            pageTitle: "Ανάθεση - " + topic.title,
            userRole: "professor",
            currentPage: "assignments",
            topic,
            canCancel,
            resNotes: resNotes,
            professorMeetings,
            showEvaluation,
        });
    } catch (err) {
        console.error("Error loading assignment details:", err);
        res.status(500).send("Error loading assignment details");
    }
});

app.get("/professor/invitations", async (req, res) => {
    try {
        const invitationsList = await fs.readFile(path.join(__dirname, "data", "sampleInvitations.json"), "utf-8");
        const topicsList = await fs.readFile(path.join(__dirname, "data", "sampleTopics.json"), "utf-8");  // Adjust filename/path if different

        const allInvitations = JSON.parse(invitationsList);
        const allTopics = JSON.parse(topicsList);

        const topicsMap = new Map();
        allTopics.forEach(topic => {
            topicsMap.set(topic.id, topic);
        });

        const professorInvitations = allInvitations.filter((inv) => inv.professorID === res.locals.connectedUserId);
        const enhancedInvitations = professorInvitations.map((inv) => {
            const matchingTopic = topicsMap.get(Number(inv.thesisID));
            return {
                ...inv,
                title: matchingTopic && matchingTopic.title ? matchingTopic.title : 'Topic not found',
                description: matchingTopic && matchingTopic.description ? matchingTopic.description : 'Description unavailable'
            };
        });

        enhancedInvitations.sort((a, b) => new Date(b.date) - new Date(a.date));  // Assumes 'date' is parseable
        res.render("invitations", {
            pageTitle: "Προσκλήσεις",
            userRole: "professor",
            currentPage: "invitations",
            invitationsList: enhancedInvitations,  // Now includes topic details
        });

    } catch (err) {
        console.error("Error loading invitations or topics:", err);
        return res.status(500).send("Error loading invitations");
    }
});


app.get("/professor/stats", (req, res) => {
    res.render("maintenance", {
        pageTitle: "Στατιστικά",
        userRole: "professor",
        currentPage: "stats",
    });
});

app.get("/professor/announcements", (req, res) => {
    res.render("maintenance", {
        pageTitle: "Ανακοινώσεις",
        userRole: "professor",
        currentPage: "announcements",
    });
});

// Student routes
app.get("/student", (req, res) => {
    res.locals.connectedUserRole = "student"; // Set the user role to student for this session
    res.render("home", {
        pageTitle: "Home",
        currentPage: "home",
        notificationsList: [],
        eventsList: [],
    });
});

app.get("/student/topics", async (req, res) => {
    res.locals.connectedUserRole = "student";
    try {
        const data = await fs.readFile(
            path.join(__dirname, "data", "sampleTopics.json"),
            "utf-8"
        );
        const allTopics = JSON.parse(data);
        const availableTopics = allTopics.filter((topic) => topic.status === null);

        res.render("topics", {
            pageTitle: "Διαθέσιμα Θέματα",
            currentPage: "topics",
            topics: availableTopics,
        });
    } catch (err) {
        res.status(500).send("Error loading topics");
    }
});

app.get("/student/thesis", async (req, res) => {
    try {
        const userThesisRole = 'student';

        const topicsData = await fs.readFile(
            path.join(__dirname, "data", "sampleTopics.json"),
            "utf-8"
        );
        const allTopics = JSON.parse(topicsData);
        const topic = allTopics.find((topic) => topic.id === res.locals.userThesisId);

        if (!topic) {
            return res.status(404).send("Topic not found");
        }



        // Calculate showEvaluation: true if presentationDate exists and is before today
        let showEvaluation = false;
        if (topic.presentationDate) {
            const [day, month, year] = topic.presentationDate.split("/").map(Number);
            const presDate = new Date(year, month - 1, day);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            if (presDate < now) {
                showEvaluation = true;
            }
        }

        const notesData = await fs.readFile(
            path.join(__dirname, "data", "notesSamples.json"),
            "utf-8"
        );
        const allNotes = JSON.parse(notesData);

        const resNotes = allNotes.filter(
            (note) => note.topicId === topic.id
        );

        const meetingsData = await fs.readFile(
            path.join(__dirname, "data", "sampleMeetings.json"),
            "utf-8"
        );
        const allMeetings = JSON.parse(meetingsData);

        // Filter meetings for this student and topic, then sort by newest date
        const studentMeetings = allMeetings
            .filter(
                (meeting) =>
                    meeting.participants.student === res.locals.userId &&
                    String(meeting.thesisId) === String(topic.id)
            )
            .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

        res.render("student_thesis", {
            pageTitle: "Διπλωματική",
            currentPage: "thesis",
            topic: topic,
            showEvaluation: showEvaluation,
            resNotes: resNotes,
            professorMeetings: studentMeetings, // Placeholder for meetings, if needed
            userThesisRole: userThesisRole,
        });
    } catch (err) {
        console.error("Error loading thesis data:", err);
        return res.status(500).send("Error loading thesis data");
    }

});

app.get("/student/announcements", (req, res) => {
    res.render("maintenance", {
        pageTitle: "Ανακοινώσεις",
        userRole: "student",
        currentPage: "announcements",
    });
});

// Secretary routes
app.get("/secretary", (req, res) => {
    res.render("maintenance", {
        pageTitle: "Home",
        userRole: "secretary",
        currentPage: "home",
    });
});

app.get("/secretary/users", (req, res) => {
    res.render("maintenance", {
        pageTitle: "Χρήστες",
        userRole: "secretary",
        currentPage: "users",
    });
});

app.get("/secretary/announcements", (req, res) => {
    res.render("maintenance", {
        pageTitle: "Ανακοινώσεις",
        userRole: "secretary",
        currentPage: "announcements",
    });
});

// General routes (accessible by all roles)
app.get("/login", (req, res) => {
    res.render("maintenance", {
        pageTitle: "Είσοδος",
        userRole: null,
        currentPage: "login",
    });
});

app.get("/announcements", (req, res) => {
    res.render("maintenance", {
        pageTitle: "Ανακοινώσεις",
        userRole: null,
        currentPage: "announcements",
    });
});

app.get("/professor/students/available", async (req, res) => {
    try {
        // Accept any of these query param names; default to empty string
        const rawQuery = req.query.studentNameSearch;
        const userInput = rawQuery ? rawQuery.toLowerCase().trim() : '';

        const usersData = await fs.readFile(path.join(__dirname, "data", "sampleUsers.json"), "utf-8");
        const allUsers = JSON.parse(usersData);
        let available = allUsers.filter(u => u.role === 'student' && u.hasThesis === false && Number(u.yearOfStudies) >= 5);

        if (userInput.length > 0) {
            available = available.filter(u => (`${u.firstName} ${u.lastName}`).toLowerCase().includes(userInput));
        }

        const mapped = available.map(u => ({
            userId: u.userId,
            fullName: `${u.firstName} ${u.lastName}`
        }));

        return res.json({ success: true, students: mapped });
    } catch (e) {
        console.error('Error fetching available students', e);
        return res.status(500).json({ success: false, error: 'Failed to load students' });
    }
});
