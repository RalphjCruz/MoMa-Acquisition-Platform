const mongoose = require("mongoose");

const artworkSchema = new mongoose.Schema(
  {
    objectId: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    artistDisplayName: {
      type: String,
      default: "Unknown Artist",
      trim: true
    },
    department: {
      type: String,
      default: "Unknown",
      trim: true
    },
    classification: {
      type: String,
      default: "Unknown",
      trim: true
    },
    medium: {
      type: String,
      default: "",
      trim: true
    },
    dateText: {
      type: String,
      default: "",
      trim: true
    },
    dateAcquired: {
      type: Date,
      default: null
    },
    creditLine: {
      type: String,
      default: "",
      trim: true
    },
    isPublicDomain: {
      type: Boolean,
      default: false
    },
    tags: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

artworkSchema.index({
  title: "text",
  artistDisplayName: "text",
  medium: "text",
  classification: "text"
});

artworkSchema.index({ department: 1 });
artworkSchema.index({ classification: 1 });
artworkSchema.index({ dateAcquired: -1 });

module.exports = mongoose.model("Artwork", artworkSchema);

