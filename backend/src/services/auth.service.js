const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const AuthCredential = require("../models/auth-credential.model");
const { ASSIGNABLE_ROLE_VALUES, normalizeRole } = require("../constants/roles");
const { authJwtSecret, authTokenTtl } = require("../config/env");
const { createServiceError } = require("./user.service");

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

const parsePassword = (value) => {
  const password = normalizeText(value, "");
  if (password.length < 8) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "password must be at least 8 characters."
    );
  }
  return password;
};

const parseRole = (value, fallback = "buyer") => {
  const role = normalizeRole(normalizeText(value, fallback), fallback);
  if (!ASSIGNABLE_ROLE_VALUES.has(role)) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      `role must be one of: ${Array.from(ASSIGNABLE_ROLE_VALUES).join(", ")}.`
    );
  }

  return role;
};

const sanitizeUser = (user) => ({
  _id: user._id,
  displayName: user.displayName,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const createToken = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      email: user.email
    },
    authJwtSecret,
    { expiresIn: authTokenTtl }
  );

const register = async (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "Request body must be a JSON object."
    );
  }

  const email = parseEmail(payload.email);
  const displayName = parseDisplayName(payload.displayName);
  const password = parsePassword(payload.password);
  const role = parseRole(payload.role, "buyer");

  const existing = await User.findOne({ email });
  if (existing) {
    throw createServiceError(
      409,
      "DUPLICATE_EMAIL",
      `User with email ${email} already exists.`
    );
  }

  const user = await User.create({ email, displayName, role });
  const passwordHash = await bcrypt.hash(password, 12);
  await AuthCredential.create({ userId: user._id, passwordHash });

  const token = createToken(user);
  return { token, user: sanitizeUser(user) };
};

const login = async (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createServiceError(
      400,
      "VALIDATION_ERROR",
      "Request body must be a JSON object."
    );
  }

  const email = parseEmail(payload.email);
  const password = parsePassword(payload.password);

  const user = await User.findOne({ email });
  if (!user) {
    throw createServiceError(401, "INVALID_CREDENTIALS", "Invalid credentials.");
  }

  const credential = await AuthCredential.findOne({ userId: user._id });
  if (!credential) {
    throw createServiceError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid credentials."
    );
  }

  const isValid = await bcrypt.compare(password, credential.passwordHash);
  if (!isValid) {
    throw createServiceError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid credentials."
    );
  }

  const token = createToken(user);
  return { token, user: sanitizeUser(user) };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw createServiceError(401, "INVALID_TOKEN", "Invalid or expired token.");
  }
  return sanitizeUser(user);
};

module.exports = {
  register,
  login,
  sanitizeUser,
  getCurrentUser
};
