const Artwork = require("../models/artwork.model");
const {
  escapeRegex,
  normalizeSortOrder,
  parsePositiveInteger
} = require("../utils/query");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

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

module.exports = {
  listArtworks
};

