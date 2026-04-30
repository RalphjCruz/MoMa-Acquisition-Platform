const express = require("express");
const {
  getArtworks,
  getArtworkById,
  createArtwork,
  updateArtwork,
  deleteArtwork
} = require("../controllers/artwork.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", getArtworks);
router.get("/:id", getArtworkById);
router.post("/", authenticate, authorizeRoles("manager"), createArtwork);
router.patch("/:id", authenticate, authorizeRoles("manager"), updateArtwork);
router.delete("/:id", authenticate, authorizeRoles("manager"), deleteArtwork);

module.exports = router;
