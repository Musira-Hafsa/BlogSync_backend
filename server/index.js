const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
require("dotenv").config();
require("./config/passport");
const app = express();
const session = require("express-session");
const passport = require("passport");

require("./config/passport");

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
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://blog-sync-frontnd.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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

// ── Connect MongoDB then start ────────────────────────────────────
// ── Connect MongoDB ────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅  MongoDB connected");
  })
  .catch((err) => {
    console.error("❌  MongoDB connection failed:", err.message);
    // REMOVE process.exit(1); -> It kills Vercel's cloud container instantly!
  });

// ONLY run app.listen if we are NOT on Vercel
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(`🚀  Server running → http://localhost:${PORT}`)
  );
}

// Keep your export right here
module.exports = app;
