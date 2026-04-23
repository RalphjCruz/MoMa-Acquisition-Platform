const Artwork = require("../models/artwork.model");
const mongoose = require("mongoose");
const {
  escapeRegex,
  normalizeSortOrder,
  parsePositiveInteger
} = require("../utils/query");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const CREATE_ALLOWED_FIELDS = new Set([
  "objectId",
  "title",
  "artistDisplayName",
  "department",
  "classification",
  "medium",
  "dateText",
  "dateAcquired",
  "creditLine",
  "isPublicDomain",
  "tags"
]);

const UPDATE_ALLOWED_FIELDS = new Set([
  "title",
  "artistDisplayName",
  "department",
  "classification",
  "medium",
  "dateText",
  "dateAcquired",
  "creditLine",
  "isPublicDomain",
  "tags"
]);

const createServiceError = (statusCode, code, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const normalizeText = (value, fallback = "") => {
  if (value === undefined || value === null) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
};

const parseRequiredObjectId = (value) => {
  if (value === undefined || value === null) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "objectId is required and must be a positive integer."
    );
  }

  const asNumber =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(asNumber) || asNumber <= 0) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "objectId must be a positive integer."
    );
  }

  return asNumber;
};

const parseRequiredTitle = (value) => {
  const title = normalizeText(value, "");

  if (!title) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "title is required and cannot be empty."
    );
  }

  return title;
};

const parseOptionalDate = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "dateAcquired must be a valid date value."
    );
  }

  return parsed;
};

const parseOptionalBoolean = (value, fieldName) => {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lowered = value.toLowerCase().trim();
    if (lowered === "true") {
      return true;
    }
    if (lowered === "false") {
      return false;
    }
  }

  throw createServiceError(
    400,
    "VALIDATION_ERROR",
    `${fieldName} must be a boolean value.`
  );
};

const parseOptionalTags = (value) => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "tags must be an array of strings."
    );
  }

  return value.map((item) => normalizeText(item, "")).filter(Boolean);
};

const parseStrictBoolean = (value, fieldName) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lowered = value.toLowerCase().trim();
    if (lowered === "true") {
      return true;
    }
    if (lowered === "false") {
      return false;
    }
  }

  throw createServiceError(
    400,
    "VALIDATION_ERROR",
    `${fieldName} must be a boolean value.`
  );
};

const validateCreateArtworkPayload = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "Request body must be a JSON object."
    );
  }

  const unknownFields = Object.keys(payload).filter(
    (field) => !CREATE_ALLOWED_FIELDS.has(field)
  );

  if (unknownFields.length > 0) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      `Unknown field(s): ${unknownFields.join(", ")}.`
    );
  }

  return {
    objectId: parseRequiredObjectId(payload.objectId),
    title: parseRequiredTitle(payload.title),
    artistDisplayName: normalizeText(payload.artistDisplayName, "Unknown Artist"),
    department: normalizeText(payload.department, "Unknown"),
    classification: normalizeText(payload.classification, "Unknown"),
    medium: normalizeText(payload.medium, ""),
    dateText: normalizeText(payload.dateText, ""),
    dateAcquired: parseOptionalDate(payload.dateAcquired),
    creditLine: normalizeText(payload.creditLine, ""),
    isPublicDomain: parseOptionalBoolean(payload.isPublicDomain, "isPublicDomain"),
    tags: parseOptionalTags(payload.tags)
  };
};

const validateUpdateArtworkPayload = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "Request body must be a JSON object."
    );
  }

  const keys = Object.keys(payload);
  if (keys.length === 0) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "At least one field is required for update."
    );
  }

  if (Object.prototype.hasOwnProperty.call(payload, "objectId")) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "objectId cannot be updated."
    );
  }

  const unknownFields = keys.filter((field) => !UPDATE_ALLOWED_FIELDS.has(field));
  if (unknownFields.length > 0) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      `Unknown field(s): ${unknownFields.join(", ")}.`
    );
  }

  const updateData = {};

  if (Object.prototype.hasOwnProperty.call(payload, "title")) {
    updateData.title = parseRequiredTitle(payload.title);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "artistDisplayName")) {
    updateData.artistDisplayName = normalizeText(payload.artistDisplayName, "Unknown Artist");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "department")) {
    updateData.department = normalizeText(payload.department, "Unknown");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "classification")) {
    updateData.classification = normalizeText(payload.classification, "Unknown");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "medium")) {
    updateData.medium = normalizeText(payload.medium, "");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "dateText")) {
    updateData.dateText = normalizeText(payload.dateText, "");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "dateAcquired")) {
    updateData.dateAcquired = parseOptionalDate(payload.dateAcquired);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "creditLine")) {
    updateData.creditLine = normalizeText(payload.creditLine, "");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "isPublicDomain")) {
    updateData.isPublicDomain = parseStrictBoolean(
      payload.isPublicDomain,
      "isPublicDomain"
    );
  }

  if (Object.prototype.hasOwnProperty.call(payload, "tags")) {
    updateData.tags = parseOptionalTags(payload.tags);
  }

  return updateData;
};

const resolveArtworkIdQuery = (id) => {
  const rawId = String(id ?? "").trim();

  if (!rawId) {
    throw createServiceError(400, "VALIDATION_ERROR", "Artwork id is required.");
  }

  if (/^\d+$/.test(rawId)) {
    return { objectId: Number.parseInt(rawId, 10) };
  }

  if (mongoose.isValidObjectId(rawId)) {
    return { _id: rawId };
  }

  throw createServiceError(
    400,
    "VALIDATION_ERROR",
    "Artwork id must be a numeric ObjectID or a valid MongoDB _id."
  );
};

const buildArtworkFilter = (query) => {
  const filter = {};

  if (query.department) {
    filter.department = query.department;
  }

  if (query.classification) {
    filter.classification = query.classification;
  }

  if (query.artist) {
    filter.artistDisplayName = new RegExp(escapeRegex(query.artist), "i");
  }

  if (query.q) {
    const qRegex = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [
      { title: qRegex },
      { artistDisplayName: qRegex },
      { medium: qRegex },
      { classification: qRegex }
    ];
  }

  return filter;
};

const resolveSort = (sortBy, order) => {
  const direction = normalizeSortOrder(order);
  const sortMap = {
    title: { title: direction },
    artist: { artistDisplayName: direction },
    dateAcquired: { dateAcquired: direction },
    createdAt: { createdAt: direction }
  };

  return sortMap[sortBy] ?? { createdAt: -1 };
};

const listArtworks = async (query) => {
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInteger(query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = buildArtworkFilter(query);
  const sort = resolveSort(query.sortBy, query.order);

  const [data, totalItems] = await Promise.all([
    Artwork.find(filter).sort(sort).skip(skip).limit(limit),
    Artwork.countDocuments(filter)
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit))
    }
  };
};

const getArtworkById = async (id) => {
  const artwork = await Artwork.findOne(resolveArtworkIdQuery(id));

  if (!artwork) {
    throw createServiceError(404, "ARTWORK_NOT_FOUND", "Artwork not found.");
  }

  return artwork;
};

const createArtwork = async (payload) => {
  const artworkData = validateCreateArtworkPayload(payload);

  const existingArtwork = await Artwork.findOne({ objectId: artworkData.objectId });
  if (existingArtwork) {
    throw createServiceError(
      409,
      "DUPLICATE_OBJECT_ID",
      `Artwork with objectId ${artworkData.objectId} already exists.`
    );
  }

  try {
    const created = await Artwork.create(artworkData);
    return created;
  } catch (error) {
    if (error?.code === 11000) {
      throw createServiceError(
        409,
        "DUPLICATE_OBJECT_ID",
        `Artwork with objectId ${artworkData.objectId} already exists.`
      );
    }

    throw error;
  }
};

const updateArtwork = async (id, payload) => {
  const query = resolveArtworkIdQuery(id);
  const updateData = validateUpdateArtworkPayload(payload);

  const updated = await Artwork.findOneAndUpdate(
    query,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw createServiceError(404, "ARTWORK_NOT_FOUND", "Artwork not found.");
  }

  return updated;
};

const deleteArtwork = async (id) => {
  const query = resolveArtworkIdQuery(id);
  const deleted = await Artwork.findOneAndDelete(query);

  if (!deleted) {
    throw createServiceError(404, "ARTWORK_NOT_FOUND", "Artwork not found.");
  }

  return deleted;
};

module.exports = {
  listArtworks,
  getArtworkById,
  createArtwork,
  updateArtwork,
  deleteArtwork
};
