const express = require("express");
const {
  getAcquisitions,
  getAcquisitionById,
  createAcquisition,
  updateAcquisition,
  deleteAcquisition
} = require("../controllers/acquisition.controller");

const router = express.Router();

router.post("/", createAcquisition);
router.get("/", getAcquisitions);
router.get("/:id", getAcquisitionById);
router.patch("/:id", updateAcquisition);
router.delete("/:id", deleteAcquisition);

module.exports = router;

