const fs = require("fs").promises;
const path = require("path");
const express = require("express");

const {topicUpload, profileImageUpload} = require("./config/multer");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));

app.use("/data", express.static("data"));
app.use("/profile_data_img", express.static("profile_data_img"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.use(async (req, res, next) => {
    try {
        // Detect which port the request came from
        const port = req.socket.localPort;

        // Default to guest
        let role = "guest";
        let userId = null;

        if (port === 3001) {
            role = "professor";
            userId = "prof_001";
        } else if (port === 3002) {
            role = "student";
            userId = "stu_001";
        } else if (port === 3003) {
            role = "secretary";
            userId = "sec_001";
        } else if (port === 3000) {
            role = null;
            userId = null; // guest has no ID
        }

        res.locals.connectedUserRole = role;
        res.locals.isAuth = ["professor", "student", "secretary"].includes(role);
        res.locals.connectedUserId = userId;

        if (userId) {
            // Load sample users and attach current user details
            const usersRaw = await fs.readFile(
                path.join(__dirname, "data", "sampleUsers.json"),
                "utf-8"
            );
            const allUsers = JSON.parse(usersRaw);
            const currentUser = allUsers.find((user) => user.userId === userId);

            if (currentUser) {
                res.locals.connectedUserPhoto = currentUser.profilePhoto;
                res.locals.connectedUserUsername = currentUser.username;
            }
        } else {
            // Guest defaults
            res.locals.connectedUserPhoto = null;
            res.locals.connectedUserUsername = "Guest";
        }

        next();
    } catch (err) {
        next(err);
    }
});

app.get("/", (req, res) => {
    if (res.locals.connectedUserRole) {
        return res.redirect("/home");
    } else {
        return res.redirect("/login");
    }
});

app.get("/profile", async (req, res) => {

    try {

        const userRaw = await fs.readFile(path.join(__dirname, "data", "sampleUsers.json"), "utf-8");
        const allUsers = JSON.parse(userRaw);
        const currentUser = allUsers.find(user => user.userId === res.locals.connectedUserId);

        if (!currentUser) {
            return res.status(404).send("User not found");
        }


        res.render("profile", {
            pageTitle: "Προφίλ Χρήστη", currentPage: "profile", user: currentUser,
        });
    } catch (err) {
        res.status(500).send("Error loading profile");
    }

});

app.get("/home", (req, res) => {
    res.render("home", {
        pageTitle: "Αρχική Σελίδα", currentPage: "home",
    });
});

app.get("/topics", async (req, res) => {
    try {
        const data = await fs.readFile(path.join(__dirname, "data", "sampleTopics.json"), "utf-8");
        const allTopics = JSON.parse(data);
        let responseTopics;

        if (res.locals.connectedUserRole === "professor") {
            responseTopics = allTopics.filter((topic) => topic.createdBy === res.locals.connectedUserId);
        } else if (res.locals.connectedUserRole === "student") {
            responseTopics = allTopics;

        }
        responseTopics.sort((a, b) => {
            a = a.title || '';
            b = b.title || '';
            return a.localeCompare(b, 'el', {sensitivity: 'base'});
        });
        res.render("topics", {
            pageTitle: "Διαθέσιμα Θέματα", currentPage: "topics", topics: responseTopics,
        });
    } catch (err) {
        res.status(500).send("Error loading topics");
    }
});

app.get("/assignments", async (req, res) => {
    try {
        const data = await fs.readFile(path.join(__dirname, "data", "sampleTheses.json"), "utf-8");
        const allTheses = JSON.parse(data);

        let responseTheses;

        if (res.locals.connectedUserRole === "secretary") {
            responseTheses = allTheses.filter((thesisItem) => thesisItem.status !== 'completed' && thesisItem.status !== 'cancelled');
        } else if (res.locals.connectedUserRole === "professor") {
            responseTheses = allTheses.filter((thesisItem) => thesisItem.professors.supervisor.id === res.locals.connectedUserId || thesisItem.professors.memberA.id === res.locals.connectedUserId || thesisItem.professors.memberB.id === res.locals.connectedUserId);
        }

        responseTheses = responseTheses.sort((a, b) => a.title.localeCompare(b.title, 'el', {sensitivity: 'base'}));

        res.render("assignments", {
            pageTitle: "Αναθέσεις", currentPage: "assignments", theses: responseTheses,
        });
    } catch (err) {
        res.status(500).send("Error loading assignments");
    }
});

app.get("/assignment/:id", async (req, res) => {
    try {
        const requestedThesisId = req.params.id;
        const thesesData = await fs.readFile(path.join(__dirname, "data", "sampleTheses.json"), "utf-8");
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
        const evaluationData = await fs.readFile(path.join(__dirname, "data", "sampleEvaluation.json"), "utf-8");
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
                timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric'
            }).format(d); // dd/mm/yyyy
            const day = new Intl.DateTimeFormat('el-GR', {timeZone: tz, weekday: 'long'}).format(d); // Greek weekday (default casing)
            const time = new Intl.DateTimeFormat('el-GR', {
                timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
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
                    ...invitation, thesis: thesisData || null
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
            pageTitle: "Προσκλήσεις", currentPage: "invitations", invitationsList: responseInvitations,
        });

    } catch (err) {
        console.error("Error loading invitations or topics:", err);
        return res.status(500).send("Error loading invitations");
    }
});


app.get("/stats", (req, res) => {
    res.render("stats", {
        pageTitle: "Στατιστικά", currentPage: "stats",
    });
});

app.get("/announcements", async (req, res) => {
    try {
        // Minimal render; client will fetch page 1 via API
        res.render("announcements", {
            pageTitle: "Ανακοινώσεις", userRole: "professor", currentPage: "announcements"
        });
    } catch (e) {
        console.error('Error rendering announcements page', e);
        res.status(500).send('Error rendering announcements page');
    }
});


app.get("/thesis", async (req, res) => {
    try {
        const usersData = await fs.readFile(path.join(__dirname, "data", "sampleUsers.json"), "utf-8");
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

        const thesesData = await fs.readFile(path.join(__dirname, "data", "sampleTheses.json"), "utf-8");
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


app.get("/users", async (req, res) => {
    try {
        const usersData = await fs.readFile(path.join(__dirname, "data", "sampleUsers.json"), "utf-8");
        const allUsers = JSON.parse(usersData);

        allUsers.sort((a, b) => {
            a = a.lastName || '';
            b = b.lastName || '';
            return a.localeCompare(b, 'el', {sensitivity: 'base'});
        });

        res.render("users", {
            pageTitle: "Χρήστες", currentPage: "users", usersList: allUsers,
        });


    } catch (error) {
        console.error("Error loading users:", error);
        res.status(500).send("Error loading users");

    }
});

app.get("/user/:username", async (req, res) => {
    try {
        const usersData = await fs.readFile(path.join(__dirname, "data", "sampleUsers.json"), "utf-8");
        const allUsers = JSON.parse(usersData);

        if (!req.params.username) {
            return res.status(400).send("Username parameter is required");
        }

        if (req.params.username === 'new_user') {
            return res.render("profile", {
                pageTitle: "Νέος Χρήστης", currentPage: "new_user", user: null
            });
        }
        const responseUser = allUsers.find((user) => user.username === req.params.username);
        if (!responseUser) {
            return res.status(404).send("User not found");
        }
        res.render("profile", {
            pageTitle: `${responseUser.firstName} ${responseUser.lastName}`,
            currentPage: "user_details",
            user: responseUser
        });

    } catch (err) {
        console.error("Error loading user details:", err);
        res.status(500).send("Error loading user details");
    }
})

// General routes (accessible by all roles)
app.get("/login", (req, res) => {
    res.render("maintenance", {
        pageTitle: "Είσοδος", userRole: null, currentPage: "login",
    });
});

app.get("/announcements", async (req, res) => {
    try {
        res.render("announcements", {
            pageTitle: "Ανακοινώσεις", userRole: res.locals.connectedUserRole || null, currentPage: "announcements"
        });
    } catch (e) {
        console.error('Error rendering announcements page', e);
        res.status(500).send('Error rendering announcements page');
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
        allAnnouncements, pageItems, totalPages, currentPage: safePage, pageSize, totalCount: allAnnouncements.length
    };
}

app.get('/api/announcements', async (req, res) => {
    try {
        const {pageItems, totalPages, currentPage, totalCount, pageSize} = await getPaginatedAnnouncements(req);
        res.json({
            success: true, announcements: pageItems, pagination: {totalPages, currentPage, totalCount, pageSize}
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
                success: true, evaluation: {
                    supervisor: {quality: null, duration: null, report: null, presentation: null},
                    memberA: {quality: null, duration: null, report: null, presentation: null},
                    memberB: {quality: null, duration: null, report: null, presentation: null}
                }, exists: false
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
                timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric'
            }).format(parsed);
            protocolDayLocal = new Intl.DateTimeFormat('el-GR', {timeZone: tz, weekday: 'long'}).format(parsed);
            protocolTimeLocal = new Intl.DateTimeFormat('el-GR', {
                timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
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

// Export theses data API endpoint (POST)
app.post('/api/export-theses', async (req, res) => {
    try {
        const ids = req.body.ids;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({success: false, error: 'No thesis IDs provided.'});
        }
        const data = await fs.readFile(path.join(__dirname, 'data', 'sampleTheses.json'), 'utf-8');
        const allTheses = JSON.parse(data);
        // IDs may be string or number, so normalize for comparison
        const idSet = new Set(ids.map(id => String(id)));
        const filteredTheses = allTheses.filter(thesis => idSet.has(String(thesis.id)));
        return res.json({success: true, theses: filteredTheses});
    } catch (err) {
        console.error('Error exporting theses:', err);
        return res.status(500).json({success: false, error: 'Failed to export theses.'});
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
            userId: prof.userId, fullName: `${prof.firstName} ${prof.lastName}`
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
        const totalThesesSupervising = allTheses.filter(thesis => thesis.professors.supervisor.id === professorId && (thesis.status === 'review' || thesis.status === 'active')).length;

        const totalThesesMember = allTheses.filter(thesis => (thesis.professors.memberA.id === professorId || thesis.professors.memberB.id === professorId) && (thesis.status === 'review' || thesis.status === 'active')).length;

        const totalTheses = totalThesesMember + totalThesesSupervising;
        const totalPendingInvitations = allInvitations.filter(inv => inv.professor.id === professorId && inv.status === 'pending').length;
        const totalAvailableTopics = allTopics.filter(topic => topic.createdBy === professorId).length;

        const stats = {
            totalThesesSupervising, totalTheses, totalPendingInvitations, totalAvailableTopics
        };
        return res.json(stats);
    } catch (e) {
        console.error('Error fetching dashboard stats', e);
        return res.status(500).json({error: 'Failed to load dashboard stats'});
    }

});

function greekStatus(status) {
    switch (status) {
        case 'pending':
            return 'Υπό-Ανάθεση';
        case 'active':
            return 'Ενεργή';
        case 'review':
            return 'Υπό-Εξέταση';
        case 'completed':
            return 'Ολοκληρώθηκε';
        case 'cancelled':
            return 'Ακυρώθηκε';
        default:
            return '';
    }
}

function normalizeGreek(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .normalize('NFD')
        // remove combining diacritical marks
        .replace(/[\u0300-\u036f]/g, '')
        // normalize common Greek tonos/diacritics to base letters
        .replace(/ά/g, 'α')
        .replace(/έ/g, 'ε')
        .replace(/ή/g, 'η')
        .replace(/ί|ϊ|ΐ/g, 'ι')
        .replace(/ό/g, 'ο')
        .replace(/ύ|ϋ|ΰ/g, 'υ')
        .replace(/ώ/g, 'ω')
        // collapse multiple spaces and trim
        .replace(/\s+/g, ' ')
        .trim();
}


app.post('/api/theses/filters', async (req, res) => {
    try {
        const filters = req.body;
        const data = await fs.readFile(path.join(__dirname, 'data', 'sampleTheses.json'), 'utf-8');
        let allTheses = JSON.parse(data);

        // Apply Search
        if (filters.search && filters.search.trim().length > 0) {
            const normSearchTerm = normalizeGreek(filters.search.trim());
            allTheses = allTheses.filter(thesis => normalizeGreek(thesis.title).includes(normSearchTerm) || (thesis.student && normalizeGreek(thesis.student.fullName).includes(normSearchTerm)) || (thesis.student && normalizeGreek(thesis.student.idNumber).includes(normSearchTerm)) || normalizeGreek(thesis.description).includes(normSearchTerm) || (thesis.professors && thesis.professors.supervisor && normalizeGreek(thesis.professors.supervisor.fullName).includes(normSearchTerm)) || normalizeGreek(greekStatus(thesis.status)).includes(normSearchTerm));
        }


        // Apply filters
        if (filters.status && Object.keys(filters.status).length > 0) {
            const statusKeys = Object.keys(filters.status);
            allTheses = allTheses.filter(thesis => statusKeys.includes(thesis.status));
        }

        if (filters.year && Object.keys(filters.year).length > 0) {
            const yearKeys = Object.keys(filters.year).filter(k => k !== 'range');
            // Extract year numbers from keys like 'year-2025' => '2025'
            const yearValues = yearKeys.map(k => k.replace(/^year-/, ''));
            allTheses = allTheses.filter(thesis => {
                // Use assignmentDate year
                const thesisYear = new Date(thesis.assignmentDate).getFullYear();
                // Check exact years if specified
                if (yearValues.includes(String(thesisYear))) {
                    return true;
                }

                // // Check range if specified
                // if (filters.year.range) {
                //     const from = filters.year.range.from || Number.NEGATIVE_INFINITY;
                //     const to = filters.year.range.to || Number.POSITIVE_INFINITY;
                //     return thesisYear >= from && thesisYear <= to;
                // }
                return false;
            });
        }

        if (filters.professorRole && Object.keys(filters.professorRole).length > 0) {
            const roleKeys = Object.keys(filters.professorRole);
            allTheses = allTheses.filter(thesis => {
                const roles = [];

                if (thesis.professors.supervisor && thesis.professors.supervisor.id === res.locals.connectedUserId) {
                    roles.push('supervisor');
                }
                if (thesis.professors.memberA && thesis.professors.memberA.id === res.locals.connectedUserId) {
                    roles.push('member');
                }
                if (thesis.professors.memberB && thesis.professors.memberB.id === res.locals.connectedUserId) {
                    roles.push('member');
                }

                return roles.some(r => roleKeys.includes(r));
            });
        }

        // Sort method
        if (filters.sortBy) {
            if (filters.sortBy === 'title') {
                allTheses.sort((a, b) => a.title.localeCompare(b.title, 'el', {sensitivity: 'base'}));
            } else if (filters.sortBy === 'status') {
                allTheses.sort((a, b) => a.status.localeCompare(b.status, 'el', {sensitivity: 'base'}));
            } else if (filters.sortBy === 'year') {
                allTheses.sort((a, b) => {
                    const ay = new Date(a.creationDate).getFullYear();
                    const by = new Date(b.creationDate).getFullYear();
                    return by - ay; // Descending
                });
            }
        }

        // Map to required fields only
        const mappedTheses = allTheses.map(thesis => {
            let professorRole = null;
            if (res.locals.connectedUserRole === 'professor') {
                if (thesis.professors.supervisor && thesis.professors.supervisor.id === res.locals.connectedUserId) {
                    professorRole = 'supervisor';
                } else if (thesis.professors.memberA && thesis.professors.memberA.id === res.locals.connectedUserId) {
                    professorRole = 'memberA';
                } else if (thesis.professors.memberB && thesis.professors.memberB.id === res.locals.connectedUserId) {
                    professorRole = 'memberB';
                }
            }
            return {
                id: thesis.id, title: thesis.title, status: thesis.status, professorRole: professorRole
            };
        });

        return res.json({success: true, theses: mappedTheses});

    } catch (err) {
        console.error("Filtering error:", err);
        res.status(500).json({success: false, error: 'Failed to filter theses'});
    }
});

app.post('/api/invitations/filters', async (req, res) => {
    try {
        const {status = {}} = req.body;
        const invitationsListRaw = await fs.readFile(path.join(__dirname, "data", "sampleInvitations.json"), "utf-8");
        const thesesListRaw = await fs.readFile(path.join(__dirname, "data", "sampleTheses.json"), "utf-8");
        const allInvitations = JSON.parse(invitationsListRaw);
        const allTheses = JSON.parse(thesesListRaw);

        // Map thesis id to thesis data for quick lookup
        const thesesMap = new Map();
        allTheses.forEach(thesis => {
            thesesMap.set(thesis.id, thesis);
        });

        // Only invitations for the connected professor
        const professorInvitations = allInvitations.filter(inv => inv.professor.id === res.locals.connectedUserId);

        // Filter by status (if any status is checked)
        let filteredInvitations = professorInvitations;
        const statusKeys = Object.keys(status).filter(key => status[key]);
        if (statusKeys.length > 0) {
            filteredInvitations = filteredInvitations.filter(inv => statusKeys.includes(inv.status));
        }

        // Map each invitation to include thesis object
        filteredInvitations = filteredInvitations.map(invitation => {
            const thesisData = thesesMap.get(Number(invitation.thesisID));
            return {
                ...invitation, thesis: thesisData || null
            };
        });

        // Sort: pending first, then by newest createdAt
        filteredInvitations = filteredInvitations.sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.json({invitations: filteredInvitations});
    } catch (err) {
        console.error('Error filtering invitations:', err);
        res.status(500).json({error: 'Error filtering invitations'});
    }
});


app.get('/api/available/username/:username', async (req, res) => {
    try {
        const username = req.params.username;
        if (!username || username.trim().length === 0) {
            return res.status(400).json({success: false, error: 'No username provided.'});
        }
        const usersData = await fs.readFile(path.join(__dirname, 'data', 'sampleUsers.json'), 'utf-8');
        const allUsers = JSON.parse(usersData);
        const exists = allUsers.some(u => u.username.toLowerCase() === username.toLowerCase());
        if (username.toLowerCase() === 'new_user') {
            return res.json({success: true, available: false});
        }
        return res.json({success: true, available: !exists});
    } catch (err) {
        console.error('Error checking username availability:', err);
        return res.status(500).json({success: false, error: 'Failed to check username availability.'});
    }
})


app.get('/api/users', async (req, res) => {
    try {
        const query = req.query.q?.toLowerCase() || '';

        const searchValue = normalizeGreek(query.trim());
        const usersData = await fs.readFile(path.join(__dirname, 'data', 'sampleUsers.json'), 'utf-8');
        const allUsers = JSON.parse(usersData);

        let filteredUsers = allUsers;
        if (query.length > 0) {
            filteredUsers = allUsers.filter(u => (`${normalizeGreek(u.firstName)} ${normalizeGreek(u.lastName)}`).toLowerCase().includes(searchValue) || (u.username && u.username.toLowerCase().includes(searchValue)) || (u.email && u.email.toLowerCase().includes(searchValue)) || (u.studentId && u.studentId.toLowerCase().includes(searchValue)) || (u.mobilePhone && u.mobilePhone.includes(searchValue)) || (u.phone && u.phone.includes(searchValue)));
        }

        // Sort by lastName
        filteredUsers.sort((a, b) => {
            const lastA = a.lastName || '';
            const lastB = b.lastName || '';
            return lastA.localeCompare(lastB, 'el', {sensitivity: 'base'});
        });

        const responseUsers = filteredUsers.map(u => ({
            username: u.username,
            lastName: u.lastName,
            firstName: u.firstName,
            role: u.role,
            profilePhoto: u.profilePhoto
        }));

        return res.json({success: true, users: responseUsers});
    } catch (err) {
        console.error('Error searching users:', err);
        return res.status(500).json({success: false, error: 'Failed to search users.'});
    }
})


app.get("/api/students/available", async (req, res) => {
    try {
        const query = req.query.q?.toLowerCase() || '';

        const searchValue = normalizeGreek(query.trim());
        const usersData = await fs.readFile(path.join(__dirname, 'data', 'sampleUsers.json'), 'utf-8');
        const allUsers = JSON.parse(usersData);
        let filteredUsers = allUsers.filter(u => u.role === 'student' && u.hasThesis === false && Number(u.yearOfStudies) >= 5);

        if (searchValue.length > 0) {
            filteredUsers = filteredUsers.filter(u => (`${normalizeGreek(u.firstName)} ${normalizeGreek(u.lastName)}`).toLowerCase().includes(searchValue) || (u.email && u.email.toLowerCase().includes(searchValue)) || (u.studentId && u.studentId.toLowerCase().includes(searchValue)));
        }

        // Sort by lastName
        filteredUsers.sort((a, b) => {
            const lastA = a.lastName || '';
            const lastB = b.lastName || '';
            return lastA.localeCompare(lastB, 'el', {sensitivity: 'base'});
        });


        const responseStudents = filteredUsers.map(u => ({
            userId: u.userId, fullName: `${u.lastName} ${u.firstName}`
        }));

        return res.json({success: true, students: responseStudents});
    } catch (e) {
        console.error('Error fetching available students', e);
        return res.status(500).json({success: false, error: 'Failed to load students'});
    }
});


app.post('/api/topics/filters', async (req, res) => {
    try {
        const filters = req.body;
        const topicsRaw = await fs.readFile(path.join(__dirname, 'data', 'sampleTopics.json'), 'utf-8');
        let allTopics = JSON.parse(topicsRaw);

        if (res.locals.connectedUserRole === 'professor') {
            allTopics = allTopics.filter(topic => topic.createdBy === res.locals.connectedUserId);
        }

        // Apply Search
        if (filters.search && filters.search.trim().length > 0) {
            const searchTerm = filters.search.trim().toLowerCase();
            allTopics = allTopics.filter(topic =>
                normalizeGreek(topic.title.toLowerCase()).includes(normalizeGreek(searchTerm)) ||
                normalizeGreek(topic.description.toLowerCase()).includes(normalizeGreek(searchTerm)));
        }

        if (filters.sort && filters.sort === 'topic_title') {
            allTopics.sort((a, b) => a.title.localeCompare(b.title, 'el', {sensitivity: 'base'}));
        } else if (filters.sort && filters.sort === 'date_created') {
            allTopics.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));
        }


        res.json({success: true, topics: allTopics});

    } catch (err) {
        console.error('Error filtering topics:', err);
        res.status(500).json({error: 'Error filtering topics'});
    }

})

app.delete('/api/topics/delete/:id', async (req, res) => {
    try {
        const topicId = req.params.id;
        if (!topicId) {
            return res.status(400).json({success: false, error: 'No topic ID provided.'});
        }

        const topicsData = await fs.readFile(path.join(__dirname, 'data', 'sampleTopics.json'), 'utf-8');
        const allTopics = JSON.parse(topicsData);

        const topicIndex = allTopics.findIndex(topic => String(topic.id) === String(topicId));
        if (topicIndex === -1) {
            return res.status(404).json({success: false, error: 'Topic not found.'});
        }

        // Authorization check: only creator can delete
        if (res.locals.connectedUserRole !== 'professor' || allTopics[topicIndex].createdBy !== res.locals.connectedUserId) {
            return res.status(403).json({success: false, error: 'Not authorized to delete this topic.'});
        }

        console.log('Deleting topic: ', allTopics[topicIndex].id);
        const topicTitle = allTopics[topicIndex].title;


        return res.json({success: true, message: 'Το θέμα ' + topicTitle + ' διαγράφηκε επιτυχώς.'});
    } catch (err) {
        console.error('Error deleting topic:', err);
        res.status(500).json({success: false, error: 'Failed to delete topic.'});
    }

});

app.put('/api/topics/update/:id', topicUpload.single('file'), async (req, res) => {
    try {
        const topicId = req.params.id;
        if (!topicId) {
            return res.status(400).json({success: false, error: 'No topic ID provided.'});
        }

        const topicsData = await fs.readFile(path.join(__dirname, 'data', 'sampleTopics.json'), 'utf-8');
        const allTopics = JSON.parse(topicsData);

        const topicIndex = allTopics.findIndex(topic => String(topic.id) === String(topicId));
        if (topicIndex === -1) {
            return res.status(404).json({success: false, error: 'Topic not found.'});
        }

        const topic = allTopics[topicIndex];

        if (res.locals.connectedUserRole !== 'professor' || topic.createdBy !== res.locals.connectedUserId) {
            return res.status(403).json({success: false, error: 'Not authorized to update this topic.'});
        }

        const prevTopicFilePAth = topic.filePath;

        const {title, description, assignment} = req.body;
        if (assignment) {
            console.log('Assign at: ', assignment);
        }
        if (title) topic.title = title;
        if (description) topic.description = description;

        if (req.file) {
            // Case 1: new file uploaded
            if (topic.filePath) {
                const oldFilePath = path.join(__dirname, topic.filePath);
                try {
                    await fs.unlink(oldFilePath);
                    console.log("Deleted old file:", oldFilePath);
                } catch (err) {
                    if (err.code !== "ENOENT") console.error("Error deleting old file:", err);
                }
            }

            topic.filePath = "/uploads/topics/" + req.file.filename;

        } else {
            // Case 2: no new file uploaded, but delete old one if it exists
            if (topic.filePath) {
                const oldFilePath = path.join(__dirname, topic.filePath);
                try {
                    await fs.unlink(oldFilePath);
                    console.log("Deleted old file:", oldFilePath);
                } catch (err) {
                    if (err.code !== "ENOENT") console.error("Error deleting old file:", err);
                }
            }

            topic.filePath = "";
        }


        topic.modificationDate.push(new Date().toISOString());
        // Persist changes
        await fs.writeFile(path.join(__dirname, 'data', 'sampleTopics.json'), JSON.stringify(allTopics, null, 2), 'utf-8');

        return res.json({
            success: true,
            message: `Το θέμα "${topic.title}" ενημερώθηκε επιτυχώς.`,
            topic: topic
        });
    } catch (err) {
        console.error('Error updating topic:', err);
        res.status(500).json({success: false, error: 'Failed to update topic.'});
    }
});

app.post('/api/topics/create', topicUpload.single('file'), async (req, res) => {
    try {
        if (res.locals.connectedUserRole !== 'professor') {
            return res.status(403).json({success: false, error: 'Not authorized to create topics.'});
        }

        const {title, description, assignment} = req.body;
        if (!title || title.trim().length === 0) {
            return res.status(400).json({success: false, error: 'Title is required.'});
        }
        if (!description || description.trim().length === 0) {
            return res.status(400).json({success: false, error: 'Description is required.'});
        }
        if (assignment) {
            console.log('Assign at: ', assignment);
        }

        const topicsData = await fs.readFile(path.join(__dirname, 'data', 'sampleTopics.json'), 'utf-8');
        const allTopics = JSON.parse(topicsData);

        const newTopicId = allTopics.length > 0 ? Math.max(...allTopics.map(t => Number(t.id))) + 1 : 1;
        const newTopic = {
            id: newTopicId,
            title: title.trim(),
            description: description.trim(),
            createdBy: res.locals.connectedUserId,
            creationDate: new Date().toISOString(),
            modificationDate: [],
            filePath: req.file ? "/uploads/topics/" + req.file.filename : "",
        };
        allTopics.push(newTopic);

        await fs.writeFile(path.join(__dirname, 'data', 'sampleTopics.json'), JSON.stringify(allTopics, null, 2), 'utf-8');

        return res.json({
            success: true,
            message: `Το θέμα "${newTopic.title}" δημιουργήθηκε επιτυχώς.`,
            topic: newTopic
        });

    } catch (err) {
        console.error('Error creating topic:', err);
        res.status(500).json({success: false, error: 'Failed to create topic.'});
    }

});


// // Start server
// app.listen(3000, () => {
//     console.log("Server running on http://localhost:3000");
// });

// listen on two ports at once
const ports = [3000, 3001, 3002, 3003];

ports.forEach((port) => {
    app.listen(port, () => {
        console.log(`🚀 Server listening on http://localhost:${port}`);
    });
});