const acquisitionService = require("../services/acquisition.service");

const getAcquisitions = async (req, res, next) => {
  try {
    const result = await acquisitionService.listAcquisitions(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getAcquisitionById = async (req, res, next) => {
  try {
    const acquisition = await acquisitionService.getAcquisitionById(req.params.id);
    res.status(200).json({ data: acquisition });
  } catch (error) {
    next(error);
  }
};

const createAcquisition = async (req, res, next) => {
  try {
    const acquisition = await acquisitionService.createAcquisition(req.body);
    res.status(201).json({ data: acquisition });
  } catch (error) {
    next(error);
  }
};

const updateAcquisition = async (req, res, next) => {
  try {
    const acquisition = await acquisitionService.updateAcquisition(
      req.params.id,
      req.body
    );
    res.status(200).json({ data: acquisition });
  } catch (error) {
    next(error);
  }
};

const deleteAcquisition = async (req, res, next) => {
  try {
    const acquisition = await acquisitionService.deleteAcquisition(req.params.id);
    res.status(200).json({ data: acquisition });
  } catch (error) {
    next(error);
  }
};

const createPurchaseRequests = async (req, res, next) => {
  try {
    const result = await acquisitionService.createPendingPurchaseRequests(
      req.auth.userId,
      req.body
    );
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
};

const getMyAcquisitions = async (req, res, next) => {
  try {
    const result = await acquisitionService.listAcquisitionsByUser(
      req.auth.userId,
      req.query
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAcquisitions,
  getAcquisitionById,
  createAcquisition,
  updateAcquisition,
  deleteAcquisition,
  createPurchaseRequests,
  getMyAcquisitions
};
