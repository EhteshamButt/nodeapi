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
const mongoose = require("mongoose");

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

    const { userId, amount, currency = "usd" } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        error: {
          code: "400",
          message: "User ID and amount are required",
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

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: "Premium Subscription",
              description: "Premium account access",
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment?userId=${user._id.toString()}`,
      metadata: {
        userId: user._id.toString(),
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
              user.paymentStatus = true;
              user.paymentDate = new Date();
              await user.save();
              console.log(`Payment successful for user: ${userId}`);
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

    const user = await User.findById(userId).select("username email paymentStatus paymentDate");

    if (!user) {
      return res.status(404).json({
        error: {
          code: "404",
          message: "User not found",
        },
        requestedUserId: userId, // Include the ID that was requested
      });
    }

    res.status(200).json({
      message: "Payment status retrieved",
      requestedUserId: userId, // Include the ID that was requested
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        paymentStatus: user.paymentStatus || false,
        paymentDate: user.paymentDate || null,
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
            user.paymentStatus = true;
            user.paymentDate = new Date();
            await user.save();
          }

          // Return user data in expected format
          return res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            user: {
              id: user._id.toString(),
              username: user.username,
              email: user.email,
              paymentStatus: user.paymentStatus,
              paymentDate: user.paymentDate || new Date(),
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


