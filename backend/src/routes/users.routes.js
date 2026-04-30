const express = require("express");
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserAcquisitions
} = require("../controllers/user.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, authorizeRoles("manager"));

router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id/acquisitions", getUserAcquisitions);
router.get("/:id", getUserById);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
