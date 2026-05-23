const router     = require("express").Router();
const multer     = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const protect    = require("../middleware/authMiddleware");

// ── Storage configs ───────────────────────────────────────────────

// Blog cover images  — 1200×630, auto quality, stored as WebP
const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "blogsync/covers",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation:  [
      { width: 1200, height: 630, crop: "fill", quality: "auto", fetch_format: "auto" },
    ],
  },
});

// Author avatars  — 200×200, face-detect crop, stored as WebP
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "blogsync/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation:  [
      { width: 200, height: 200, crop: "fill", gravity: "face", quality: "auto", fetch_format: "auto" },
    ],
  },
});

const uploadCover  = multer({ storage: coverStorage,  limits: { fileSize: 8 * 1024 * 1024 } });
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 4 * 1024 * 1024 } });

// ── Routes ────────────────────────────────────────────────────────

// POST /api/upload/cover  — upload blog cover image
router.post(
  "/cover",
  protect,
  uploadCover.single("image"),
  (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "No file received." });

    res.json({
      url:       req.file.path,      // Cloudinary secure_url
      public_id: req.file.filename,  // needed to delete later
    });
  }
);

// POST /api/upload/avatar  — upload profile avatar
router.post(
  "/avatar",
  protect,
  uploadAvatar.single("image"),
  (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "No file received." });

    res.json({
      url:       req.file.path,
      public_id: req.file.filename,
    });
  }
);

// DELETE /api/upload/:public_id  — delete image from Cloudinary
router.delete("/:public_id", protect, async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.public_id);
    await cloudinary.uploader.destroy(id);
    res.json({ message: "Image deleted from Cloudinary." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Handle multer errors (file too large, wrong type, etc.)
router.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE")
    return res.status(413).json({ message: "File too large. Max 8MB for covers, 4MB for avatars." });
  res.status(400).json({ message: err.message || "Upload error." });
});

module.exports = router;
