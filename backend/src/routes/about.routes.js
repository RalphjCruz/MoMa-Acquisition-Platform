const express = require("express");
const path = require("path");

const router = express.Router();

router.get("/", (_req, res) => {
  const aboutPath = path.join(__dirname, "..", "views", "about.html");
  res.sendFile(aboutPath);
});

module.exports = router;

