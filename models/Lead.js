const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["hero", "cta", "other"],
      default: "other",
    },
    subscribed: {
      type: Boolean,
      default: true,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: Date,
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index for faster email lookups
leadSchema.index({ email: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ subscribed: 1 });

const Lead = mongoose.model("Lead", leadSchema);

module.exports = Lead;
