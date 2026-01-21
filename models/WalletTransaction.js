const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    walletUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["completed", "pending", "failed"],
      default: "completed",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "gbp",
    },
    // buyer user (the one who paid)
    sourceUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // discount code used in the sale
    code: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Code",
      default: null,
    },
    codeString: {
      type: String,
      default: null,
    },
    paidAmount: {
      type: Number,
      default: null,
    },
    stripeSessionId: {
      type: String,
      default: null,
      index: true,
    },
    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);

