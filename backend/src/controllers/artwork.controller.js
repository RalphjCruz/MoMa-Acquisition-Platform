const artworkService = require("../services/artwork.service");

const getArtworks = async (req, res, next) => {
  try {
    const result = await artworkService.listArtworks(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getArtworkById = async (req, res, next) => {
  try {
    const artwork = await artworkService.getArtworkById(req.params.id);
    res.status(200).json({ data: artwork });
  } catch (error) {
    next(error);
  }
};

const createArtwork = async (req, res, next) => {
  try {
    const artwork = await artworkService.createArtwork(req.body);
    res.status(201).json({ data: artwork });
  } catch (error) {
    next(error);
  }
};

const updateArtwork = async (req, res, next) => {
  try {
    const artwork = await artworkService.updateArtwork(req.params.id, req.body);
    res.status(200).json({ data: artwork });
  } catch (error) {
    next(error);
  }
};

const deleteArtwork = async (req, res, next) => {
  try {
    const artwork = await artworkService.deleteArtwork(req.params.id);
    res.status(200).json({ data: artwork });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getArtworks,
  getArtworkById,
  createArtwork,
  updateArtwork,
  deleteArtwork
};
