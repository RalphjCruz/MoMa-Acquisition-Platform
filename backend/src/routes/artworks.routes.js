const express = require("express");
const {
  getArtworks,
  getArtworkById,
  createArtwork,
  updateArtwork,
  deleteArtwork
} = require("../controllers/artwork.controller");

const router = express.Router();

router.post("/", createArtwork);
router.get("/", getArtworks);
router.patch("/:id", updateArtwork);
router.delete("/:id", deleteArtwork);
router.get("/:id", getArtworkById);

module.exports = router;
