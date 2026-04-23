const express = require("express");

const healthRoutes = require("./health.routes");
const aboutRoutes = require("./about.routes");

const router = express.Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    message: "MoMA Acquisition Intelligence Platform API",
    health: "/api/health",
    about: "/about"
  });
});

router.use("/api/health", healthRoutes);
router.use("/about", aboutRoutes);

module.exports = router;

