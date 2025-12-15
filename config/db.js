const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.DATABASE_URL;

  if (!uri) {
    console.error("DATABASE_URL is not defined in environment variables");
    process.exit(1);
  }

  try {
    // Mongoose 9+ does not need extra options, just pass the URI
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;


