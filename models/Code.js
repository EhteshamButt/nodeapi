const mongoose = require("mongoose");

const codeSchema = new mongoose.Schema(
  {
    // Base price for calculations (default: £19.99)
    totalAmount: {
      type: Number,
      default: 19.99,
      min: 0,
    },
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
    // Amount after applying discount to totalAmount (e.g., 19.99 - discount%)
    walletAmount: {
      type: Number,
      default: 19.99,
      min: 0,
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
    // Assign this discount code to a specific wallet user (like a join/populate)
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Ensure discount field is always included in JSON output
codeSchema.set("toJSON", {
  transform: function (doc, ret) {
    // ALWAYS include discount field - set to 0 if undefined or null
    ret.discount = ret.discount !== undefined && ret.discount !== null ? ret.discount : 0;
    return ret;
  },
});

// Also set for toObject
codeSchema.set("toObject", {
  transform: function (doc, ret) {
    // ALWAYS include discount field - set to 0 if undefined or null
    ret.discount = ret.discount !== undefined && ret.discount !== null ? ret.discount : 0;
    return ret;
  },
});

// Index for faster queries
// Note: code field already has unique: true which creates an index automatically
codeSchema.index({ isActive: 1 });

const Code = mongoose.model("Code", codeSchema);

module.exports = Code;

