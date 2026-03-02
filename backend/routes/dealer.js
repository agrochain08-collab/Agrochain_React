const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const router = express.Router();
const { 
  getDealerProfile, 
  updateDealerProfile, 
  addVehicle, 
  getVehicles,
  updateVehicleStatus,
  deleteVehicle,
  getAllProducts,
  assignVehicle,
  getDealerOrders,
  placeBid,
  freeVehicle,
  getRetailerOrders,
  updateInventoryPrice,
  updateInventoryQuantity,
  removeInventoryItem,
  getFarmerProfileForDealer
} = require("../controllers/dealercontroller");

// ===========================
// PROFILE ROUTES
// ===========================
router.get("/profile/:email", protect,authorize('dealer'),getDealerProfile);
router.put("/profile/:email", protect,authorize('dealer'),updateDealerProfile);

// ===========================
// VEHICLE MANAGEMENT ROUTES
// ===========================
router.post("/vehicles/:email",protect,authorize('dealer'), addVehicle);
router.get("/vehicles/:email", protect,authorize('dealer'),getVehicles);
router.put("/vehicles/:email/:vehicleId",protect,authorize('dealer'), updateVehicleStatus);
router.delete("/vehicles/:email/:vehicleId",protect,authorize('dealer'), deleteVehicle);
router.post("/vehicles/free/:email/:vehicleId",protect,authorize('dealer'), freeVehicle);

// ===========================
// PRODUCT BROWSING ROUTES
// ===========================
router.get("/all-products",protect,authorize('dealer'), getAllProducts);

// ===========================
// ORDER MANAGEMENT ROUTES (from Farmer)
// ===========================
router.post("/assign-vehicle",protect,authorize('dealer'), assignVehicle);
router.get("/orders/:email",protect, authorize('dealer'),getDealerOrders);

// ===========================
// BIDDING ROUTES
// ===========================
router.post("/place-bid", protect,authorize('dealer'),placeBid);

// ===========================
// INVENTORY MANAGEMENT ROUTES (NEW)
// ===========================
router.put("/inventory/update-price",protect,authorize('dealer'), updateInventoryPrice);
router.put("/inventory/update-quantity",protect,authorize('dealer'), updateInventoryQuantity);
router.delete("/inventory/remove", protect,authorize('dealer'),removeInventoryItem);

// ===========================
// RETAILER ORDER ROUTES (for Dealer to see)
// ===========================
router.get("/retailer-orders/:email",protect, authorize('dealer'),getRetailerOrders);

// ===========================
// FARMER PROFILE ROUTE (for Dealer to view Farmer details)
// ===========================
router.get("/farmer-profile/:farmerEmail", protect, authorize('dealer'), getFarmerProfileForDealer);

module.exports = router;