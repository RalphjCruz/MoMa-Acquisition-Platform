const userService = require("../services/user.service");

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

module.exports = {
  getUsers,
  getUserById
};
