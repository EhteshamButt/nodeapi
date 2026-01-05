const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

// Handle OPTIONS for payment routes
router.options("*", (req, res) => {
  try {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.sendStatus(204);
  } catch (error) {
    console.error("OPTIONS handler error:", error);
    res.header("Access-Control-Allow-Origin", "*");
    res.sendStatus(204);
  }
});

// Create checkout session
router.post("/create-checkout-session", paymentController.createCheckoutSession);

// Get user payment status
router.get("/status/:userId", paymentController.getPaymentStatus);

// Verify payment session (after redirect)
router.post("/verify-session", paymentController.verifySession);

// Update payment status (admin endpoint)
router.post("/update-status", paymentController.updatePaymentStatus);

// Stripe webhook (must be before express.json middleware in index.js)
// This route needs raw body, so we'll handle it separately in index.js

module.exports = router;


