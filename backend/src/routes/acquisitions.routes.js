const express = require("express");
const {
  getAcquisitions,
  getAcquisitionById,
  createAcquisition,
  updateAcquisition,
  deleteAcquisition,
  createPurchaseRequests,
  getMyAcquisitions
} = require("../controllers/acquisition.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/purchase-requests",
  authenticate,
  authorizeRoles("buyer", "manager"),
  createPurchaseRequests
);
router.get("/my", authenticate, authorizeRoles("buyer", "manager"), getMyAcquisitions);

router.use(authenticate, authorizeRoles("manager"));

router.post("/", createAcquisition);
router.get("/", getAcquisitions);
router.get("/:id", getAcquisitionById);
router.patch("/:id", updateAcquisition);
router.delete("/:id", deleteAcquisition);

module.exports = router;
