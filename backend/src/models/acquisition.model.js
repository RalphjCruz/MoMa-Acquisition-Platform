const mongoose = require("mongoose");
const { ACQUISITION_STATUS_ENUM } = require("../constants/acquisition-status");

const acquisitionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    artworkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artwork",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ACQUISITION_STATUS_ENUM,
      default: "pending"
    },
    requestedQuantity: {
      type: Number,
      min: 1,
      default: 1
    },
    proposedPrice: {
      type: Number,
      min: 0,
      default: null
    },
    finalPrice: {
      type: Number,
      min: 0,
      default: null
    },
    currency: {
      type: String,
      trim: true,
      default: "EUR"
    },
    acquisitionDate: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ACQUISITION_STATUS_ENUM,
          required: true
        },
        changedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

acquisitionSchema.index({ userId: 1, artworkId: 1 }, { unique: true });
acquisitionSchema.index({ status: 1 });
acquisitionSchema.index({ acquisitionDate: -1 });

module.exports = mongoose.model("Acquisition", acquisitionSchema);
