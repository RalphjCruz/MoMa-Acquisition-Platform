const ACQUISITION_STATUS_ENUM = [
  "pending",
  "considering",
  "approved",
  "acquired",
  "rejected"
];

const ACTIVE_STATUS_VALUES = new Set(["pending", "approved", "acquired", "rejected"]);

const normalizeStatus = (status, fallback = "pending") => {
  const raw = String(status ?? fallback).trim().toLowerCase();
  if (raw === "considering") {
    return "pending";
  }
  return raw || fallback;
};

module.exports = {
  ACQUISITION_STATUS_ENUM,
  ACTIVE_STATUS_VALUES,
  normalizeStatus
};
