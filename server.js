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
  res.render("home", { pageTitle: "Home", userRole: "professor", currentPage: "home", pageContent: "Αρχική Σελίδα" });
});

app.get("/professor/topics", (req, res) => {
  res.render("home", { pageTitle: "Θέματα", userRole: "professor", currentPage: "topics", pageContent: "Θέματα Διπλωματικών" });
});

app.get("/professor/assignments", (req, res) => {
  res.render("home", { pageTitle: "Εργασίες", userRole: "professor", currentPage: "assignments", pageContent: "Εργασίες" });
});

app.get("/professor/invitations", (req, res) => {
  res.render("home", { pageTitle: "Προσκλήσεις", userRole: "professor", currentPage: "invitations", pageContent: "Προσκλήσεις" });
});

app.get("/professor/stats", (req, res) => {
  res.render("home", { pageTitle: "Στατιστικά", userRole: "professor", currentPage: "stats", pageContent: "Στατιστικά" });
});

app.get("/professor/announcements", (req, res) => {
  res.render("home", { pageTitle: "Ανακοινώσεις", userRole: "professor", currentPage: "announcements", pageContent: "Ανακοινώσεις" });
});

// Student routes
app.get("/student", (req, res) => {
  res.render("home", { pageTitle: "Home", userRole: "student", currentPage: "home", pageContent: "Αρχική Σελίδα" });
});

app.get("/student/topics", (req, res) => {
  res.render("home", { pageTitle: "Θέματα", userRole: "student", currentPage: "topics", pageContent: "Διαθέσιμα Θέματα" });
});

app.get("/student/thesis", (req, res) => {
  res.render("home", { pageTitle: "Διπλωματική", userRole: "student", currentPage: "thesis", pageContent: "Η Διπλωματική μου" });
});

app.get("/student/announcements", (req, res) => {
  res.render("home", { pageTitle: "Ανακοινώσεις", userRole: "student", currentPage: "announcements", pageContent: "Ανακοινώσεις" });
});

// Secretary routes
app.get("/secretary", (req, res) => {
  res.render("home", { pageTitle: "Home", userRole: "secretary", currentPage: "home", pageContent: "Αρχική Σελίδα" });
});

app.get("/secretary/users", (req, res) => {
  res.render("home", { pageTitle: "Χρήστες", userRole: "secretary", currentPage: "users", pageContent: "Διαχείριση Χρηστών" });
});

app.get("/secretary/announcements", (req, res) => {
  res.render("home", { pageTitle: "Ανακοινώσεις", userRole: "secretary", currentPage: "announcements", pageContent: "Ανακοινώσεις" });
});


// General routes (accessible by all roles)
app.get("/login", (req, res) => {
  res.render("home", { pageTitle: "Είσοδος", userRole: null, currentPage: "login", pageContent: "Σύνδεση στο Σύστημα" });
});

app.get("/announcements", (req, res) => {
  res.render("home", { pageTitle: "Ανακοινώσεις", userRole: null, currentPage: "announcements", pageContent: "Ανακοινώσεις" });
});



