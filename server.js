const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");

const connectDB = require("./config/db");

// Import routers
const loginRoutes = require("./routes/loginRoutes");
const pagesRoutes = require("./routes/pagesRoutes");
const userRoutes = require("./routes/usersRoutes");
const topicRoutes = require("./routes/topicsRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const assignmentsRoutes = require("./routes/assignmentsRoutes");
const invitationRoutes = require("./routes/invitationsRoutes");
const notesRoutes = require("./routes/notesRoutes");
const homeRoutes = require("./routes/homeRoutes");
const statsRoutes = require("./routes/statsRoutes");
const profileRoutes = require("./routes/profileRoutes");
const announcementsRoutes = require("./routes/announcementsRoutes");

const { setLocals, requireApiAuth } = require("./middleware/auth");
const {
  formatDate,
  humanAssignmentDuration,
  normalizeUrl,
  greekRole,
} = require("./utils-backend/utils-server");

const app = express();

// Make utility functions available in all EJS templates
app.locals.formatDate = formatDate;
app.locals.humanAssignmentDuration = humanAssignmentDuration;
app.locals.normalizeUrl = normalizeUrl;
app.locals.greekRole = greekRole;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve static files and cache them appropriately
// Icons - cache for a year
app.use(
  "/icons",
  express.static(path.join(__dirname, "public", "icons"), { maxAge: "365d" })
);

// CSS - cache for 30 days
app.use(
  "/styles",
  express.static(path.join(__dirname, "public", "styles"), { maxAge: "30d" })
);

// JS - cache for 10 days
app.use(
  "/scripts",
  express.static(path.join(__dirname, "public", "scripts"), { maxAge: "10d" })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(
  session({
    secret: "supersecret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: "mongodb://127.0.0.1:27017/upThesis",
      ttl: 365 * 24 * 60 * 60, // default max 1 year; overridden per session below
    }),
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60, // default 1 hour; overridden per login
    },
  })
);

// Populate res.locals with user info
app.use(setLocals);

// Flash messages
app.use(flash());
app.use((req, res, next) => {
  res.locals.successMsg = req.flash("success");
  res.locals.errorMsg = req.flash("error");
  next();
});

// Mount routers
app.use("/api/login", loginRoutes);
app.use("/", pagesRoutes);
app.use("/api/users", requireApiAuth, userRoutes);
app.use("/api/topics", requireApiAuth, topicRoutes);
app.use("/api/assignment", requireApiAuth, assignmentRoutes);
app.use("/api/assignments", requireApiAuth, assignmentsRoutes);
app.use("/api/invitations", requireApiAuth, invitationRoutes);
app.use("/api/notes", requireApiAuth, notesRoutes);
app.use("/api/home", requireApiAuth, homeRoutes);
app.use("/api/stats", requireApiAuth, statsRoutes);
app.use("/api/profile", requireApiAuth, profileRoutes);
app.use("/api/announcements", announcementsRoutes);

// 1. Catch 400 - Bad Request
app.use((err, req, res, next) => {
  if (err.status === 400) {
    res.status(400);
    return res.render("errors/400", {
      pageTitle: "Bad Request",
      currentPage: "400",
    });
  }
  next(err); // pass to next error handler
});

// 2. Catch 403 - Forbidden
app.use((err, req, res, next) => {
  if (err.status === 403) {
    res.status(403);
    return res.render("errors/403", {
      pageTitle: "Access Denied",
      currentPage: "403",
    });
  }
  next(err);
});

// 3. Catch 404 - Not Found
// This is not an error, so it goes **after all routes**, without `err` parameter
app.use((req, res, next) => {
  res.status(404);
  res.render("errors/404", {
    pageTitle: "Page Not Found",
    currentPage: "404",
  });
});

// 4. Catch all other errors - 500
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500);
  res.render("errors/500", {
    pageTitle: "Server Error",
    currentPage: "500",
    message: err.message || "Something went wrong!",
  });
});

const port = 3000;
const host = "localhost";

async function startServer() {
  try {
    await connectDB();
    app.listen(port, host, () =>
      console.log(`Listening on http://${host}:${port}`)
    );
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
