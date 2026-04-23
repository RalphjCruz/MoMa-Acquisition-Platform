const express = require("express");

const router = express.Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "moma-acquisition-platform-backend",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

