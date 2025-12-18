const mongoose = require("mongoose");

const codeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: false, // Keep original case
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100, // Discount percentage (0-100)
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for faster queries
// Note: code field already has unique: true which creates an index automatically
codeSchema.index({ isActive: 1 });

const Code = mongoose.model("Code", codeSchema);

module.exports = Code;

