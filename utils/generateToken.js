const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  if (!secret) {
    throw new Error("JWT secret is not defined in environment variables");
  }

  return jwt.sign({ id: userId }, secret, { expiresIn });
};

module.exports = generateToken;


