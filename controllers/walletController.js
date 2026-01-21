const mongoose = require("mongoose");
const User = require("../models/User");
const WalletTransaction = require("../models/WalletTransaction");

const setCorsHeaders = (res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

// GET /wallet/me?userId=...
exports.getMyWallet = async (req, res) => {
  setCorsHeaders(res);
  try {
    const { userId } = req.query;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: { code: "400", message: "Valid userId is required" },
      });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: { code: "404", message: "User not found" } });
    }
    if ((user.userType || "").toLowerCase() !== "wallet") {
      return res.status(403).json({ error: { code: "403", message: "Only wallet users can access this endpoint" } });
    }

    const txns = await WalletTransaction.find({ walletUser: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("code", "code discount walletAmount assignedTo")
      .populate("sourceUser", "username email")
      .lean();

    const totalSales = await WalletTransaction.countDocuments({ walletUser: user._id, type: "credit" });
    const totalEarnedAgg = await WalletTransaction.aggregate([
      { $match: { walletUser: user._id, type: "credit" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalWithdrawAgg = await WalletTransaction.aggregate([
      { $match: { walletUser: user._id, type: "debit" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalEarned = totalEarnedAgg?.[0]?.total || 0;
    const totalWithdrawn = totalWithdrawAgg?.[0]?.total || 0;

    return res.status(200).json({
      message: "Wallet retrieved successfully",
      wallet: {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        currency: "gbp",
        balance: user.walletBalance || 0,
        totalSales,
        totalEarned,
        totalWithdrawn,
      },
      transactions: txns.map((t) => ({
        id: t._id.toString(),
        type: t.type,
        status: t.status,
        amount: t.amount,
        currency: t.currency,
        paidAmount: t.paidAmount || null,
        code: t.code
          ? {
              id: t.code._id?.toString?.() || null,
              code: t.code.code,
              discount: t.code.discount,
              walletAmount: t.code.walletAmount,
            }
          : null,
        sourceUser: t.sourceUser
          ? { id: t.sourceUser._id.toString(), username: t.sourceUser.username, email: t.sourceUser.email }
          : null,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error("getMyWallet error:", error);
    return res.status(500).json({ error: { code: "500", message: error.message || "Failed to retrieve wallet" } });
  }
};

// POST /wallet/withdraw  { userId, amount }
// Note: Real card/bank withdrawals require Stripe Connect onboarding (KYC). Here we create a withdrawal request.
exports.requestWithdraw = async (req, res) => {
  setCorsHeaders(res);
  try {
    const { userId, amount } = req.body;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: { code: "400", message: "Valid userId is required" } });
    }
    const amt = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: { code: "400", message: "amount must be greater than 0" } });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: { code: "404", message: "User not found" } });
    if ((user.userType || "").toLowerCase() !== "wallet") {
      return res.status(403).json({ error: { code: "403", message: "Only wallet users can withdraw" } });
    }

    if ((user.walletBalance || 0) < amt) {
      return res.status(400).json({ error: { code: "400", message: "Insufficient wallet balance" } });
    }

    // Deduct immediately and create a pending debit transaction
    user.walletBalance = Math.max(0, (user.walletBalance || 0) - amt);
    await user.save();

    const txn = await WalletTransaction.create({
      walletUser: user._id,
      type: "debit",
      status: "pending",
      amount: Math.round(amt * 100) / 100,
      currency: "gbp",
      note: "Withdrawal requested",
    });

    return res.status(201).json({
      message: "Withdrawal requested successfully",
      withdrawal: { id: txn._id.toString(), amount: txn.amount, status: txn.status },
      balance: user.walletBalance,
    });
  } catch (error) {
    console.error("requestWithdraw error:", error);
    return res.status(500).json({ error: { code: "500", message: error.message || "Failed to request withdrawal" } });
  }
};

