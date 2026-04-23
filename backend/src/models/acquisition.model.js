const mongoose = require("mongoose");

const acquisitionStatusValues = [
  "considering",
  "approved",
  "acquired",
  "rejected"
];

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
      enum: acquisitionStatusValues,
      default: "considering"
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
          enum: acquisitionStatusValues,
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

