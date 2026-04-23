const artworkService = require("../services/artwork.service");

const getArtworks = async (req, res, next) => {
  try {
    const result = await artworkService.listArtworks(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getArtworks
};

