const mongoose = require("mongoose");
const User = require("../models/user.model");
const Acquisition = require("../models/acquisition.model");
const {
  escapeRegex,
  normalizeSortOrder,
  parsePositiveInteger
} = require("../utils/query");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const USER_ALLOWED_FIELDS = new Set(["displayName", "email", "role"]);
const ROLE_VALUES = new Set(["buyer", "manager", "admin"]);

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

const parseEmail = (value) => {
  const email = normalizeText(value, "").toLowerCase();
  if (!email) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "email is required and cannot be empty."
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createServiceError(400, "VALIDATION_ERROR", "email must be valid.");
  }

  return email;
};

const parseDisplayName = (value) => {
  const displayName = normalizeText(value, "");
  if (!displayName) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "displayName is required and cannot be empty."
    );
  }

  return displayName;
};

const parseRole = (value, fallback = "buyer") => {
  const role = normalizeText(value, fallback).toLowerCase();
  if (!ROLE_VALUES.has(role)) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      `role must be one of: ${Array.from(ROLE_VALUES).join(", ")}.`
    );
  }

  return role;
};

const ensureValidUserId = (id) => {
  const rawId = String(id ?? "").trim();
  if (!mongoose.isValidObjectId(rawId)) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "User id must be a valid MongoDB _id."
    );
  }

  return rawId;
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

const validateCreateUserPayload = (payload) => {
  validatePayloadShape(payload);

  const unknownFields = Object.keys(payload).filter(
    (field) => !USER_ALLOWED_FIELDS.has(field)
  );
  if (unknownFields.length > 0) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      `Unknown field(s): ${unknownFields.join(", ")}.`
    );
  }

  return {
    displayName: parseDisplayName(payload.displayName),
    email: parseEmail(payload.email),
    role: parseRole(payload.role)
  };
};

const validateUpdateUserPayload = (payload) => {
  validatePayloadShape(payload);

  const keys = Object.keys(payload);
  if (keys.length === 0) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "At least one field is required for update."
    );
  }

  const unknownFields = keys.filter((field) => !USER_ALLOWED_FIELDS.has(field));
  if (unknownFields.length > 0) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      `Unknown field(s): ${unknownFields.join(", ")}.`
    );
  }

  const updateData = {};
  if (Object.prototype.hasOwnProperty.call(payload, "displayName")) {
    updateData.displayName = parseDisplayName(payload.displayName);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "email")) {
    updateData.email = parseEmail(payload.email);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "role")) {
    updateData.role = parseRole(payload.role);
  }

  return updateData;
};

const listUsers = async (query) => {
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInteger(query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.role) {
    filter.role = query.role;
  }

  if (query.q) {
    const qRegex = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ displayName: qRegex }, { email: qRegex }];
  }

  const sortDirection = normalizeSortOrder(query.order);
  const sortMap = {
    displayName: { displayName: sortDirection },
    email: { email: sortDirection },
    role: { role: sortDirection },
    createdAt: { createdAt: sortDirection }
  };
  const sort = sortMap[query.sortBy] ?? { createdAt: -1 };

  const [data, totalItems] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter)
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

const getUserById = async (id) => {
  const userId = ensureValidUserId(id);
  const user = await User.findById(userId);
  if (!user) {
    throw createServiceError(404, "USER_NOT_FOUND", "User not found.");
  }
  return user;
};

const createUser = async (payload) => {
  const userData = validateCreateUserPayload(payload);

  try {
    return await User.create(userData);
  } catch (error) {
    if (error?.code === 11000) {
      throw createServiceError(
        409,
        "DUPLICATE_EMAIL",
        `User with email ${userData.email} already exists.`
      );
    }
    throw error;
  }
};

const updateUser = async (id, payload) => {
  const userId = ensureValidUserId(id);
  const updateData = validateUpdateUserPayload(payload);

  try {
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw createServiceError(404, "USER_NOT_FOUND", "User not found.");
    }

    return updated;
  } catch (error) {
    if (error?.code === 11000) {
      throw createServiceError(
        409,
        "DUPLICATE_EMAIL",
        `User with email ${updateData.email} already exists.`
      );
    }
    throw error;
  }
};

const deleteUser = async (id) => {
  const userId = ensureValidUserId(id);
  const acquisitionCount = await Acquisition.countDocuments({ userId });

  if (acquisitionCount > 0) {
    throw createServiceError(
      409,
      "USER_HAS_ACQUISITIONS",
      "Cannot delete user with acquisition records."
    );
  }

  const deleted = await User.findByIdAndDelete(userId);
  if (!deleted) {
    throw createServiceError(404, "USER_NOT_FOUND", "User not found.");
  }

  return deleted;
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  ensureValidUserId,
  createServiceError
};
