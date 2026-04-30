const mongoose = require("mongoose");
const User = require("../models/user.model");
const {
  escapeRegex,
  normalizeSortOrder,
  parsePositiveInteger
} = require("../utils/query");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const createServiceError = (statusCode, code, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
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
    filter.$or = [{ username: qRegex }, { displayName: qRegex }, { email: qRegex }];
  }

  const sortDirection = normalizeSortOrder(query.order);
  const sortMap = {
    username: { username: sortDirection },
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

module.exports = {
  listUsers,
  getUserById,
  ensureValidUserId,
  createServiceError
};
