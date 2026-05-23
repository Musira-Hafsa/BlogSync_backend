const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    blog:    { type: mongoose.Schema.Types.ObjectId, ref: "Blog",    required: true },
    author:  { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    likes:   { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);