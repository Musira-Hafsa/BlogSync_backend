const router  = require("express").Router();
const Comment = require("../models/Comment");
const protect = require("../middleware/authMiddleware");

// GET /api/comments/:blogId  — all comments for a post
router.get("/:blogId", async (req, res) => {
  try {
    const comments = await Comment.find({ blog: req.params.blogId })
      .populate("author", "firstName lastName handle avatar")
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/comments/:blogId  — add comment (protected)
router.post("/:blogId", protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim())
      return res.status(400).json({ message: "Comment cannot be empty." });

    const comment = await Comment.create({
      blog:    req.params.blogId,
      author:  req.user._id,
      content: content.trim(),
    });
    await comment.populate("author", "firstName lastName handle avatar");
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/comments/:id  — update own comment (protected)
router.put("/:id", protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim())
      return res.status(400).json({ message: "Comment cannot be empty." });

    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    if (comment.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized." });

    comment.content = content.trim();
    await comment.save();
    await comment.populate("author", "firstName lastName handle avatar");

    res.json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/comments/:id  — delete own comment (protected)
router.delete("/:id", protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    if (comment.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized." });

    await comment.deleteOne();
    res.json({ message: "Comment deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
