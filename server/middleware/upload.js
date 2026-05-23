const multer              = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary          = require("../config/cloudinary");

// ── Blog cover images ─────────────────────────────────────────────
// 1200×630 fill crop, auto quality + format (served as WebP by Cloudinary)
const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "blogsync/covers",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 1200, height: 630, crop: "fill", quality: "auto", fetch_format: "auto" },
    ],
  },
});

// ── Author avatars ────────────────────────────────────────────────
// 200×200 face-detect fill crop, auto quality + format
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "blogsync/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 200, height: 200, crop: "fill", gravity: "face", quality: "auto", fetch_format: "auto" },
    ],
  },
});

const uploadCover  = multer({ storage: coverStorage,  limits: { fileSize: 8  * 1024 * 1024 } }); // 8 MB
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 4  * 1024 * 1024 } }); // 4 MB

module.exports = { uploadCover, uploadAvatar };
