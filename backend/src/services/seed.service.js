const fs = require("fs/promises");
const path = require("path");
const Artwork = require("../models/artwork.model");

const parseDateOrNull = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeText = (value, fallback = "") => {
  if (Array.isArray(value)) {
    const combined = value
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
      .join(", ");

    return combined || fallback;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  const asString = String(value).trim();
  return asString || fallback;
};

const normalizeArtwork = (item) => {
  const objectId = Number(item.ObjectID);

  if (!Number.isFinite(objectId)) {
    return null;
  }

  const tagTerms = Array.isArray(item.Tags)
    ? item.Tags.map((tag) => tag?.Term).filter(Boolean)
    : [];

  return {
    objectId,
    title: normalizeText(item.Title, "Untitled"),
    artistDisplayName: normalizeText(item.Artist, "Unknown Artist"),
    department: normalizeText(item.Department, "Unknown"),
    classification: normalizeText(item.Classification, "Unknown"),
    medium: normalizeText(item.Medium, ""),
    dateText: normalizeText(item.Date, ""),
    dateAcquired: parseDateOrNull(item.DateAcquired),
    creditLine: normalizeText(item.CreditLine, ""),
    isPublicDomain: Boolean(item.IsPublicDomain),
    tags: tagTerms
  };
};

const seedArtworksFromSubset = async () => {
  const existingCount = await Artwork.countDocuments();
  if (existingCount > 0) {
    return {
      seeded: false,
      reason: "Artwork collection already contains data.",
      currentCount: existingCount
    };
  }

  const subsetPath = path.join(__dirname, "..", "..", "data", "moma_subset_200.json");
  const rawData = await fs.readFile(subsetPath, "utf8");
  const parsedItems = JSON.parse(rawData.replace(/^\uFEFF/, ""));

  if (!Array.isArray(parsedItems)) {
    throw new Error("Subset file must contain an array of artwork objects.");
  }

  const operations = parsedItems
    .map(normalizeArtwork)
    .filter(Boolean)
    .map((doc) => ({
      updateOne: {
        filter: { objectId: doc.objectId },
        update: { $set: doc },
        upsert: true
      }
    }));

  if (operations.length === 0) {
    throw new Error("No valid artwork records were found in subset file.");
  }

  await Artwork.bulkWrite(operations);
  const totalAfterSeed = await Artwork.countDocuments();

  return {
    seeded: true,
    importedRecords: operations.length,
    totalAfterSeed
  };
};

module.exports = {
  seedArtworksFromSubset
};
