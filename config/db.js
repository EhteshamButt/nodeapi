const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = "mongodb+srv://joe_db_user:IEv0z4fvAMnUHbPU@cluster0.qsthwko.mongodb.net";

  if (!uri) {
    console.error("DATABASE_URL is not defined in environment variables");
    // Don't use process.exit(1) in serverless environments
    throw new Error("DATABASE_URL is not defined");
  }

  try {
    // Mongoose 9+ does not need extra options, just pass the URI
    await mongoose.connect(uri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
};

module.exports = connectDB;


