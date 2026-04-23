const userService = require("../services/user.service");
const acquisitionService = require("../services/acquisition.service");

const getUsers = async (req, res, next) => {
  try {
    const result = await userService.listUsers(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({ data: user });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ data: user });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json({ data: user });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await userService.deleteUser(req.params.id);
    res.status(200).json({ data: user });
  } catch (error) {
    next(error);
  }
};

const getUserAcquisitions = async (req, res, next) => {
  try {
    const result = await acquisitionService.listAcquisitionsByUser(
      req.params.id,
      req.query
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserAcquisitions
};

