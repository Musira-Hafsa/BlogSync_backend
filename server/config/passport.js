const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("../models/User");

// ==========================================
// GOOGLE STRATEGY
// ==========================================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Dynamically swaps the callback URL based on deployment environment
      callbackURL: process.env.NODE_ENV === "production"
        ? "https://blog-sync-backend-two.vercel.app/api/auth/google/callback"
        : "http://localhost:5000/api/auth/google/callback",
      proxy: true // CRITICAL: Allows Passport to trust Vercel's reverse proxy over HTTPS
    },
    async (_, __, profile, done) => {
      try {
        let user = await User.findOne({
          email: profile.emails[0].value,
        });

        if (!user) {
          user = await User.create({
            firstName: profile.name.givenName,
            lastName: profile.name.familyName || "",
            email: profile.emails[0].value,
            handle: profile.emails[0].value.split("@")[0],
            password: Math.random().toString(36),
          });
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

// ==========================================
// GITHUB STRATEGY
// ==========================================
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      // Dynamically swaps the callback URL based on deployment environment
      callbackURL: process.env.NODE_ENV === "production"
        ? "https://blog-sync-backend-two.vercel.app/api/auth/github/callback"
        : "http://localhost:5000/api/auth/github/callback",
      proxy: true // CRITICAL: Allows Passport to trust Vercel's reverse proxy over HTTPS
    },
    async (_, __, profile, done) => {
      try {
        const email =
          profile.emails?.[0]?.value ||
          `${profile.username}@github.com`;

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            firstName:
              profile.displayName || profile.username,
            lastName: "",
            email,
            handle: profile.username,
            password: Math.random().toString(36),
          });
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

// ==========================================
// SESSION SERIALIZATION
// ==========================================
passport.serializeUser((user, done) =>
  done(null, user.id)
);

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;