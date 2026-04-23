const express = require("express");
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserAcquisitions
} = require("../controllers/user.controller");

const router = express.Router();

router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id/acquisitions", getUserAcquisitions);
router.get("/:id", getUserById);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;

