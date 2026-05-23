const router  = require("express").Router();
const jwt     = require("jsonwebtoken");
const User    = require("../models/User");
const protect = require("../middleware/authMiddleware");

// GET /api/users — list all authors
router.get("/", async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -followersList -followingList")
      .lean();

    let followingIds = [];
    if (req.headers.authorization?.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.id) {
          const authUser = await User.findById(decoded.id).select("followingList");
          followingIds = Array.isArray(authUser?.followingList) ? authUser.followingList.map((id) => id.toString()) : [];
        }
      } catch (err) {
        followingIds = [];
      }
    }

    const response = users.map((user) => ({
      ...user,
      followers: user.followers || 0,
      following: user.following || 0,
      isFollowing: followingIds.includes(user._id.toString()),
    }));

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/:handle  — public profile
router.get("/:handle", async (req, res) => {
  try {
    const user = await User.findOne({ handle: req.params.handle })
      .select("-password -followersList -followingList");
    if (!user) return res.status(404).json({ message: "User not found." });

    const result = {
      ...user.toObject(),
      followers: user.followers || 0,
      following: user.following || 0,
      isFollowing: false,
    };

    if (req.headers.authorization?.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.id) {
          const authUser = await User.findById(decoded.id).select("followingList");
          const followingIds = Array.isArray(authUser?.followingList) ? authUser.followingList.map((id) => id.toString()) : [];
          result.isFollowing = followingIds.includes(user._id.toString());
        }
      } catch (err) {
        result.isFollowing = false;
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/me  — update own profile (protected)
// Accepts: firstName, lastName, handle, bio, avatar (Cloudinary URL)
router.put("/me", protect, async (req, res) => {
  try {
    const allowed = ["firstName", "lastName", "handle", "bio", "avatar"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // If changing handle, make sure it's not taken
    if (updates.handle && updates.handle !== req.user.handle) {
      const taken = await User.findOne({ handle: updates.handle });
      if (taken) return res.status(400).json({ message: "Handle already taken." });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// POST /api/users/:handle/follow — follow an author
router.post("/:handle/follow", protect, async (req, res) => {
  try {
    const target = await User.findOne({ handle: req.params.handle });
    if (!target) return res.status(404).json({ message: "User not found." });
    if (target._id.equals(req.user._id)) {
      return res.status(400).json({ message: "Cannot follow yourself." });
    }

    const alreadyFollowing = req.user.followingList?.some((id) => id.equals(target._id));
    if (alreadyFollowing) {
      return res.status(400).json({ message: "Already following this user." });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { followingList: target._id },
      $inc: { following: 1 },
    });
    await User.findByIdAndUpdate(target._id, {
      $addToSet: { followersList: req.user._id },
      $inc: { followers: 1 },
    });

    const updatedTarget = await User.findById(target._id).select("followers following").lean();
    res.json({
      followers: updatedTarget.followers || 0,
      following: updatedTarget.following || 0,
      isFollowing: true,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:handle/follow — unfollow an author
router.delete("/:handle/follow", protect, async (req, res) => {
  try {
    const target = await User.findOne({ handle: req.params.handle });
    if (!target) return res.status(404).json({ message: "User not found." });
    if (target._id.equals(req.user._id)) {
      return res.status(400).json({ message: "Cannot unfollow yourself." });
    }

    const wasFollowing = req.user.followingList?.some((id) => id.equals(target._id));
    if (!wasFollowing) {
      return res.status(400).json({ message: "Not following this user." });
    }

    await User.findByIdAndUpdate(
  req.user._id, 
  {
    $pull: { followingList: target._id },
    $inc: { following: -1 }
  }, // <-- This comma separates the update object from the options object
  { returnDocument: 'after' } // ✅ This is the 3rd argument, neat and clean
); // <-- Closes findByIdAndUpdate safely

await User.findByIdAndUpdate(
  target._id, 
  {
    $pull: { followersList: req.user._id },
    $inc: { followers: -1 }
  }, // <-- Comma here too
  { returnDocument: 'after' } // ✅ 3rd argument
); // <-- Closes findByIdAndUpdate safely

    const updatedTarget = await User.findById(target._id).select("followers following").lean();
    res.json({
      followers: updatedTarget.followers || 0,
      following: updatedTarget.following || 0,
      isFollowing: false,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;
