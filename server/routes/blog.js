const jwt     = require("jsonwebtoken");
const router  = require("express").Router();
const Blog    = require("../models/Blog");
const User    = require("../models/User");
const protect = require("../middleware/authMiddleware");

// ── GET /api/blogs  — public feed (published only) ───────────────
// Optional ?author=id filter — still only published posts
router.get("/", async (req, res) => {
  try {
    const filter = { published: true };
    if (req.query.author) filter.author = req.query.author;

    const blogs = await Blog.find(filter)
      .populate("author", "firstName lastName handle avatar")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/blogs/drafts  — owner's drafts (protected) ──────────
// Returns ONLY the logged-in user's unpublished posts.
// Must come BEFORE /:id so Express doesn't treat "drafts" as an id.
router.get("/drafts", protect, async (req, res) => {
  try {
    const drafts = await Blog.find({
      author:    req.user._id,
      published: false,
    })
      .populate("author", "firstName lastName handle avatar")
      .sort({ updatedAt: -1 }); // most recently saved first

    res.json(drafts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/blogs/:id  — single post (public only for published, owner access for drafts) ──
router.get("/:id", async (req, res) => {
  try {
    let blog = await Blog.findById(req.params.id).populate("author", "firstName lastName handle avatar bio");
    if (!blog) return res.status(404).json({ message: "Post not found." });

    if (!blog.published) {
      const auth = req.headers.authorization;
      if (!auth?.startsWith("Bearer "))
        return res.status(401).json({ message: "Authentication required to view this draft." });

      try {
        const decoded = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || blog.author._id.toString() !== user._id.toString())
          return res.status(403).json({ message: "Not authorized to view this draft." });
      } catch (err) {
        return res.status(401).json({ message: "Invalid token. Please sign in." });
      }

      return res.json(blog);
    }

    blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate("author", "firstName lastName handle avatar bio");

    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/blogs  — create post (protected) ───────────────────
// published: false → saved as draft
// published: true  → live on public feed
router.post("/", protect, async (req, res) => {
  try {
    const { title, subtitle, content, tags, categories, readTime, banner, published, images } = req.body;
    const trimmedTitle = title?.trim() || "";
    const trimmedContent = content?.trim() || "";
    const hasDraftData = Boolean(
      trimmedTitle || trimmedContent || subtitle?.trim() || banner || (tags?.length) || (categories?.length) || (images?.length)
    );

    if (published === true && (!trimmedTitle || !trimmedContent))
      return res.status(400).json({ message: "Title and content are required to publish." });

    if (!published && !hasDraftData)
      return res.status(400).json({ message: "Add some content before saving a draft." });

    const blog = await Blog.create({
      title: trimmedTitle,
      subtitle: subtitle?.trim() || "",
      content: trimmedContent,
      tags: tags || [],
      categories: categories || [],
      images: images || [],
      readTime: readTime || 1,
      banner: banner || "",
      published: published === true,
      author: req.user._id,
    });

    res.status(201).json(blog);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── PUT /api/blogs/:id  — update post (protected, owner only) ────
router.put("/:id", protect, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Post not found." });

    if (blog.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized." });

    const { title, subtitle, content, tags, categories, readTime, banner, published, images } = req.body;
    if (published === true && (!title?.trim() || !content?.trim()))
      return res.status(400).json({ message: "Title and content are required to publish." });

    const fields = ["title", "subtitle", "content", "tags", "categories", "images", "readTime", "banner", "published"];
    fields.forEach((f) => { if (req.body[f] !== undefined) blog[f] = req.body[f]; });

    await blog.save();
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/blogs/:id/like  — toggle like (protected) ─────────
// Example PATCH route for liking a blog
//  THE SOLUTION
router.patch("/:id/like",protect, async (req, res) => {
  try {
    const { id } = req.params;
   
    // 1. Fetch the blog from MongoDB first!
    const blog = await Blog.findById(id); 
    
    // 2. Safety check: make sure the blog actually exists
    if (!blog) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    // 3. Now 'blog' is defined, so this won't crash anymore!
    // (Check if user already liked it, push/pull ID, etc.)
    if (blog.likes.includes(req.user._id)) {
      blog.likes = blog.likes.filter(userId => userId.toString() !== req.user._id.toString());
    } else {
      blog.likes.push(req.user._id);
    }
    
    await blog.save();
    res.status(200).json({ likes: blog.likes.length, message: "Likes updated successfully" });
    
  } catch (err) {
    console.error("❌ CRITICAL LIKE ROUTE FAILURE:", err);
    res.status(500).json({ message: err.message });
  }
});


// ── DELETE /api/blogs/:id  — delete post (protected, owner only) ──
router.delete("/:id", protect, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Post not found." });

    if (blog.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized." });

    await blog.deleteOne();
    res.json({ message: "Post deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

