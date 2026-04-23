const express = require("express");
const { getArtworks } = require("../controllers/artwork.controller");

const router = express.Router();

router.get("/", getArtworks);

module.exports = router;

