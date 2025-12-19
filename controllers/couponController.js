const Code = require("../models/Code");
const mongoose = require("mongoose");

// Set CORS headers helper
const setCorsHeaders = (res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

// POST /coupon/validate - Validate a coupon code
exports.validateCoupon = async (req, res, next) => {
  setCorsHeaders(res);

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: "400",
          message: "Coupon code is required",
        },
      });
    }

    // Find the code (case-insensitive)
    const couponCode = await Code.findOne({ 
      code: { $regex: new RegExp(`^${code.trim()}$`, "i") },
      isActive: true 
    }).lean();

    if (!couponCode) {
      return res.status(404).json({
        success: false,
        error: {
          code: "404",
          message: "Invalid or inactive coupon code",
        },
      });
    }

    // Check if code has been used (if tracking is enabled)
    if (couponCode.usedBy && couponCode.usedAt) {
      return res.status(400).json({
        success: false,
        error: {
          code: "400",
          message: "This coupon code has already been used",
        },
      });
    }

    // Return coupon details
    res.status(200).json({
      success: true,
      message: "Coupon code is valid",
      coupon: {
        code: couponCode.code,
        discount: couponCode.discount || 0,
        description: couponCode.description || "",
      },
    });
  } catch (error) {
    console.error("Validate coupon error:", error);
    setCorsHeaders(res);
    return res.status(500).json({
      success: false,
      error: {
        code: "500",
        message: error.message || "Failed to validate coupon code",
      },
    });
  }
};

