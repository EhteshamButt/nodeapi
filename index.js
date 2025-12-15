const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());

// Connect to database
connectDB();

// Routes
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send(`App is working fine`);
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).send("Sorry can't find that!");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something broke!", error: err.message });
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
