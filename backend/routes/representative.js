const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");
const {
  getPendingCrops,
  claimBatch,
  unclaimBatch,
  getMyAssigned,
  getAllCropsForRep,
  editVerification,
  approveCrop,
  rejectCrop,
  postApprovalEdit,
  getExpiryAlerts,
} = require("../controllers/representativecontroller");

// ── Unassigned queue (all reps see this) ─────────────────────────────────────
router.get("/pending",  protect, getPendingCrops);

// ── Claim / unclaim a batch ───────────────────────────────────────────────────
router.post("/claim/:batchId",   protect, claimBatch);
router.post("/unclaim/:batchId", protect, unclaimBatch);

// ── My assigned verifications ─────────────────────────────────────────────────
router.get("/my-assigned", protect, getMyAssigned);

// ── All crops by status ───────────────────────────────────────────────────────
// ?status=approved|rejected|in_verification   &mine=true
router.get("/crops", protect, getAllCropsForRep);

// ── Expiry alerts ─────────────────────────────────────────────────────────────
router.get("/expiry-alerts", protect, getExpiryAlerts);

// ── Edit during verification (before approve/reject) ──────────────────────────
router.put("/edit/:farmerEmail/:cropId", protect, editVerification);

// ── Approve — multipart: images[] + fieldImages[] ────────────────────────────
router.put(
  "/approve/:farmerEmail/:cropId",
  protect,
  upload.fields([
    { name: "images",      maxCount: 5 },
    { name: "fieldImages", maxCount: 5 },
  ]),
  approveCrop
);

// ── Reject ────────────────────────────────────────────────────────────────────
router.put("/reject/:farmerEmail/:cropId", protect, rejectCrop);

// ── Post-approval admin edit (expiry / remarks / deactivate) ─────────────────
router.put("/admin-edit/:farmerEmail/:cropId", protect, postApprovalEdit);

module.exports = router;