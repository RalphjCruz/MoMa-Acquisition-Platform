const mongoose = require("mongoose");
const Acquisition = require("../models/acquisition.model");
const User = require("../models/user.model");
const Artwork = require("../models/artwork.model");
const { normalizeSortOrder, parsePositiveInteger } = require("../utils/query");
const { ensureValidUserId, createServiceError } = require("./user.service");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const STATUS_VALUES = new Set(["considering", "approved", "acquired", "rejected"]);
const CREATE_ALLOWED_FIELDS = new Set([
  "userId",
  "artworkId",
  "status",
  "proposedPrice",
  "finalPrice",
  "currency",
  "acquisitionDate",
  "notes"
]);
const UPDATE_ALLOWED_FIELDS = new Set([
  "status",
  "proposedPrice",
  "finalPrice",
  "currency",
  "acquisitionDate",
  "notes"
]);

const ensureValidAcquisitionId = (id) => {
  const rawId = String(id ?? "").trim();
  if (!mongoose.isValidObjectId(rawId)) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "Acquisition id must be a valid MongoDB _id."
    );
  }

  return rawId;
};

const normalizeText = (value, fallback = "") => {
  if (value === undefined || value === null) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
};

const parseOptionalPrice = (value, fieldName) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      `${fieldName} must be a non-negative number.`
    );
  }

  return price;
};

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      `${fieldName} must be a valid date value.`
    );
  }

  return parsed;
};

const parseStatus = (value, fallback = "considering") => {
  const status = normalizeText(value, fallback).toLowerCase();
  if (!STATUS_VALUES.has(status)) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      `status must be one of: ${Array.from(STATUS_VALUES).join(", ")}.`
    );
  }

  return status;
};

const validatePayloadShape = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "Request body must be a JSON object."
    );
  }
};

const ensureUserExists = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw createServiceError(404, "USER_NOT_FOUND", "User not found.");
  }
  return user;
};

const resolveArtworkReference = async (inputArtworkId) => {
  const rawId = String(inputArtworkId ?? "").trim();
  if (!rawId) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "artworkId is required."
    );
  }

  let artwork = null;

  if (/^\d+$/.test(rawId)) {
    artwork = await Artwork.findOne({ objectId: Number.parseInt(rawId, 10) });
  } else if (mongoose.isValidObjectId(rawId)) {
    artwork = await Artwork.findById(rawId);
  } else {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "artworkId must be a numeric objectId or valid MongoDB _id."
    );
  }

  if (!artwork) {
    throw createServiceError(404, "ARTWORK_NOT_FOUND", "Artwork not found.");
  }

  return artwork;
};

const validateCreateAcquisitionPayload = async (payload) => {
  validatePayloadShape(payload);

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

  const userId = ensureValidUserId(payload.userId);
  const artwork = await resolveArtworkReference(payload.artworkId);

  await ensureUserExists(userId);

  const status = parseStatus(payload.status);
  return {
    userId,
    artworkId: artwork._id,
    status,
    proposedPrice: parseOptionalPrice(payload.proposedPrice, "proposedPrice"),
    finalPrice: parseOptionalPrice(payload.finalPrice, "finalPrice"),
    currency: normalizeText(payload.currency, "EUR"),
    acquisitionDate: parseOptionalDate(payload.acquisitionDate, "acquisitionDate"),
    notes: normalizeText(payload.notes, ""),
    statusHistory: [{ status, changedAt: new Date() }]
  };
};

const validateUpdateAcquisitionPayload = (payload) => {
  validatePayloadShape(payload);

  const keys = Object.keys(payload);
  if (keys.length === 0) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "At least one field is required for update."
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "userId") ||
    Object.prototype.hasOwnProperty.call(payload, "artworkId")
  ) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "userId and artworkId cannot be updated."
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
  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    updateData.status = parseStatus(payload.status);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "proposedPrice")) {
    updateData.proposedPrice = parseOptionalPrice(
      payload.proposedPrice,
      "proposedPrice"
    );
  }
  if (Object.prototype.hasOwnProperty.call(payload, "finalPrice")) {
    updateData.finalPrice = parseOptionalPrice(payload.finalPrice, "finalPrice");
  }
  if (Object.prototype.hasOwnProperty.call(payload, "currency")) {
    updateData.currency = normalizeText(payload.currency, "EUR");
  }
  if (Object.prototype.hasOwnProperty.call(payload, "acquisitionDate")) {
    updateData.acquisitionDate = parseOptionalDate(
      payload.acquisitionDate,
      "acquisitionDate"
    );
  }
  if (Object.prototype.hasOwnProperty.call(payload, "notes")) {
    updateData.notes = normalizeText(payload.notes, "");
  }

  return updateData;
};

const acquisitionPopulate = [
  { path: "userId", select: "displayName email role" },
  {
    path: "artworkId",
    select: "objectId title artistDisplayName department classification"
  }
];

const listAcquisitions = async (query) => {
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInteger(query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status) {
    filter.status = parseStatus(query.status);
  }
  if (query.userId) {
    filter.userId = ensureValidUserId(query.userId);
  }

  const sortDirection = normalizeSortOrder(query.order);
  const sortMap = {
    acquisitionDate: { acquisitionDate: sortDirection },
    status: { status: sortDirection },
    createdAt: { createdAt: sortDirection }
  };
  const sort = sortMap[query.sortBy] ?? { createdAt: -1 };

  const [data, totalItems] = await Promise.all([
    Acquisition.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(acquisitionPopulate),
    Acquisition.countDocuments(filter)
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

const getAcquisitionById = async (id) => {
  const acquisitionId = ensureValidAcquisitionId(id);
  const acquisition = await Acquisition.findById(acquisitionId).populate(
    acquisitionPopulate
  );

  if (!acquisition) {
    throw createServiceError(
      404,
      "ACQUISITION_NOT_FOUND",
      "Acquisition not found."
    );
  }

  return acquisition;
};

const createAcquisition = async (payload) => {
  const acquisitionData = await validateCreateAcquisitionPayload(payload);

  try {
    const created = await Acquisition.create(acquisitionData);
    return await created.populate(acquisitionPopulate);
  } catch (error) {
    if (error?.code === 11000) {
      throw createServiceError(
        409,
        "DUPLICATE_ACQUISITION",
        "Acquisition for this user and artwork already exists."
      );
    }
    throw error;
  }
};

const updateAcquisition = async (id, payload) => {
  const acquisitionId = ensureValidAcquisitionId(id);
  const updateData = validateUpdateAcquisitionPayload(payload);

  const acquisition = await Acquisition.findById(acquisitionId);
  if (!acquisition) {
    throw createServiceError(
      404,
      "ACQUISITION_NOT_FOUND",
      "Acquisition not found."
    );
  }

  const statusChanged =
    Object.prototype.hasOwnProperty.call(updateData, "status") &&
    updateData.status !== acquisition.status;

  Object.assign(acquisition, updateData);
  if (statusChanged) {
    acquisition.statusHistory.push({
      status: updateData.status,
      changedAt: new Date()
    });
  }

  await acquisition.save();
  return await acquisition.populate(acquisitionPopulate);
};

const deleteAcquisition = async (id) => {
  const acquisitionId = ensureValidAcquisitionId(id);
  const deleted = await Acquisition.findByIdAndDelete(acquisitionId).populate(
    acquisitionPopulate
  );

  if (!deleted) {
    throw createServiceError(
      404,
      "ACQUISITION_NOT_FOUND",
      "Acquisition not found."
    );
  }

  return deleted;
};

const listAcquisitionsByUser = async (userId, query = {}) => {
  const validUserId = ensureValidUserId(userId);
  await ensureUserExists(validUserId);
  return listAcquisitions({ ...query, userId: validUserId });
};

module.exports = {
  listAcquisitions,
  getAcquisitionById,
  createAcquisition,
  updateAcquisition,
  deleteAcquisition,
  listAcquisitionsByUser
};

