const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const paymentController = require("./controllers/paymentController");

dotenv.config();

const app = express();

// CORS configuration - allow all origins, no credentials
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "stripe-signature"],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS to all routes first
app.use(cors(corsOptions));

// Add CORS headers middleware for all responses
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, stripe-signature");
  next();
});

// Handle preflight OPTIONS requests explicitly for all routes
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, stripe-signature");
  res.sendStatus(204);
});

// Stripe webhook needs raw body for signature verification
// Must be BEFORE express.json() middleware
app.post(
  "/payment/webhook",
  express.raw({ type: "application/json" }),
  paymentController.stripeWebhook
);

// Body parser for regular routes (must be after webhook)
app.use(express.json());

// Connect to database
connectDB();

// Routes
app.use("/auth", authRoutes);
app.use("/payment", paymentRoutes);

app.get("/", (req, res) => {
  res.send(`App is working fine`);
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).send("Sorry can't find that!");
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  console.error("Error stack:", err.stack);
  
  // Return error in format Unity expects
  res.status(err.status || 500).json({
    error: {
      code: String(err.status || 500),
      message: err.message || "A server error has occurred"
    }
  });
});

// Vercel handler export
module.exports = app;

// Local dev server
if (require.main === module) {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
  });
}
