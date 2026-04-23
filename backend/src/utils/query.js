const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const normalizeSortOrder = (value) => {
  if (String(value).toLowerCase() === "asc") {
    return 1;
  }

  return -1;
};

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = {
  parsePositiveInteger,
  normalizeSortOrder,
  escapeRegex
};

