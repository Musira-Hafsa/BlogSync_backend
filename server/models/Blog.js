const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title:     { type: String, required: true, trim: true },
    subtitle:  { type: String, default: "", trim: true },      // editor subtitle/description
    content:   { type: String, required: true },          // rich HTML from editor
    banner:     { type: String, default: "" },             // Cloudinary URL
    categories: [{ type: String, trim: true }],
    images:     [{ type: String, trim: true }],
    author:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tags:       [{ type: String, trim: true }],
    likes:      [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    views:      { type: Number, default: 0 },
    readTime:   { type: Number, default: 1 },              // minutes
    published:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Full-text search index on title + content
blogSchema.index({ title: "text", content: "text" });

module.exports = mongoose.model("Blog", blogSchema);
