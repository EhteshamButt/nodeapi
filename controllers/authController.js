const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/email");

// POST /auth/signup
exports.signup = async (req, res, next) => {
  try {
    const { username, email, password, userType } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email and password are required" });
    }

    // Validate userType if provided
    if (userType && !["user", "admin"].includes(userType)) {
      return res
        .status(400)
        .json({ message: "userType must be either 'user' or 'admin'" });
    }

    // Check for existing email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    // Check for existing username
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ message: "Username is already taken" });
    }

    // Create user with userType (defaults to 'user' if not provided)
    const userData = { username, email, password };
    if (userType) {
      userData.userType = userType;
    }

    const user = await User.create(userData);
    const token = generateToken(user._id.toString());

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        userType: user.userType || "user",
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message =
        field === "email"
          ? "Email is already registered"
          : field === "username"
          ? "Username is already taken"
          : `${field} already exists`;
      return res.status(409).json({ 
        error: {
          code: "409",
          message: message
        }
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ 
        error: {
          code: "400",
          message: messages.join(", ")
        }
      });
    }

    // Pass other errors to error handler
    next(error);
  }
};

// POST /auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id.toString());

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal whether email exists for security
      return res
        .status(200)
        .json({ message: "If an account with that email exists, a reset link has been sent" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(
      email
    )}`;

    const html = `
      <p>You requested a password reset.</p>
      <p>Click the link below to reset your password (valid for 1 hour):</p>
      <a href="${resetUrl}">${resetUrl}</a>
    `;

    await sendEmail({
      to: email,
      subject: "Password Reset Request",
      html,
    });

    res.status(200).json({
      message: "If an account with that email exists, a reset link has been sent",
    });
  } catch (error) {
    next(error);
  }
};

// POST /auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, token, password } = req.body;

    if (!email || !token || !password) {
      return res
        .status(400)
        .json({ message: "Email, token and new password are required" });
    }

    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "Token is invalid or has expired" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    next(error);
  }
};

// GET /auth/admins - Get all admin users
exports.getAllAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ userType: 'admin' })
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      message: "Admins retrieved successfully",
      admins: admins.map(admin => ({
        id: admin._id.toString(),
        username: admin.username,
        email: admin.email,
        userType: admin.userType || 'admin',
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      })),
      total: admins.length,
    });
  } catch (error) {
    console.error("Get all admins error:", error);
    res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to retrieve admins",
      },
    });
  }
};

// DELETE /auth/admins/:id - Delete an admin
exports.deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Admin ID is required",
        },
      });
    }

    const admin = await User.findById(id);

    if (!admin) {
      return res.status(404).json({
        error: {
          code: "404",
          message: "Admin not found",
        },
      });
    }

    // Check if it's actually an admin
    if (admin.userType !== 'admin') {
      return res.status(400).json({
        error: {
          code: "400",
          message: "User is not an admin",
        },
      });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      message: "Admin deleted successfully",
      deletedAdmin: {
        id: admin._id.toString(),
        username: admin.username,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Delete admin error:", error);
    res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to delete admin",
      },
    });
  }
};

// GET /auth/stats - Get admin dashboard statistics
exports.getAdminStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total users (excluding admins)
    const totalUsers = await User.countDocuments({ userType: { $ne: 'admin' } });

    // Active subscriptions
    const activeSubscriptions = await User.countDocuments({
      subscriptionStatus: 'active',
      subscriptionExpiryDate: { $gt: now },
      userType: { $ne: 'admin' },
    });

    // Total revenue (from all paid users)
    const paidUsers = await User.find({
      paymentStatus: true,
      paymentDate: { $exists: true },
      userType: { $ne: 'admin' },
    }).select('paymentDate');

    // Calculate total revenue (assuming £19.99 per payment)
    const PAYMENT_AMOUNT = 19.99;
    const totalRevenue = paidUsers.length * PAYMENT_AMOUNT;

    // Monthly revenue (payments made this month)
    const monthlyPaidUsers = paidUsers.filter(user => {
      const paymentDate = new Date(user.paymentDate);
      return paymentDate >= startOfMonth;
    });
    const monthlyRevenue = monthlyPaidUsers.length * PAYMENT_AMOUNT;

    // Calculate percentage changes (comparing to last month)
    const lastMonthPaidUsers = await User.countDocuments({
      paymentStatus: true,
      paymentDate: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      userType: { $ne: 'admin' },
    });
    const lastMonthActive = await User.countDocuments({
      subscriptionStatus: 'active',
      subscriptionExpiryDate: { $gt: endOfLastMonth, $lte: startOfMonth },
      userType: { $ne: 'admin' },
    });

    const userChange = lastMonthPaidUsers > 0 
      ? (((totalUsers - lastMonthPaidUsers) / lastMonthPaidUsers) * 100).toFixed(0)
      : '0';
    const subscriptionChange = lastMonthActive > 0
      ? (((activeSubscriptions - lastMonthActive) / lastMonthActive) * 100).toFixed(0)
      : '0';
    const revenueChange = lastMonthPaidUsers > 0
      ? (((monthlyRevenue - (lastMonthPaidUsers * PAYMENT_AMOUNT)) / (lastMonthPaidUsers * PAYMENT_AMOUNT)) * 100).toFixed(0)
      : '0';

    res.status(200).json({
      message: "Stats retrieved successfully",
      stats: {
        totalUsers,
        activeSubscriptions,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        changes: {
          users: userChange > 0 ? `+${userChange}%` : `${userChange}%`,
          subscriptions: subscriptionChange > 0 ? `+${subscriptionChange}%` : `${subscriptionChange}%`,
          revenue: revenueChange > 0 ? `+${revenueChange}%` : `${revenueChange}%`,
          monthlyRevenue: revenueChange > 0 ? `+${revenueChange}%` : `${revenueChange}%`,
        },
      },
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to retrieve stats",
      },
    });
  }
};

// GET /auth/recent-activity - Get recent activity
exports.getRecentActivity = async (req, res, next) => {
  try {
    const Code = require("../models/Code");
    
    // Get recent codes created (last 5)
    const recentCodes = await Code.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select('code createdAt')
      .lean();

    // Get recent payments (last 5)
    const recentPayments = await User.find({
      paymentStatus: true,
      paymentDate: { $exists: true },
      userType: { $ne: 'admin' },
    })
      .sort({ paymentDate: -1 })
      .limit(3)
      .select('username email paymentDate')
      .lean();

    // Get recent user registrations (last 5)
    const recentUsers = await User.find({
      userType: { $ne: 'admin' },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('username email createdAt')
      .lean();

    // Format activities
    const activities = [];

    // Add code activities
    recentCodes.forEach(code => {
      activities.push({
        type: 'code',
        message: `New discount code created: ${code.code}`,
        timestamp: code.createdAt,
        icon: 'add',
      });
    });

    // Add payment activities
    recentPayments.forEach(payment => {
      activities.push({
        type: 'payment',
        message: `Payment processed for ${payment.username || payment.email}`,
        timestamp: payment.paymentDate,
        icon: 'check',
      });
    });

    // Add user activities
    recentUsers.forEach(user => {
      activities.push({
        type: 'user',
        message: `New user registered: ${user.username}`,
        timestamp: user.createdAt,
        icon: 'user',
      });
    });

    // Sort by timestamp (most recent first) and limit to 5
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentActivities = activities.slice(0, 5);

    res.status(200).json({
      message: "Recent activity retrieved successfully",
      activities: recentActivities,
    });
  } catch (error) {
    console.error("Get recent activity error:", error);
    res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to retrieve recent activity",
      },
    });
  }
};


