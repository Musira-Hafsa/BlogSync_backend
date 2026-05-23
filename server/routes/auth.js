const passport = require("passport");
const router = require("express").Router();
const jwt    = require("jsonwebtoken");
const User   = require("../models/User");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, handle, password } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !handle || !password)
      return res.status(400).json({ message: "All fields are required." });

    // Check for duplicates
    const exists = await User.findOne({ $or: [{ email }, { handle }] });
    if (exists)
      return res.status(400).json({
        message: exists.email === email
          ? "Email already in use."
          : "Handle already taken.",
      });

    const user = await User.create({ firstName, lastName, email, handle, password });

    res.status(201).json({
      token: signToken(user._id),
      user: {
        id:        user._id,
        firstName: user.firstName,
        lastName:  user.lastName,
        handle:    user.handle,
        email:     user.email,
        avatar:    user.avatar,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid email or password." });

    res.json({
      token: signToken(user._id),
      user: {
        id:        user._id,
        firstName: user.firstName,
        lastName:  user.lastName,
        handle:    user.handle,
        email:     user.email,
        avatar:    user.avatar,
      },
    });
 } catch (err) {
    // This will print the actual error to your VS Code / command prompt terminal
    console.error("❌ LOGIN ROUTE ERROR:", err); 
    res.status(500).json({ message: err.message });
  }
});


router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth",
  }),
  (req, res) => {
    const token = signToken(req.user._id);

    res.redirect(
      `http://localhost:5173/auth-success?token=${token}`
    );
  }
);

router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
  })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: "/auth",
  }),
  (req, res) => {
    const token = signToken(req.user._id);

    res.redirect(
      `http://localhost:5173/auth-success?token=${token}`
    );
  }
);

module.exports = router;
