const mongoose = require("mongoose");
const { USER_ROLE_ENUM } = require("../constants/roles");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
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
      enum: USER_ROLE_ENUM,
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
