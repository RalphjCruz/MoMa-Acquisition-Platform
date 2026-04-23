const express = require("express");
const {
  getArtworks,
  getArtworkById,
  createArtwork
} = require("../controllers/artwork.controller");

const router = express.Router();

router.post("/", createArtwork);
router.get("/", getArtworks);
router.get("/:id", getArtworkById);

module.exports = router;
