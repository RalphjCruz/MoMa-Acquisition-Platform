const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const { normalizeRole } = require("../constants/roles");
const { authJwtSecret } = require("../config/env");

const createAuthError = (statusCode, code, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization ?? "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw createAuthError(
        401,
        "AUTH_REQUIRED",
        "Authorization Bearer token is required."
      );
    }

    const decoded = jwt.verify(token, authJwtSecret);
    const user = await User.findById(decoded.sub);
    if (!user) {
      throw createAuthError(401, "INVALID_TOKEN", "Invalid or expired token.");
    }

    req.auth = {
      userId: String(user._id),
      role: user.role,
      email: user.email
    };
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      next(createAuthError(401, "INVALID_TOKEN", "Invalid or expired token."));
      return;
    }
    next(error);
  }
};

const authorizeRoles = (...roles) => (req, _res, next) => {
  const rawRole = req?.auth?.role;
  const role = normalizeRole(rawRole, "");
  if (!role || !roles.includes(role)) {
    next(createAuthError(403, "FORBIDDEN", "Insufficient permissions."));
    return;
  }

  next();
};

module.exports = {
  authenticate,
  authorizeRoles
};
