const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
require("dotenv").config();
const app = express();
const session = require("express-session");
const passport = require("passport");

// Load passport config once
require("./config/passport");

// ── 1. Sessions & Passport ────────────────────────────────────────
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ── 2. Global Request Parsing & CORS ──────────────────────────────
app.use(cors({
  origin: "https://blog-sync-frontnd.vercel.app", 
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── 3. Database Connection Pool & Middleware (MOVED UP) ───────────
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (mongoose.connection.readyState === 2) {
    return mongoose.connection;
  }

  try {
    console.log("🔄 Initiating new MongoDB connection pool...");
    const db = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000, 
    });
    console.log("✅ MongoDB connected successfully");
    return db;
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    throw err; 
  }
};

// Guard middleware - runs BEFORE routes now!
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ 
      message: "Database connection failed. Please try again shortly.",
      error: error.message 
    });
  }
});

// ── 4. Base Routes ────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ 
    message: "BlogSync Backend API is running successfully!",
    database: mongoose.connection.readyState === 1 ? "connected" : "connecting"
  });
});

// ── 5. API routes ─────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/blogs",    require("./routes/blog"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/upload",   require("./routes/upload"));
app.use("/api/users",    require("./routes/users"));

// ── 6. Health check ───────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mongo:  mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: process.uptime().toFixed(1) + "s",
    env:    process.env.NODE_ENV || "development",
  });
});

// ── 7. 404 handler (MUST be right below routes) ───────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found.` });
});

// ── 8. Global error handler (MUST be at the absolute bottom) ──────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({ message: err.message || "Internal server error." });
});

// ── 9. Local Development Listener & Export ────────────────────────
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(`🚀 Server running → http://localhost:${PORT}`)
  );
}

module.exports = app;