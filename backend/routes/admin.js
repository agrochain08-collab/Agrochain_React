const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  getStats,
  getUsers,
  deleteUser,
  deactivateUser,
  getLogs,
  getAllProducts,
  adminDeleteProduct,
  getRepresentatives,
  addRepresentative,
  deleteRepresentative,
  checkRepresentative,
} = require("../controllers/admincontroller");


// ====================
// Admin routes
// ====================
router.get("/stats", protect, authorize('admin'), getStats);
router.get("/users", protect, authorize('admin'), getUsers);
router.delete("/users/:id", protect, authorize('admin'), deleteUser);
router.put("/deactivate/:id", protect, authorize('admin'), deactivateUser);
router.get("/logs", protect, authorize('admin'), getLogs);

router.get("/products", protect, authorize('admin'), getAllProducts);
router.delete("/products/:farmerEmail/:cropId", protect, authorize('admin'), adminDeleteProduct);

// ====================
// Representative routes
// ====================
// Public check (used during login - no admin auth needed)
router.get("/representatives/check/:email", checkRepresentative);

// Protected CRUD (admin only)
router.get("/representatives", protect, authorize('admin'), getRepresentatives);
router.post("/representatives", protect, authorize('admin'), addRepresentative);
router.delete("/representatives/:id", protect, authorize('admin'), deleteRepresentative);


module.exports = router;