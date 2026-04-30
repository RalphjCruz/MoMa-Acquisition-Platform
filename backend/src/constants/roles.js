const USER_ROLE_ENUM = ["buyer", "manager", "admin"];
const ASSIGNABLE_ROLE_VALUES = new Set(["buyer", "manager"]);

const normalizeRole = (role, fallback = "buyer") => {
  const raw = String(role ?? fallback).trim().toLowerCase();
  if (raw === "admin") {
    return "manager";
  }
  return raw || fallback;
};

module.exports = {
  USER_ROLE_ENUM,
  ASSIGNABLE_ROLE_VALUES,
  normalizeRole
};
