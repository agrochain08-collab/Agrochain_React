const User = require("../models/user");
const Order = require("../models/order");

// Generate unique receipt number
function generateReceiptNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP-${year}${month}${day}-${random}`;
}

// ---------- Get Farmer Profile ----------
exports.getFarmerProfile = async (req, res, next) => {
  try {
    const farmer = await User.findOne({ email: req.params.email, role: "farmer" });
    if (!farmer) return res.status(404).json({ msg: "Farmer not found" });
    res.json(farmer);
  } catch (err) {
    next(err); // Pass error to error middleware
  }
};

// ---------- Update Farmer Profile ----------
exports.updateFarmerProfile = async (req, res, next) => {
  try {
    const farmer = await User.findOneAndUpdate(
      { email: req.params.email, role: "farmer" },
      req.body,
      { new: true }
    );
    if (!farmer) return res.status(404).json({ msg: "Farmer not found" });
    res.json(farmer);
  } catch (err) {
    next(err); // Pass error to error middleware
  }
};

// ---------- Add Crop ----------
exports.addCrop = async (req, res, next) => {
  try {
    const farmer = await User.findOne({ email: req.params.email, role: "farmer" });
    if (!farmer) return res.status(404).json({ msg: "Farmer not found" });

    const {
      productType, varietySpecies, harvestQuantity, unitOfSale,
      targetPrice, availabilityStatus,
      harvestDate, farmerVillage, additionalNotes
    } = req.body;

    if (!productType || !varietySpecies || !harvestQuantity || !unitOfSale || !targetPrice) {
      return res.status(400).json({ msg: "All fields are required" });
    }
    if (isNaN(harvestQuantity) || isNaN(targetPrice)) {
      return res.status(400).json({ msg: "Quantity and price must be valid numbers" });
    }

    // Use a timestamp-based batchId — single submissions get their own unique batch
    const batchId = `${farmer._id}-${Date.now()}`;

    const newCrop = {
      productType,
      varietySpecies,
      harvestQuantity: parseFloat(harvestQuantity),
      unitOfSale,
      targetPrice: parseFloat(targetPrice),
      availabilityStatus: availabilityStatus || "",
      harvestDate: harvestDate ? new Date(harvestDate) : undefined,
      farmerVillage: farmerVillage || farmer.farmLocation || "",
      additionalNotes: additionalNotes || "",
      batchId,
      imageUrl: "",
      verificationStatus: "pending",
      approvalStatus: "pending",
      dateAdded: new Date()
    };

    if (!Array.isArray(farmer.crops)) farmer.crops = [];
    farmer.crops.push(newCrop);
    await farmer.save();

    res.json({ msg: "Product submitted for verification", crop: newCrop });
  } catch (err) {
    next(err);
  }
};

// ---------- Add Multiple Crops (bulk) — all get the SAME batchId ----------
exports.addBulkCrops = async (req, res, next) => {
  try {
    const farmer = await User.findOne({ email: req.params.email, role: "farmer" });
    if (!farmer) return res.status(404).json({ msg: "Farmer not found" });

    const { crops, harvestDate, farmerVillage, additionalNotes } = req.body;
    if (!Array.isArray(crops) || crops.length === 0) {
      return res.status(400).json({ msg: "crops array is required" });
    }

    // ALL crops in this bulk submission share one batchId
    const batchId = `${farmer._id}-${Date.now()}`;
    const errors = [];
    const newCrops = [];

    crops.forEach((c, idx) => {
      const { productType, varietySpecies, harvestQuantity, unitOfSale, targetPrice } = c;
      if (!productType || !varietySpecies || !harvestQuantity || !unitOfSale || !targetPrice) {
        errors.push(`Row ${idx + 1}: all fields required`);
        return;
      }
      if (isNaN(harvestQuantity) || isNaN(targetPrice)) {
        errors.push(`Row ${idx + 1}: quantity and price must be numbers`);
        return;
      }
      newCrops.push({
        productType,
        varietySpecies,
        harvestQuantity: parseFloat(harvestQuantity),
        unitOfSale,
        targetPrice: parseFloat(targetPrice),
        availabilityStatus: c.availabilityStatus || "",
        harvestDate: harvestDate ? new Date(harvestDate) : undefined,
        farmerVillage: farmerVillage || farmer.farmLocation || "",
        additionalNotes: additionalNotes || "",
        batchId,
        imageUrl: "",
        verificationStatus: "pending",
        approvalStatus: "pending",
        dateAdded: new Date()
      });
    });

    if (errors.length > 0) return res.status(400).json({ msg: "Validation errors", errors });

    if (!Array.isArray(farmer.crops)) farmer.crops = [];
    farmer.crops.push(...newCrops);
    await farmer.save();

    res.json({ msg: `${newCrops.length} product(s) submitted for verification`, crops: newCrops, batchId });
  } catch (err) {
    next(err);
  }
};

// ---------- Get Crops ----------
exports.getCrops = async (req, res, next) => {
  try {
    const farmer = await User.findOne({ email: req.params.email, role: "farmer" });
    if (!farmer) return res.status(404).json({ msg: "Farmer not found" });

    const crops = farmer.crops || [];
    crops.sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
    
    res.json(crops);
  } catch (err) {
    next(err); // Pass error to error middleware
  }
};

// ---------- Update Crop ----------
exports.updateCrop = async (req, res, next) => {
  try {
    const farmer = await User.findOne({
      email: req.params.email,
      role: "farmer"
    });

    if (!farmer)
      return res.status(404).json({ msg: "Farmer not found" });

    const cropId = req.params.id;

    const cropIndex = farmer.crops.findIndex(
      c => c._id.toString() === cropId
    );

    if (cropIndex === -1)
      return res.status(404).json({ msg: "Product not found" });

    // ✅ Declare ONLY ONCE
    const crop = farmer.crops[cropIndex];

    // Block edit if already claimed
    const vs = crop.verificationStatus;
    if (vs && vs !== "pending" && vs !== "rejected") {
      return res.status(403).json({
        msg: "Cannot edit — product already claimed for verification."
      });
    }

    const {
      productType,
      varietySpecies,
      harvestQuantity,
      unitOfSale,
      targetPrice,
      availabilityStatus
    } = req.body;

    if (productType) crop.productType = productType;
    if (varietySpecies) crop.varietySpecies = varietySpecies;
    if (harvestQuantity)
      crop.harvestQuantity = parseFloat(harvestQuantity);
    if (unitOfSale) crop.unitOfSale = unitOfSale;
    if (targetPrice)
      crop.targetPrice = parseFloat(targetPrice);
    if (availabilityStatus)
      crop.availabilityStatus = availabilityStatus;

    crop.lastUpdated = new Date();

    await farmer.save();

    res.json({
      msg: "Product updated successfully",
      crop
    });

  } catch (err) {
    next(err);
  }
};

// ---------- Delete Crop ----------
exports.deleteCrop = async (req, res, next) => {
  try {
    const farmer = await User.findOne({ email: req.params.email, role: "farmer" });
    if (!farmer) return res.status(404).json({ msg: "Farmer not found" });

    const cropId = req.params.id;
    const cropIndex = farmer.crops.findIndex(c => c._id.toString() === cropId);
    
    if (cropIndex === -1) {
      return res.status(404).json({ msg: "Product not found" });
    }

    // Block delete once claimed or approved — only allow on pending/rejected
    const cropCheck = farmer.crops[cropIndex];
    const vs = cropCheck.verificationStatus;
    const isForce = req.query.force === 'true';
    if (!isForce && vs && vs !== 'pending' && vs !== 'rejected') {
      return res.status(403).json({ 
        msg: "Cannot delete — this product is currently under verification or approved. Only pending or rejected products can be deleted." 
      });
    }

    const crop = farmer.crops[cropIndex];
    
    // Check if there's an active order for this crop
    const activeOrder = await Order.findOne({ 
      farmerEmail: farmer.email, 
      productId: crop._id.toString(),
      status: { $in: ['Vehicle Assigned', 'In Transit', 'Bid Placed'] }
    });

    // ✅ Only block delete if there is active order AND some stock still left
    if (activeOrder && crop.harvestQuantity > 0) {
      return res.status(400).json({ 
        msg: "Cannot delete product with active vehicle assignment while quantity > 0" 
      });
    }

    farmer.crops.splice(cropIndex, 1);
    await farmer.save();

    res.json({ msg: "Product deleted successfully" });
    
  } catch (err) {
    next(err); // Pass error to error middleware
  }
};

// ---------- Accept Bid ----------
exports.acceptBid = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const { email } = req.params;

    if (!orderId) {
      return res.status(400).json({ msg: "Order ID is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ msg: "Order not found" });
    if (order.farmerEmail !== email)
      return res.status(403).json({ msg: "Unauthorized" });

    if (order.bidStatus !== "Pending") {
      return res.status(400).json({ msg: "Bid already processed" });
    }

    order.bidStatus = "Accepted";
    order.status = "Bid Accepted";
    order.bidResponseDate = new Date();

    const date = new Date();
    const receiptNumber = `RCP-${date.getFullYear()}${String(
      date.getMonth() + 1
    ).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${Math.floor(
      Math.random() * 10000
    )
      .toString()
      .padStart(4, "0")}`;

    order.receiptNumber = receiptNumber;
    order.receiptGeneratedAt = new Date();
    
    await order.save();

    const dealer = await User.findOne({
      email: order.dealerEmail,
      role: "dealer",
    });
    const farmer = await User.findOne({
      email: order.farmerEmail,
      role: "farmer",
    });

    if (!dealer) {
      return res.status(404).json({ msg: "Dealer not found" });
    }

    const productIndex = farmer?.crops?.findIndex(
      (c) => c._id.toString() === order.productId.toString()
    );

    if (farmer && productIndex !== -1) {
      const product = farmer.crops[productIndex];
      product.harvestQuantity -= order.quantity;

      const inventoryItem = {
        productId: order.productId,
        productName: product.varietySpecies,
        productType: product.productType,
        quantity: order.quantity,
        unitPrice: order.bidPrice,
        totalValue: order.bidPrice * order.quantity,
        farmerName: `${farmer.firstName} ${farmer.lastName || ""}`,
        farmerEmail: farmer.email,
        imageUrl: product.imageUrl,
        addedDate: new Date(),
        receiptNumber,
      };

      if (!Array.isArray(dealer.inventory)) dealer.inventory = [];
      dealer.inventory.push(inventoryItem);
      
      await dealer.save();
      await farmer.save(); 

      console.log("✅ Product added to dealer inventory:", inventoryItem);
    }

    if (!dealer.notifications) dealer.notifications = [];
    dealer.notifications.push({
      title: "Bid Accepted!",
      message: `Farmer has accepted your bid of ₹${order.bidPrice} per unit. Receipt: ${receiptNumber}`,
      createdAt: new Date(),
    });
    await dealer.save();

    res.json({
      msg: "Bid accepted successfully",
      receiptNumber,
    });

  } catch (err) {
    next(err); // Pass error to error middleware
  }
};

// ---------- Reject Bid ----------
exports.rejectBid = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const { email } = req.params;

    if (!orderId) {
      return res.status(400).json({ msg: "Order ID is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }

    if (order.farmerEmail !== email) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    if (order.bidStatus !== 'Pending') {
      return res.status(400).json({ msg: "Bid already processed" });
    }

    order.bidStatus = 'Rejected';
    order.bidResponseDate = new Date();
    order.status = 'Bid Rejected';
    
    await order.save();

    const farmer = await User.findOne({ email: order.farmerEmail, role: "farmer" });
    if (farmer && farmer.crops) {
      const productIndex = farmer.crops.findIndex(c => c._id.toString() === order.productId.toString());
      if (productIndex !== -1) {
        farmer.crops[productIndex].availabilityStatus = 'Available';
        await farmer.save();
      }
    }

    const dealer = await User.findOne({ email: order.dealerEmail, role: "dealer" });
    if (dealer && dealer.vehicles) {
      const vehicleIndex = dealer.vehicles.findIndex(v => v._id.toString() === order.vehicleId.toString());
      if (vehicleIndex !== -1) {
        dealer.vehicles[vehicleIndex].currentStatus = 'AVAILABLE';
        dealer.vehicles[vehicleIndex].assignedTo = undefined;
      }
      
      if (!dealer.notifications) dealer.notifications = [];
      dealer.notifications.push({
        title: "Bid Rejected",
        message: `Farmer has rejected your bid of ₹${order.bidPrice} per unit for ${order.quantity} units.`,
        createdAt: new Date()
      });
      
      await dealer.save();
    }

    res.json({ 
      msg: "Bid rejected successfully",
      order
    });

  } catch (err) {
    next(err); // Pass error to error middleware
  }
};

// ---------- Get Farmer Orders ----------
exports.getFarmerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ farmerEmail: req.params.email })
      .sort({ assignedDate: -1 });

    const populatedOrders = [];
    
    for (let order of orders) {
      const dealer = await User.findOne({ email: order.dealerEmail, role: "dealer" });
      const vehicle = dealer?.vehicles.id(order.vehicleId);

      const farmer = await User.findOne({ email: order.farmerEmail, role: "farmer" });
      
      let product = null;
      if (farmer && farmer.crops) {
        farmer.crops.forEach(crop => {
          if (crop._id.toString() === order.productId.toString()) {
            product = crop;
          }
        });
      }

      if (dealer && farmer && vehicle && product) {
        populatedOrders.push({
          ...order.toObject(),
          vehicleDetails: vehicle,
          dealerDetails: {
            firstName: dealer.firstName,
            lastName: dealer.lastName,
            businessName: dealer.businessName,
            mobile: dealer.mobile,
            email: dealer.email
          },
          productDetails: product
        });
      }
    }

    res.json(populatedOrders);
  } catch (err) {
    next(err); // Pass error to error middleware
  }
};

// ---------- Get Farmer Notifications ----------
exports.getFarmerNotifications = async (req, res, next) => {
  try {
    const farmerEmail = req.params.email;
    
    const farmer = await User.findOne({ 
      email: farmerEmail, 
      role: "farmer" 
    });

    if (!farmer) {
      return res.status(404).json({ msg: "Farmer not found" });
    }

    // Get notifications from farmer's notifications array
    const notifications = farmer.notifications || [];

    // Sort by creation date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Map notifications to include read status
    const formattedNotifications = notifications.map(n => ({
      id: n._id,
      type: n.type || 'vehicle_assigned',
      title: n.title || 'Notification',
      message: n.message,
      timestamp: n.createdAt,
      read: n.read || false,
      dealerDetails: n.dealerDetails,
      productDetails: n.productDetails
    }));

    res.json(formattedNotifications);

  } catch (err) {
    next(err); // Pass error to error middleware
  }
};

// Mark Notifications as Read
exports.markNotificationsAsRead = async (req, res, next) => {
  try {
    const farmerEmail = req.params.email;

    const farmer = await User.findOne({ 
      email: farmerEmail, 
      role: "farmer" 
    });

    if (!farmer) {
      return res.status(404).json({ msg: "Farmer not found" });
    }

    if (!farmer.notifications || farmer.notifications.length === 0) {
      return res.json({ msg: "No notifications to mark as read", updated: 0 });
    }

    // Mark all unread notifications as read
    let updatedCount = 0;
    farmer.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await farmer.save();
      console.log(`✅ Marked ${updatedCount} notifications as read for ${farmerEmail}`);
    }

    res.json({ 
      msg: "Notifications marked as read",
      updated: updatedCount,
      totalNotifications: farmer.notifications.length
    });

  } catch (err) {
    next(err); // Pass error to error middleware
  }
};