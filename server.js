const fs = require("fs").promises;
const path = require("path");

const express = require("express");
const {locals} = require("express/lib/application");

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
    res.locals.connectedUserRole = "secretary";
    if (res.locals.connectedUserRole === "professor" || res.locals.connectedUserRole === "student" || res.locals.connectedUserRole === "secretary") {
        res.locals.isAuth = true;
    } else {
        res.locals.isAuth = false;
    }

    if (res.locals.connectedUserRole === "professor") {
        res.locals.connectedUserId = "prof_001"
    } else if (res.locals.connectedUserRole === "student") {
        res.locals.connectedUserId = "stu_001"
    } else if (res.locals.connectedUserRole === "secretary") {
        res.locals.connectedUserId = "sec_001";
    }
    next();
});
app.get("/", (req, res) => {
    if (res.locals.connectedUserRole) {
        return res.redirect("/home");
    } else {
        return res.redirect("/login");
    }
});

app.get("/home", (req, res) => {
    res.render("home", {
        pageTitle: "Αρχική Σελίδα",
        currentPage: "home",
        notificationsList: [],
        eventsList: [],
    });
});

app.get("/topics", async (req, res) => {
    try {
        const data = await fs.readFile(
            path.join(__dirname, "data", "sampleTopics.json"),
            "utf-8"
        );
        const allTopics = JSON.parse(data);
        let responseTopics;

        if (res.locals.connectedUserRole === "professor") {
            responseTopics = allTopics.filter((topic) => topic.status === null && topic.createdBy === res.locals.connectedUserId);
        } else if (res.locals.connectedUserRole === "student") {
            responseTopics = allTopics.filter((topic) => topic.status === null);

        }

        res.render("topics", {
            pageTitle: "Διαθέσιμα Θέματα",
            currentPage: "topics",
            topics: responseTopics,
        });
    } catch (err) {
        res.status(500).send("Error loading topics");
    }
});

app.get("/assignments", async (req, res) => {
    try {
        const data = await fs.readFile(
            path.join(__dirname, "data", "sampleTheses.json"),
            "utf-8"
        );
        const allTheses = JSON.parse(data);

        let responseTheses;

        if (res.locals.connectedUserRole === "secretary") {
            responseTheses = allTheses.filter((thesisItem) => thesisItem.status !== 'completed' && thesisItem.status !== 'cancelled');
        } else if (res.locals.connectedUserRole === "professor") {
            responseTheses = allTheses.filter((thesisItem) => thesisItem.professors.supervisor.id === res.locals.connectedUserId || thesisItem.professors.memberA.id === res.locals.connectedUserId || thesisItem.professors.memberB.id === res.locals.connectedUserId);
        }

        res.render("assignments", {
            pageTitle: "Αναθέσεις",
            currentPage: "assignments",
            theses: responseTheses,
        });
    } catch (err) {
        res.status(500).send("Error loading assignments");
    }
});

app.get("/assignment/:id", async (req, res) => {
    try {
        const requestedThesisId = req.params.id;
        const thesesData = await fs.readFile(
            path.join(__dirname, "data", "sampleTheses.json"),
            "utf-8"
        );
        const allTheses = JSON.parse(thesesData);

        const responseThesis = allTheses.find((thesisItem) => thesisItem.id == requestedThesisId);
        if (!responseThesis) {
            return res.status(404).send("Topic not found");
        }

        let userThesisRole = '';

        if (res.locals.connectedUserRole === 'secretary') {
            userThesisRole = res.locals.connectedUserRole;
        } else if (res.locals.connectedUserRole === 'professor') {
            if (res.locals.connectedUserId === responseThesis.professors.supervisor.id) {
                userThesisRole = 'supervisor';
            } else if (res.locals.connectedUserId === responseThesis.professors.memberA.id) {
                userThesisRole = 'memberA';
            } else if (res.locals.connectedUserId === responseThesis.professors.memberB.id) {
                userThesisRole = 'memberB';
            }
        }

        res.render("assignment", {
            pageTitle: responseThesis.title,
            currentPage: "assignment",
            userThesisRole: userThesisRole,
            thesis: responseThesis
        });
    } catch (err) {
        console.error("Error loading assignment details:", err);
        res.status(500).send("Error loading assignment details");
    }
});

app.get("/protocol/:id", async (req, res) => {
    try {
        const requestedThesisId = req.params.id;
        const evaluationData = await fs.readFile(
            path.join(__dirname, "data", "sampleEvaluation.json"),
            "utf-8"
        );
        const allEvaluations = JSON.parse(evaluationData);

        const responseProtocol = allEvaluations.find((evaluationItem) => evaluationItem.thesisId == requestedThesisId);
        if (!responseProtocol) {
            return res.status(404).send("Topic not found");
        }

        function parseProtocolDate(raw) {
            if (!raw || typeof raw !== 'string') return null;
            if (raw.includes('T')) { // ISO 8601
                const d = new Date(raw);
                return isNaN(d) ? null : d;
            }
            const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
            if (!m) return null;
            const [, dd, mm, yyyy, HH = '00', MM = '00', SS = '00'] = m;
            const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(HH), Number(MM), Number(SS));
            return isNaN(d) ? null : d;
        }

        function formatProtocolDate(raw) {
            const d = parseProtocolDate(raw);
            if (!d) return {date: '-', day: '-', time: '-', combined: '-'};
            const tz = 'Europe/Athens';
            const date = new Intl.DateTimeFormat('el-GR', {
                timeZone: tz,
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(d); // dd/mm/yyyy
            const day = new Intl.DateTimeFormat('el-GR', {timeZone: tz, weekday: 'long'}).format(d); // Greek weekday (default casing)
            const time = new Intl.DateTimeFormat('el-GR', {
                timeZone: tz,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(d); // 24h HH:MM
            const combined = `${date} (${day}) ${time}`;
            return {date, day, time, combined};
        }

        const dateParts = formatProtocolDate(responseProtocol.protocolDate);

        res.render("protocol_details", {
            pageTitle: "Πρακτικό Εξέτασης",
            protocol: responseProtocol,
            protocolFormattedDate: dateParts.date,
            protocolDay: dateParts.day,
            protocolTime: dateParts.time,
            protocolCombined: dateParts.combined
        });
    } catch (err) {
        console.error("Error loading assignment details:", err);
        res.status(500).send("Error loading assignment details");
    }
});

app.get("/invitations", async (req, res) => {
    try {
        const invitationsListRaw = await fs.readFile(path.join(__dirname, "data", "sampleInvitations.json"), "utf-8");
        const thesesListRaw = await fs.readFile(path.join(__dirname, "data", "sampleTheses.json"), "utf-8");

        const allInvitations = JSON.parse(invitationsListRaw);
        const allTheses = JSON.parse(thesesListRaw);

        // Map thesis id to thesis data for quick lookup
        const thesesMap = new Map();
        allTheses.forEach(thesis => {
            thesesMap.set(thesis.id, thesis);
        });

        // Filter invitations for the connected professor
        const professorInvitations = allInvitations.filter((inv) => inv.professor.id === res.locals.connectedUserId);

        // Sort invitations: pending first, then by newest createdAt
        const responseInvitations = professorInvitations
            .map(invitation => {
                const thesisData = thesesMap.get(Number(invitation.thesisID));
                return {
                    ...invitation,
                    thesis: thesisData || null
                };
            })
            .sort((a, b) => {
                // Pending first
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (a.status !== 'pending' && b.status === 'pending') return 1;
                // Then by date (newest first)
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

        res.render("invitations", {
            pageTitle: "Προσκλήσεις",
            currentPage: "invitations",
            invitationsList: responseInvitations,
        });

    } catch (err) {
        console.error("Error loading invitations or topics:", err);
        return res.status(500).send("Error loading invitations");
    }
});


app.get("/stats", (req, res) => {
    res.render("maintenance", {
        pageTitle: "Στατιστικά",
        userRole: "professor",
        currentPage: "stats",
    });
});

app.get("/announcements", async (req, res) => {
    try {
        // Minimal render; client will fetch page 1 via API
        res.render("announcements", {
            pageTitle: "Ανακοινώσεις",
            userRole: "professor",
            currentPage: "announcements"
        });
    } catch (e) {
        console.error('Error rendering announcements page', e);
        res.status(500).send('Error rendering announcements page');
    }
});


app.get("/thesis", async (req, res) => {
    try {
        const usersData = await fs.readFile(
            path.join(__dirname, "data", "sampleUsers.json"),
            "utf-8"
        );
        const allUsers = JSON.parse(usersData);
        const currentUser = allUsers.find(user => user.userId === res.locals.connectedUserId);

        let requestedThesisId = null;
        if (!currentUser) {
            return res.status(404).send("User not found");
        } else {
            if (currentUser.hasThesis) {
                requestedThesisId = currentUser.thesisId;
            }
        }

        const thesesData = await fs.readFile(
            path.join(__dirname, "data", "sampleTheses.json"),
            "utf-8"
        );
        const allTheses = JSON.parse(thesesData);

        const responseThesis = allTheses.find((thesisItem) => thesisItem.id == requestedThesisId);
        if (!responseThesis) {
            return res.status(404).send("Topic not found");
        }


        res.render("assignment", {
            pageTitle: responseThesis.title,
            currentPage: "thesis",
            userThesisRole: res.locals.connectedUserRole,
            thesis: responseThesis
        });
    } catch (err) {
        console.error("Error loading assignment details:", err);
        res.status(500).send("Error loading assignment details");
    }

});


app.get("/users", (req, res) => {
    res.render("maintenance", {
        pageTitle: "Χρήστες",
        userRole: "secretary",
        currentPage: "users",
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

app.get("/announcements", async (req, res) => {
    try {
        res.render("announcements", {
            pageTitle: "Ανακοινώσεις",
            userRole: res.locals.connectedUserRole || null,
            currentPage: "announcements"
        });
    } catch (e) {
        console.error('Error rendering announcements page', e);
        res.status(500).send('Error rendering announcements page');
    }
});

app.get("/api/students/available", async (req, res) => {

    //NEED AUTHENTICATION CHECK HERE

    try {
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

        return res.json({success: true, students: mapped});
    } catch (e) {
        console.error('Error fetching available students', e);
        return res.status(500).json({success: false, error: 'Failed to load students'});
    }
});

async function getPaginatedAnnouncements(req) {
    const data = await fs.readFile(path.join(__dirname, "data", "sampleAnnouncements.json"), 'utf-8');
    const allAnnouncementsRaw = JSON.parse(data);
    const allAnnouncements = allAnnouncementsRaw.sort((a, b) => {
        const da = new Date(a.createdDate || a.presentationDateTime || 0);
        const db = new Date(b.createdDate || b.presentationDateTime || 0);
        return db - da; // descending
    });

    const pageSize = 5;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const totalPages = Math.max(1, Math.ceil(allAnnouncements.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageItems = allAnnouncements.slice(start, start + pageSize);
    return {
        allAnnouncements,
        pageItems,
        totalPages,
        currentPage: safePage,
        pageSize,
        totalCount: allAnnouncements.length
    };
}

app.get('/api/announcements', async (req, res) => {
    try {
        const {pageItems, totalPages, currentPage, totalCount, pageSize} = await getPaginatedAnnouncements(req);
        res.json({
            success: true,
            announcements: pageItems,
            pagination: {totalPages, currentPage, totalCount, pageSize}
        });
    } catch (e) {
        console.error('Error loading announcements JSON', e);
        res.status(500).json({success: false, error: 'Failed to load announcements'});
    }
});

app.get('/api/thesis/:id/invitations', async (req, res) => {
    //NEED AUTHENTICATION CHECK HERE and AUTHORIZATION CHECK

    try {
        const thesisId = req.params.id;
        const invitationsRaw = await fs.readFile(path.join(__dirname, 'data', 'sampleInvitations.json'), 'utf-8');
        const invitations = JSON.parse(invitationsRaw).filter(inv => String(inv.thesisID) === String(thesisId));

        if (!invitations.length) {
            return res.json({success: true, pending: [], completed: []});
        }
        const pending = invitations.filter(inv => inv.status === 'pending')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const completed = invitations.filter(inv => inv.status !== 'pending')
            .sort((a, b) => (a.professor.fullName || '').localeCompare(b.professor.fullName || '', 'el', {sensitivity: 'base'}));
        return res.json({success: true, pending, completed});
    } catch (e) {
        console.error('Error loading thesis invitations', e);
        return res.status(500).json({success: false, error: 'Failed to load invitations'});
    }
});

app.get('/api/thesis/:id/notes', async (req, res) => {
    //NEED AUTHENTICATION CHECK HERE and AUTHORIZATION CHECK

    try {
        const thesisId = req.params.id;
        const notesRaw = await fs.readFile(path.join(__dirname, 'data', 'notesSamples.json'), 'utf-8');
        const allNotes = JSON.parse(notesRaw);
        // Match note.topicId to thesisId (dataset uses topicId key)
        const notes = allNotes
            .filter(n => String(n.topicId) === String(thesisId) && n.userId === res.locals.connectedUserId)
            .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
        return res.json({success: true, notes});
    } catch (e) {
        console.error('Error fetching notes', e);
        return res.status(500).json({success: false, error: 'Failed to load notes'});
    }
});

app.get('/api/thesis/:id/meetings', async (req, res) => {
    //NEED AUTHENTICATION CHECK HERE and AUTHORIZATION CHECK

    try {
        const thesisId = req.params.id;
        const meetingsRaw = await fs.readFile(path.join(__dirname, 'data', 'sampleMeetings.json'), 'utf-8');
        const allMeetings = JSON.parse(meetingsRaw);
        // Filter by thesis and sort newest first
        const meetings = allMeetings
            .filter(m => String(m.thesisId) === String(thesisId))
            .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
        return res.json({success: true, meetings});
    } catch (e) {
        console.error('Error fetching meetings', e);
        return res.status(500).json({success: false, error: 'Failed to load meetings'});
    }
});

app.get('/api/thesis/:id/evaluation', async (req, res) => {
    //NEED AUTHENTICATION CHECK HERE and AUTHORIZATION CHECK


    try {
        const thesisId = req.params.id;
        const evalRaw = await fs.readFile(path.join(__dirname, 'data', 'sampleEvaluation.json'), 'utf-8');
        const evaluations = JSON.parse(evalRaw);
        const entry = evaluations.find(e => String(e.thesisId) === String(thesisId));
        if (!entry) {
            return res.json({
                success: true,
                evaluation: {
                    supervisor: {quality: null, duration: null, report: null, presentation: null},
                    memberA: {quality: null, duration: null, report: null, presentation: null},
                    memberB: {quality: null, duration: null, report: null, presentation: null}
                },
                exists: false
            });
        }
        const evaluation = {
            supervisor: entry.supervisorId || {quality: null, duration: null, report: null, presentation: null},
            memberA: entry.memberA || {quality: null, duration: null, report: null, presentation: null},
            memberB: entry.memberB || {quality: null, duration: null, report: null, presentation: null}
        };
        return res.json({success: true, evaluation, exists: true});
    } catch (e) {
        console.error('Error fetching evaluation', e);
        return res.status(500).json({success: false, error: 'Failed to load evaluation'});
    }
});

// New: protocol API
app.get('/api/thesis/:id/protocol', async (req, res) => {
    //NEED AUTHENTICATION CHECK HERE and AUTHORIZATION CHECK


    try {
        const thesisId = req.params.id;
        const evalRaw = await fs.readFile(path.join(__dirname, 'data', 'sampleEvaluation.json'), 'utf-8');
        const evaluations = JSON.parse(evalRaw);
        const entry = evaluations.find(e => String(e.thesisId) === String(thesisId));
        if (!entry) {
            return res.json({success: true, exists: false});
        }

        function parseProtocolDate(raw) {
            if (!raw || typeof raw !== 'string') return null;
            if (raw.includes('T')) { // ISO
                const d = new Date(raw);
                return isNaN(d) ? null : d;
            }
            const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
            if (!m) return null;
            const [, dd, mm, yyyy, HH = '00', MM = '00', SS = '00'] = m;
            const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(HH), Number(MM), Number(SS));
            return isNaN(d) ? null : d;
        }

        const tz = 'Europe/Athens';
        let protocolDateLocal = null, protocolDayLocal = null, protocolTimeLocal = null, protocolDateCombined = null;
        const parsed = parseProtocolDate(entry.protocolDate);
        if (parsed) {
            protocolDateLocal = new Intl.DateTimeFormat('el-GR', {
                timeZone: tz,
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(parsed);
            protocolDayLocal = new Intl.DateTimeFormat('el-GR', {timeZone: tz, weekday: 'long'}).format(parsed);
            protocolTimeLocal = new Intl.DateTimeFormat('el-GR', {
                timeZone: tz,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(parsed);
            protocolDateCombined = `${protocolDateLocal} (${protocolDayLocal}) ${protocolTimeLocal}`;
        }
        // Support new nested member objects
        const membersObject = entry.members && typeof entry.members === 'object' ? entry.members : {};
        const derivedMembers = [];
        ['supervisor', 'memberA', 'memberB'].forEach(key => {
            const m = membersObject[key];
            if (m && m.fullName) {
                derivedMembers.push({
                    name: m.fullName,
                    role: key === 'supervisor' ? 'Επιβλέπων' : 'Μέλος',
                    typeProfessor: m.typeProfessor || null,
                    key
                });
            }
        });
        derivedMembers.sort((a, b) => a.name.localeCompare(b.name, 'el', {sensitivity: 'base'}));
        const protocol = {
            thesisTitle: entry.thesisTitle || '-',
            studentName: entry.student?.fullName || '-',
            studentIdNumber: entry.student?.idNumber || '-',
            student: entry.student || null,
            protocolDate: entry.protocolDate || null,
            protocolPlace: entry.protocolPlace || '-',
            membersObject, // raw nested object
            members: derivedMembers, // sorted array for client
            protocolNumberAssignment: entry.protocolNumberAssignment || '-',
            suggestedGrade: entry.suggestedGrade || null,
            finalGrade: entry.finalGrade || null,
            protocolDateLocal,
            protocolDayLocal,
            protocolTimeLocal,
            protocolDateCombined
        };
        return res.json({success: true, exists: true, protocol});
    } catch (e) {
        console.error('Error fetching protocol', e);
        return res.status(500).json({success: false, error: 'Failed to load protocol'});
    }
});


app.get('/api/professors/available/:existingProfessors', async (req, res) => {
    //NEED AUTHENTICATION CHECK HERE and AUTHORIZATION CHECK


    try {
        const rawQuery = req.query.professorNameSearch;
        const userInput = rawQuery ? rawQuery.toLowerCase().trim() : '';
        let professorsJSON = {};
        professorsJSON = JSON.parse(req.params.existingProfessors);

        const usersData = await fs.readFile(path.join(__dirname, 'data', 'sampleUsers.json'), 'utf-8');
        const allUsers = JSON.parse(usersData);
        let availableProfessors = allUsers.filter(u => u.role === 'professor' && !professorsJSON.includes(u.userId));

        // Optional name search (case-insensitive substring on full name)
        if (userInput) {
            availableProfessors = availableProfessors.filter(u => (`${u.firstName} ${u.lastName}`).toLowerCase().includes(userInput));
        }

        // Map to lightweight response objects
        const mappedProfessors = availableProfessors.map(prof => ({
            userId: prof.userId,
            fullName: `${prof.firstName} ${prof.lastName}`
        }));

        return res.json({success: true, professors: mappedProfessors});
    } catch (e) {
        console.error('Error fetching available professors', e);
        return res.status(500).json({success: false, error: 'Failed to load professors'});
    }
});

app.get('/api/dashboard/:professorId', async (req, res) => {
    //NEED AUTHENTICATION CHECK HERE and AUTHORIZATION CHECK
    try {
        const professorId = req.params.professorId;

        const topicsData = await fs.readFile(path.join(__dirname, 'data', 'sampleTopics.json'), 'utf-8');
        const allTopics = JSON.parse(topicsData);
        const thesesData = await fs.readFile(path.join(__dirname, 'data', 'sampleTheses.json'), 'utf-8');
        const allTheses = JSON.parse(thesesData);
        const invitationsData = await fs.readFile(path.join(__dirname, 'data', 'sampleInvitations.json'), 'utf-8');
        const allInvitations = JSON.parse(invitationsData);

        // Calculate statistics
        const totalThesesSupervising = allTheses.filter(thesis => thesis.professors.supervisor.id === professorId).length;
        const totalThesesMember = allTheses.filter(thesis => thesis.professors.memberA.id === professorId || thesis.professors.memberB.id === professorId).length;

        const totalTheses = totalThesesMember + totalThesesSupervising;
        const totalPendingInvitations = allInvitations.filter(inv => inv.professor.id === professorId && inv.status === 'pending').length;
        const totalAvailableTopics = allTopics.filter(topic => topic.createdBy === professorId).length;

        const stats = {
            totalThesesSupervising,
            totalTheses,
            totalPendingInvitations,
            totalAvailableTopics
        };
        return res.json(stats);
    } catch (e) {
        console.error('Error fetching dashboard stats', e);
        return res.status(500).json({error: 'Failed to load dashboard stats'});
    }

});