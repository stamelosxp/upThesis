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
    //set default user role for development
    res.locals.userRole = "professor"; // Change to "professor" for professor role
    if (res.locals.userRole === "professor") {
        res.locals.professorID = "prof_001"; // Example professor ID
        res.locals.professorRole = "supervisor"; // Change to "supervisor" for supervisor role
    }
    next();
});

app.get("/", (req, res) => {
    if (res.locals.userRole === "professor") {
        return res.redirect("/professor");
    } else if (res.locals.userRole === "student") {
        return res.redirect("/student");
    } else if (res.locals.userRole === "secretary") {
        return res.redirect("/secretary");
    } else {
        return res.redirect("/login");
    }
});

app.get("/professor", (req, res) => {
    res.render("home", {
        pageTitle: "Home",
        userRole: "professor",
        currentPage: "home",
        pageContent: "Αρχική Σελίδα",
        notification: true,
    });
});

app.get("/professor/topics", async (req, res) => {
    try {
        const data = await fs.readFile(
            path.join(__dirname, "data", "sampleTopics.json"),
            "utf-8"
        );
        const allTopics = JSON.parse(data);
        const topics = allTopics.filter((topic) => topic.status === null);
        res.render("available_topics", {
            pageTitle: "Θέματα",
            userRole: "professor",
            currentPage: "topics",
            topics,
        });
    } catch (err) {
        res.status(500).send("Error loading topics");
    }
});

// Route to serve new topic template
app.get("/professor/topics/new-topic-template", (req, res) => {
    res.render("includes/new_topic", {}, (err, html) => {
        if (err) {
            return res.status(500).json({error: "Template rendering failed"});
        }
        res.json({html: html});
    });
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
                note.topicId == currentTopicID && note.userId == res.locals.professorID
        );

        // Filter meetings for this professor and topic, then sort by newest date
        const professorMeetings = allMeetings
            .filter(
                (meeting) =>
                    meeting.participants.professor == res.locals.professorID &&
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
        const allInvitations = JSON.parse(invitationsList);

        const professorInvitations = allInvitations.filter((inv) => inv.professorID === res.locals.professorID);

        res.render("invitations", {
            pageTitle: "Προσκλήσεις",
            userRole: "professor",
            currentPage: "invitations",
            invitationsList: professorInvitations,
        });

    } catch (err) {
        console.error("Error loading invitations:", err);
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
    res.render("maintenance", {
        pageTitle: "Home",
        userRole: "student",
        currentPage: "home",
    });
});

app.get("/student/topics", (req, res) => {
    res.render("maintenance", {
        pageTitle: "Θέματα",
        userRole: "student",
        currentPage: "topics",
    });
});

app.get("/student/thesis", (req, res) => {
    res.render("maintenance", {
        pageTitle: "Διπλωματική",
        userRole: "student",
        currentPage: "thesis",
    });
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
