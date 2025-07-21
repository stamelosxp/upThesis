const path = require("path");

const express = require("express");

const app = express();

app.listen(3000, () => {
  console.log("Server is running on port 3000!");
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));


app.use(async function (req, res, next) {
    //set default user role for development
    res.userRole = "professor"; // Change to "professor" for professor role
    next();
});

app.get("/", (req, res) => {
    if (res.userRole === "professor") {
        return res.redirect("/professor");
    }
    else if (res.userRole === "student") {
        return res.redirect("/student");
    }
    else if (res.userRole === "secretary") {
        return res.redirect("/secretary");
    }
    else {
        return res.redirect("/login");
    }
});


app.get("/professor", (req, res) => {
  res.render("home", { pageTitle: "Home", userRole: "professor", currentPage: "home", pageContent: "Αρχική Σελίδα", notification: true });
});

app.get("/professor/topics", (req, res) => {
  // Sample topics data for development
  const sampleTopics = [
    {
      id: 1,
      title: "Τεχνικές μηχανικής μάθησης σε IoT",
      description: "Αυτή η εργασία εξετάζει τις τεχνικές μηχανικής μάθησης που χρησιμοποιούνται σε συστήματα IoT για την ανάλυση δεδομένων και τη βελτιστοποίηση της απόδοσης.",
      creationDate: "01/01/2026"
    },
    {
      id: 2,
      title: "Ανάπτυξη Web Εφαρμογών με Node.js",
      description: "Μελέτη και υλοποίηση σύγχρονων web εφαρμογών χρησιμοποιώντας Node.js και Express framework.",
      creationDate: "15/12/2025"
    },
    {
      id: 3,
      title: "Αλγόριθμοι κρυπτογραφίας σε blockchain",
      description: "Ανάλυση και σύγκριση διαφορετικών αλγορίθμων κρυπτογραφίας που χρησιμοποιούνται σε τεχνολογίες blockchain.",
      creationDate: "10/12/2025"
    },
    {
      id: 4,
      title: "Τεχνητή νοημοσύνη στην ιατρική διάγνωση",
      description: "Εφαρμογή αλγορίθμων μηχανικής μάθησης για την αυτόματη διάγνωση ιατρικών παθήσεων από ιατρικές εικόνες.",
      creationDate: "05/12/2025"
    },
    {
      id: 5,
      title: "Κυβερνασφάλεια σε έξυπνα δίκτυα",
      description: "Μελέτη των κυβερνοαπειλών και ανάπτυξη μηχανισμών προστασίας για έξυπνα ηλεκτρικά δίκτυα.",
      creationDate: "28/11/2025"
    },
    {
      id: 6,
      title: "Ρομποτική και αυτόνομα συστήματα",
      description: "Σχεδιασμός και υλοποίηση αλγορίθμων πλοήγησης για αυτόνομα ρομποτικά συστήματα.",
      creationDate: "20/11/2025"
    },
    {
      id: 7,
      title: "Επεξεργασία φυσικής γλώσσας",
      description: "Ανάπτυξη συστημάτων κατανόησης και παραγωγής φυσικής γλώσσας με χρήση deep learning.",
      creationDate: "15/11/2025"
    },
    {
      id: 8,
      title: "Αρχιτεκτονική μικροϋπηρεσιών",
      description: "Σχεδιασμός και υλοποίηση εφαρμογών με αρχιτεκτονική μικροϋπηρεσιών και containerization.",
      creationDate: "08/11/2025"
    },
    {
      id: 9,
      title: "Ανάλυση Big Data με Apache Spark",
      description: "Τεχνικές επεξεργασίας και ανάλυσης μεγάλων όγκων δεδομένων χρησιμοποιώντας το framework Apache Spark.",
      creationDate: "01/11/2025"
    },
    {
      id: 10,
      title: "Εικονική και επαυξημένη πραγματικότητα",
      description: "Ανάπτυξη εφαρμογών VR/AR για εκπαιδευτικούς και ψυχαγωγικούς σκοπούς.",
      creationDate: "25/10/2025"
    },
    {
      id: 11,
      title: "Κβαντική πληροφορική",
      description: "Μελέτη αλγορίθμων κβαντικής πληροφορικής και των εφαρμογών τους στην κρυπτογραφία.",
      creationDate: "18/10/2025"
    },
    {
      id: 12,
      title: "Αισθητήρες και IoT συστήματα",
      description: "Σχεδιασμός δικτύων αισθητήρων για παρακολούθηση περιβάλλοντος και έξυπνες πόλεις.",
      creationDate: "12/10/2025"
    },
    {
      id: 13,
      title: "Παράλληλος προγραμματισμός σε GPU",
      description: "Βελτιστοποίηση αλγορίθμων για εκτέλεση σε GPU με χρήση CUDA και OpenCL.",
      creationDate: "05/10/2025"
    },
    {
      id: 14,
      title: "Συστήματα συστάσεων",
      description: "Ανάπτυξη αλγορίθμων για συστήματα συστάσεων προϊόντων και περιεχομένου.",
      creationDate: "28/09/2025"
    },
    {
      id: 15,
      title: "Δίκτυα και πρωτόκολλα 5G",
      description: "Μελέτη και υλοποίηση πρωτοκόλλων επικοινωνίας για δίκτυα πέμπτης γενιάς.",
      creationDate: "21/09/2025"
    },
    {
      id: 16,
      title: "Βιοπληροφορική και γονιδιωματική",
      description: "Εφαρμογή υπολογιστικών μεθόδων για ανάλυση γενετικών δεδομένων και πρωτεϊνών.",
      creationDate: "14/09/2025"
    },
    {
      id: 17,
      title: "Αυτόματος έλεγχος και συστήματα",
      description: "Σχεδιασμός ελεγκτών για αυτόματα συστήματα ελέγχου σε βιομηχανικές εφαρμογές.",
      creationDate: "07/09/2025"
    },
    {
      id: 18,
      title: "Ψηφιακή επεξεργασία σημάτων",
      description: "Αλγόριθμοι φιλτραρίσματος και ανάλυσης ψηφιακών σημάτων για τηλεπικοινωνίες.",
      creationDate: "31/08/2025"
    },
    {
      id: 19,
      title: "Διανεμημένα συστήματα και cloud",
      description: "Αρχιτεκτονική και υλοποίηση διανεμημένων εφαρμογών σε υπολογιστικό νέφος.",
      creationDate: "24/08/2025"
    },
    {
      id: 20,
      title: "Επεξεργασία εικόνας και όρασης",
      description: "Τεχνικές επεξεργασίας εικόνας και αλγόριθμοι υπολογιστικής όρασης για αναγνώριση αντικειμένων.",
      creationDate: "17/08/2025"
    }
  ];
  
  res.render("available_topics", { 
    pageTitle: "Θέματα", 
    userRole: "professor", 
    currentPage: "topics", 
    topics: sampleTopics 
  });
});

// Route to serve new topic template
app.get("/professor/topics/new-topic-template", (req, res) => {
  res.render("includes/new_topic", {}, (err, html) => {
    if (err) {
      return res.status(500).json({ error: "Template rendering failed" });
    }
    res.json({ html: html });
  });
});

app.get("/professor/assignments", (req, res) => {
  res.render("maintenance", { pageTitle: "Εργασίες", userRole: "professor", currentPage: "assignments" });
});

app.get("/professor/invitations", (req, res) => {
  res.render("maintenance", { pageTitle: "Προσκλήσεις", userRole: "professor", currentPage: "invitations" });
});

app.get("/professor/stats", (req, res) => {
  res.render("maintenance", { pageTitle: "Στατιστικά", userRole: "professor", currentPage: "stats" });
});

app.get("/professor/announcements", (req, res) => {
  res.render("maintenance", { pageTitle: "Ανακοινώσεις", userRole: "professor", currentPage: "announcements" });
});


// Student routes
app.get("/student", (req, res) => {
  res.render("maintenance", { pageTitle: "Home", userRole: "student", currentPage: "home" });
});

app.get("/student/topics", (req, res) => {
  res.render("maintenance", { pageTitle: "Θέματα", userRole: "student", currentPage: "topics" });
});

app.get("/student/thesis", (req, res) => {
  res.render("maintenance", { pageTitle: "Διπλωματική", userRole: "student", currentPage: "thesis" });
});

app.get("/student/announcements", (req, res) => {
  res.render("maintenance", { pageTitle: "Ανακοινώσεις", userRole: "student", currentPage: "announcements" });
});


// Secretary routes
app.get("/secretary", (req, res) => {
  res.render("maintenance", { pageTitle: "Home", userRole: "secretary", currentPage: "home" });
});

app.get("/secretary/users", (req, res) => {
  res.render("maintenance", { pageTitle: "Χρήστες", userRole: "secretary", currentPage: "users" });
});

app.get("/secretary/announcements", (req, res) => {
  res.render("maintenance", { pageTitle: "Ανακοινώσεις", userRole: "secretary", currentPage: "announcements" });
});



// General routes (accessible by all roles)
app.get("/login", (req, res) => {
  res.render("maintenance", { pageTitle: "Είσοδος", userRole: null, currentPage: "login" });
});

app.get("/announcements", (req, res) => {
  res.render("maintenance", { pageTitle: "Ανακοινώσεις", userRole: null, currentPage: "announcements" });
});



