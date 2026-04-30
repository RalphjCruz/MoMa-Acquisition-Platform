const express = require("express");
const {
  getUsers,
  getUserById
} = require("../controllers/user.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, authorizeRoles("manager"));

router.get("/", getUsers);
router.get("/:id", getUserById);

module.exports = router;
