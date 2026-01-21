const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    paymentStatus: {
      type: Boolean,
      default: false,
    },
    stripeCustomerId: String,
    paymentDate: Date,
    subscriptionExpiryDate: Date,
    subscriptionStatus: {
      type: String,
      enum: ["active", "expired", "none"],
      default: "none",
    },
    userType: {
      type: String,
      enum: ["user", "admin", "wallet"],
      default: "user",
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;


