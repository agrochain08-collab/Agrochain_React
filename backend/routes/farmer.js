// ===========================
// IN routes/farmer.js
// ===========================

const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const router = express.Router();
const { upload } = require("../config/cloudinary");
const { 
  getFarmerProfile, updateFarmerProfile,
  addCrop, addBulkCrops,
  getCrops, updateCrop, deleteCrop,
  getFarmerOrders, getFarmerNotifications,
  acceptBid, rejectBid, markNotificationsAsRead
} = require("../controllers/farmercontroller");

// ===========================
// PROFILE ROUTES
// ===========================
router.get("/profile/:email",protect,authorize('farmer'), getFarmerProfile);
router.put("/profile/:email", protect,authorize('farmer'),updateFarmerProfile);

// ===========================
// CROP/PRODUCT MANAGEMENT ROUTES
// ===========================
router.post("/crops/:email", protect, authorize('farmer'), addCrop);
router.post("/crops-bulk/:email", protect, authorize('farmer'), addBulkCrops);
router.get("/crops/:email", protect,authorize('farmer'),getCrops);
router.put("/crops/:email/:id", protect, authorize('farmer'), updateCrop);
router.delete("/crops/:email/:id",protect,authorize('farmer'), deleteCrop);

// ===========================
// ORDER AND NOTIFICATION ROUTES
// ===========================
router.get("/orders/:email",protect,authorize('farmer'), getFarmerOrders);
router.get("/notifications/:email",protect, authorize('farmer'),getFarmerNotifications);
router.post("/notifications/:email/mark-read", protect,authorize('farmer'),markNotificationsAsRead);  // ADD THIS LINE

router.post("/accept-bid/:email",protect,authorize('farmer'), acceptBid);
router.post("/reject-bid/:email",protect,authorize('farmer'), rejectBid);

module.exports = router;