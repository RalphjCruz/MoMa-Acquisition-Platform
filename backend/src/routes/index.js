const express = require("express");

const healthRoutes = require("./health.routes");
const aboutRoutes = require("./about.routes");
const authRoutes = require("./auth.routes");
const artworksRoutes = require("./artworks.routes");
const usersRoutes = require("./users.routes");
const acquisitionsRoutes = require("./acquisitions.routes");

const router = express.Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    message: "MoMA Acquisition Intelligence Platform API",
    health: "/api/health",
    about: "/about",
    resources: {
      artworks: "/api/artworks",
      users: "/api/users",
      acquisitions: "/api/acquisitions"
    }
  });
});

router.use("/api/health", healthRoutes);
router.use("/api/auth", authRoutes);
router.use("/api/artworks", artworksRoutes);
router.use("/api/users", usersRoutes);
router.use("/api/acquisitions", acquisitionsRoutes);
router.use("/about", aboutRoutes);

module.exports = router;
