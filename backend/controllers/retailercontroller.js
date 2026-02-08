const User = require("../models/user");
const RetailerOrder = require("../models/retailerOrder");

// Get All Products from All Dealer Inventories
exports.getDealerInventories = async (req, res) => {
  try {
    const dealers = await User.find({
      role: "dealer",
      inventory: { $exists: true, $not: { $size: 0 } },
    });

    let allInventory = [];

    dealers.forEach(dealer => {
      if (dealer.inventory && dealer.inventory.length > 0) {
        dealer.inventory.forEach(item => {
          const itemObj = item.toObject();
          allInventory.push({
            ...itemObj,
            retailerReviews: itemObj.retailerReviews || [], // Ensure reviews are included
            dealerName: dealer.businessName || `${dealer.firstName} ${dealer.lastName || ''}`.trim(),
            dealerEmail: dealer.email,
            dealerMobile: dealer.mobile
          });
        });
      }
    });

    allInventory.sort((a, b) => new Date(b.addedDate || 0) - new Date(a.addedDate || 0));
    
    console.log('Sample inventory item with reviews:', allInventory[0]?.retailerReviews); // Debug log
    res.json(allInventory);
  } catch (err) {
     next(err);
  }
};

// Place an order from the retailer's cart
exports.placeOrder = async (req, res) => {
  try {
    const { retailerEmail, cartItems } = req.body;
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ msg: "Cart is empty" });
    }

    const retailer = await User.findOne({ email: retailerEmail, role: 'retailer' });
    if (!retailer) {
      return res.status(404).json({ msg: "Retailer not found" });
    }

    const ordersByDealer = {};
    for (const item of cartItems) {
      const dealerEmail = item.dealerEmail;
      if (!ordersByDealer[dealerEmail]) {
        const dealer = await User.findOne({ email: dealerEmail, role: 'dealer' });
        if (!dealer) continue;
        ordersByDealer[dealerEmail] = {
          dealerInfo: {
            email: dealer.email,
            businessName: dealer.businessName,
            warehouseAddress: dealer.warehouseAddress
          },
          products: [],
          totalAmount: 0
        };
      }
      ordersByDealer[dealerEmail].products.push({
        productId: item._id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      });
      ordersByDealer[dealerEmail].totalAmount += item.quantity * item.unitPrice;
    }

    const createdOrders = [];
    for (const dealerEmail in ordersByDealer) {
      const orderData = ordersByDealer[dealerEmail];
      const newOrder = new RetailerOrder({
        retailerEmail: retailer.email,
        dealerInfo: orderData.dealerInfo,
        products: orderData.products,
        totalAmount: orderData.totalAmount,
        shippingAddress: retailer.shopAddress
      });
      const savedOrder = await newOrder.save();
      createdOrders.push(savedOrder);
    }
    
    res.status(201).json({ msg: "Order(s) placed successfully!", orders: createdOrders });
  } catch (err) {
   next(err);
  }
};

// Get all orders for a specific retailer
exports.getOrders = async (req, res) => {
    try {
        const retailerEmail = req.params.email;
        const orders = await RetailerOrder.find({ retailerEmail }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
      next(err);
    }
};

// Update a retailer's order (for pre-payment edits)
exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { products, totalAmount, paymentMethod } = req.body;

    const order = await RetailerOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }

    order.products = products;
    order.totalAmount = totalAmount;
    order.paymentDetails.method = paymentMethod;
    order.paymentDetails.status = 'Pending';

    const updatedOrder = await order.save();
    res.json({ msg: "Order updated successfully", order: updatedOrder });

  } catch (err) {
    console.error("Error updating retailer order:", err);
    res.status(500).json({ msg: "Server error while updating order" });
  }
};

// Finalize payment, update dealer inventory, and generate receipt
exports.completePayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { products, totalAmount, paymentMethod } = req.body;

    const order = await RetailerOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }
    if (order.paymentDetails.status === 'Completed') {
        return res.status(400).json({ msg: "Payment for this order has already been completed." });
    }

    const dealer = await User.findOne({ email: order.dealerInfo.email, role: 'dealer' });
    if (!dealer) {
        return res.status(404).json({ msg: "Associated dealer not found." });
    }

    for (const orderedProduct of products) {
        // Correctly find the inventory item by its unique _id
        const inventoryItem = dealer.inventory.find(item => item._id.toString() === orderedProduct.productId);
        
        if (inventoryItem) {
            inventoryItem.quantity -= orderedProduct.quantity;
            if (inventoryItem.quantity <= 0) {
                // If stock is depleted, remove the item from inventory
                dealer.inventory = dealer.inventory.filter(item => item._id.toString() !== orderedProduct.productId);
            }
        }
    }

    order.products = products;
    order.totalAmount = totalAmount;
    order.paymentDetails.method = paymentMethod;
    order.paymentDetails.status = 'Completed';
    order.orderStatus = 'Processing';

    await dealer.save();
    const updatedOrder = await order.save();

    res.json({ msg: "Payment completed successfully and dealer inventory updated.", order: updatedOrder });

  } catch (err) {
    console.error("Error completing payment:", err);
    res.status(500).json({ msg: "Server error while completing payment" });
  }
};

// Submit Review for Dealer Products
exports.submitReview = async (req, res) => {
  try {
    const { orderId, retailerEmail, quality, comments, rating } = req.body;

    if (!orderId || !retailerEmail || !quality || !comments || !rating) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ msg: "Rating must be between 1 and 5" });
    }

    // Find the order
    const order = await RetailerOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }

    if (order.retailerEmail !== retailerEmail) {
      return res.status(403).json({ msg: "Unauthorized to review this order" });
    }

    if (order.paymentDetails.status !== 'Completed') {
      return res.status(400).json({ msg: "Can only review completed orders" });
    }

    if (order.reviewSubmitted) {
      return res.status(400).json({ msg: "Review already submitted for this order" });
    }

    // Find the dealer
    const dealer = await User.findOne({ email: order.dealerInfo.email, role: 'dealer' });
    if (!dealer) {
      return res.status(404).json({ msg: "Dealer not found" });
    }

    // Create review data
    const reviewData = {
      retailerEmail,
      quality,
      comments,
      rating: parseInt(rating),
      date: new Date()
    };

    console.log("Processing review for order:", orderId);
    console.log("Order products:", order.products);

    // Add reviews to all products in this order in dealer's inventory
    let reviewsAdded = 0;
    
    for (const product of order.products) {
      console.log("Looking for inventory item with productId:", product.productId);
      
      // FIX: Try multiple ways to match the inventory item
      let inventoryItem = null;
      
      // Method 1: Match by productId string
      inventoryItem = dealer.inventory.find(item => 
        item.productId && item.productId.toString() === product.productId.toString()
      );
      
      // Method 2: If not found, match by product name as fallback
      if (!inventoryItem) {
        inventoryItem = dealer.inventory.find(item => 
          item.productName === product.productName
        );
        console.log("Matched by product name:", product.productName);
      }
      
      if (inventoryItem) {
        console.log("Found inventory item:", inventoryItem._id);
        
        if (!inventoryItem.retailerReviews) {
          inventoryItem.retailerReviews = [];
        }
        
        inventoryItem.retailerReviews.push(reviewData);
        reviewsAdded++;
        
        console.log("Review added. Total reviews now:", inventoryItem.retailerReviews.length);
      } else {
        console.log("WARNING: No matching inventory item found for product:", product.productName);
      }
    }

    if (reviewsAdded === 0) {
      console.warn("No inventory items were updated with reviews");
      return res.status(400).json({ 
        msg: "Could not associate review with inventory items. Please check order details." 
      });
    }

    // Save dealer with updated inventory
    await dealer.save();
    console.log("Dealer saved with updated inventory");

    // Mark order as reviewed
    order.reviewSubmitted = true;
    await order.save();
    console.log("Order marked as reviewed");

    res.json({ 
      msg: "Review submitted successfully",
      review: reviewData,
      itemsReviewed: reviewsAdded
    });

  } catch (err) {
    console.error("Error submitting review:", err);
    res.status(500).json({ msg: "Error submitting review", error: err.message });
  }
};


// Update Retailer Profile
exports.updateRetailerProfile = async (req, res) => {
  try {
    const { email } = req.params;
    
    // Find user by email and update
    const retailer = await User.findOneAndUpdate(
      { email: email, role: "retailer" }, // Ensure we only update retailers
      { $set: req.body }, // Update with the data sent from frontend
      { new: true } // Return the updated document
    );

    if (!retailer) {
      return res.status(404).json({ msg: "Retailer not found" });
    }

    res.json(retailer);
  } catch (err) {
    console.error("Error updating retailer profile:", err);
    res.status(500).json({ msg: "Server Error during profile update" });
  }
};
module.exports = exports;