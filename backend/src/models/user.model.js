const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    role: {
      type: String,
      enum: ["buyer", "manager", "admin"],
      default: "buyer"
    }
  },
  {
    timestamps: true
  }
);

userSchema.index({ role: 1 });
userSchema.index({ displayName: 1 });

module.exports = mongoose.model("User", userSchema);
