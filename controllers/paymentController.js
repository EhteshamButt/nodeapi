// Initialize Stripe with error handling
// Only initialize if the key exists, otherwise it will be checked in each function
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
} else {
  console.error("WARNING: STRIPE_SECRET_KEY is not set in environment variables!");
  console.error("Please create a .env file in the NodeExpressVerce directory with:");
  console.error("STRIPE_SECRET_KEY=sk_test_...");
}

const User = require("../models/User");
const Code = require("../models/Code");
const mongoose = require("mongoose");

// Helper function to check and update subscription expiration
const checkSubscriptionExpiry = async (user) => {
  if (user.subscriptionStatus === "active" && user.subscriptionExpiryDate) {
    const now = new Date();
    if (now > user.subscriptionExpiryDate) {
      user.subscriptionStatus = "expired";
      user.paymentStatus = false;
      await user.save();
      console.log(`Subscription expired for user: ${user._id}`);
      return true; // Subscription expired
    }
  }
  return false; // Subscription still active
};

// Helper function to get effective payment status (checks expiration)
const getEffectivePaymentStatus = (user) => {
  if (!user.paymentStatus || user.subscriptionStatus === "none") {
    return false;
  }
  
  if (user.subscriptionStatus === "expired") {
    return false;
  }
  
  if (user.subscriptionStatus === "active" && user.subscriptionExpiryDate) {
    const now = new Date();
    if (now > user.subscriptionExpiryDate) {
      return false; // Expired
    }
    return true; // Active
  }
  
  return user.paymentStatus;
};

// POST /payment/create-checkout-session
exports.createCheckoutSession = async (req, res, next) => {
  // Set CORS headers first
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    // Check if Stripe is configured
    if (!stripe || !process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: {
          code: "500",
          message: "Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.",
        },
      });
    }

    const { userId, amount, currency = "usd", couponCode } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "User ID and amount are required",
        },
      });
    }

    // Validate and apply coupon code if provided
    let finalAmount = amount;
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await Code.findOne({
        code: { $regex: new RegExp(`^${couponCode.trim()}$`, "i") },
        isActive: true,
      });

      if (coupon && coupon.discount) {
        // Calculate discount
        discountAmount = (amount * coupon.discount) / 100;
        finalAmount = amount - discountAmount;
        
        // Ensure final amount is not negative
        if (finalAmount < 0) {
          finalAmount = 0;
        }

        appliedCoupon = {
          code: coupon.code,
          discount: coupon.discount,
          discountAmount: discountAmount,
        };
      } else {
        return res.status(400).json({
          error: {
            code: "400",
            message: "Invalid or inactive coupon code",
          },
        });
      }
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Invalid user ID format",
        },
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: {
          code: "404",
          message: "User not found",
        },
      });
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: {
          userId: user._id.toString(),
        },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Build line items - use final amount (already discounted)
    const lineItems = [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: "Premium Subscription",
            description: appliedCoupon 
              ? `Premium account access (${appliedCoupon.discount}% off with ${appliedCoupon.code})`
              : "Premium account access",
          },
          unit_amount: Math.round(finalAmount * 100), // Final amount after discount in cents
        },
        quantity: 1,
      },
    ];

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment?userId=${user._id.toString()}`,
      metadata: {
        userId: user._id.toString(),
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        originalAmount: amount.toString(),
        discountAmount: discountAmount.toString(),
        finalAmount: finalAmount.toString(),
      },
    });

    res.status(200).json({
      message: "Checkout session created",
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Create checkout session error:", error);
    // CORS headers already set at the beginning
    return res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Failed to create checkout session",
      },
    });
  }
};

// POST /payment/webhook - Stripe webhook handler
exports.stripeWebhook = async (req, res, next) => {
  try {
    if (!stripe) {
      console.error("ERROR: Stripe is not initialized. STRIPE_SECRET_KEY is not set!");
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || webhookSecret === "whsec_your_webhook_secret_here") {
      console.error("ERROR: STRIPE_WEBHOOK_SECRET is not set or is placeholder!");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    // Get raw body - handle both Buffer and string
    let rawBody = req.body;
    if (Buffer.isBuffer(rawBody)) {
      // Body is already a Buffer, use as is
    } else if (typeof rawBody === "string") {
      rawBody = Buffer.from(rawBody, "utf8");
    } else {
      // Try to get raw body from request
      rawBody = req.rawBody || req.body;
      if (!Buffer.isBuffer(rawBody)) {
        rawBody = Buffer.from(JSON.stringify(rawBody), "utf8");
      }
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    try {
      switch (event.type) {
        case "checkout.session.completed":
          const session = event.data.object;
          const userId = session.metadata?.userId;

          if (userId) {
            const user = await User.findById(userId);
            if (user) {
              const paymentDate = new Date();
              // Set subscription expiry to exactly 1 year from payment date
              const expiryDate = new Date(paymentDate);
              expiryDate.setFullYear(expiryDate.getFullYear() + 1);
              
              user.paymentStatus = true;
              user.paymentDate = paymentDate;
              user.subscriptionExpiryDate = expiryDate;
              user.subscriptionStatus = "active";
              await user.save();
              console.log(`Payment successful for user: ${userId}, expires on: ${expiryDate}`);
            }
          }
          break;

        case "payment_intent.succeeded":
          const paymentIntent = event.data.object;
          console.log("PaymentIntent succeeded:", paymentIntent.id);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook handler error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: "Webhook handler failed", message: error.message });
    }
  } catch (error) {
    console.error("Webhook outer error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Webhook failed", message: error.message });
  }
};

// GET /payment/status/:userId - Get user payment status
exports.getPaymentStatus = async (req, res, next) => {
  // Set CORS headers first, before any processing
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    const { userId } = req.params;

    // Log the user ID being requested
    console.log("Payment status requested for user ID:", userId);

    if (!userId) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "User ID is required",
        },
      });
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "Invalid user ID format",
        },
      });
    }

    const user = await User.findById(userId).select("username email paymentStatus paymentDate subscriptionExpiryDate subscriptionStatus");

    if (!user) {
      return res.status(404).json({
        error: {
          code: "404",
          message: "User not found",
        },
        requestedUserId: userId, // Include the ID that was requested
      });
    }

    // Check if subscription has expired
    await checkSubscriptionExpiry(user);
    
    // Refresh user data after potential expiration update
    await user.populate();
    const effectiveStatus = getEffectivePaymentStatus(user);

    res.status(200).json({
      message: "Payment status retrieved",
      requestedUserId: userId, // Include the ID that was requested
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        paymentStatus: effectiveStatus,
        paymentDate: user.paymentDate || null,
        subscriptionExpiryDate: user.subscriptionExpiryDate || null,
        subscriptionStatus: user.subscriptionStatus || "none",
      },
    });
  } catch (error) {
    console.error("Get payment status error:", error);
    // CORS headers already set at the beginning
    // Return a proper error response instead of calling next()
    return res.status(500).json({
      error: {
        code: "500",
        message: error.message || "Internal server error",
      },
    });
  }
};

// POST /payment/verify-session - Verify payment after redirect
exports.verifySession = async (req, res, next) => {
  // Set CORS headers first
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    // Check if Stripe is configured
    if (!stripe || !process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.",
      });
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const userId = session.metadata?.userId;
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          // Update payment status if not already set
          if (!user.paymentStatus) {
            const paymentDate = new Date();
            // Set subscription expiry to exactly 1 year from payment date
            const expiryDate = new Date(paymentDate);
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            
            user.paymentStatus = true;
            user.paymentDate = paymentDate;
            user.subscriptionExpiryDate = expiryDate;
            user.subscriptionStatus = "active";
            await user.save();
          }

          // Check expiration and refresh user
          await checkSubscriptionExpiry(user);
          await user.populate();
          const effectiveStatus = getEffectivePaymentStatus(user);

          // Return user data in expected format
          return res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            user: {
              id: user._id.toString(),
              username: user.username,
              email: user.email,
              paymentStatus: effectiveStatus,
              paymentDate: user.paymentDate || new Date(),
              subscriptionExpiryDate: user.subscriptionExpiryDate || null,
              subscriptionStatus: user.subscriptionStatus || "active",
            },
          });
        } else {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "User ID not found in session metadata",
        });
      }
    } else {
      return res.status(200).json({
        success: false,
        message: "Payment not completed",
      });
    }
  } catch (error) {
    console.error("Verify session error:", error);
    // CORS headers already set at the beginning
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify session",
    });
  }
};


