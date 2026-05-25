const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
require("dotenv").config();
require("./config/passport");
const app = express();
const session = require("express-session");
const passport = require("passport");

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ── Global middleware ─────────────────────────────────────────────
app.use(cors({
  origin: "https://blog-sync-frontnd.vercel.app", 
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Root Route (Fixes the 404 on your live home URL) ──────────────
app.get("/", (req, res) => {
  res.json({ 
    message: "BlogSync Backend API is running successfully!",
    database: mongoose.connection.readyState === 1 ? "connected" : "connecting"
  });
});

// ── API routes ────────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/blogs",    require("./routes/blog"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/upload",   require("./routes/upload"));
app.use("/api/users",    require("./routes/users"));

// ── Health check ──────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mongo:  mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: process.uptime().toFixed(1) + "s",
    env:    process.env.NODE_ENV || "development",
  });
});

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found.` });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({ message: err.message || "Internal server error." });
});

// ── Serverless-Safe MongoDB Connection ────────────────────────────
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    const db = await mongoose.connect(process.env.MONGO_URI);
    isConnected = db.connections[0].readyState === 1;
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
};

// Middleware to ensure DB connection is alive before routing requests on Vercel
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Local Development Server Listener
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(`🚀 Server running → http://localhost:${PORT}`)
  );
}

module.exports = app;