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
  res.render("maintenance", { pageTitle: "Θέματα", userRole: "professor", currentPage: "topics" });
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



