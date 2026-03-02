const mongoose = require("mongoose");

// ===========================
// USER SCHEMA DEFINITION
// ===========================
const userSchema = new mongoose.Schema({
  // Common fields for all users
  role: { type: String, enum: ["farmer", "dealer", "retailer","admin"], required: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  mobile: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  
  // Email verification fields
  emailVerified: { type: Boolean, default: false },
  googleAuth: { type: Boolean, default: false },

  // ===========================
  // FARMER-SPECIFIC FIELDS
  // ===========================
  aadhaar: { type: String },
  farmLocation: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  geoTag: { type: String },
  farmSize: { type: String },
  cropsGrown: [{ type: String }],

  // Farmer's product listings
  crops: [
    {
      productType: { type: String, required: true },        // Fruit, Vegetable, Cereal, etc.
      varietySpecies: { type: String, required: true },     // Alphonso Mango, Basmati Rice, etc.
      harvestQuantity: { type: Number, required: true },    // Numeric quantity
      unitOfSale: { type: String, required: true },         // Kg, Box (20 Kg), Crate, etc.
      targetPrice: { type: Number, required: true },        // Price in rupees
      availabilityStatus: { type: String, default: "" },
      imageUrl: { type: String, default: "" },              // Set by representative on approval
      dateAdded: { type: Date, default: Date.now },
      lastUpdated: { type: Date, default: Date.now },

      // Farmer-provided details at submission
      harvestDate:     { type: Date },
      farmerVillage:   { type: String, default: '' },
      additionalNotes: { type: String, default: '' },
      batchId:         { type: String, default: '' }, // crops submitted together share same batchId

      // Verification workflow
      verificationStatus: {
        type: String,
        enum: ['pending', 'claimed', 'in_verification', 'approved', 'rejected'],
        default: 'pending'
      },
      approvalStatus: {                                      // kept for backward compat
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      claimedBy:     { type: String, default: '' },          // representative email
      claimedByName: { type: String, default: '' },          // representative display name
      claimedAt:     { type: Date },

      representativeImages: [{ type: String }],              // product images added by rep
      fieldImages:          [{ type: String }],              // farm/field images by rep
      expiryDate:           { type: Date },
      qualityReport: {
        grade:            { type: String, enum: ['A', 'B', 'C', 'D', ''], default: '' },
        pesticidesUsed:   { type: String, default: '' },
        storageCondition: { type: String, default: '' },
        harvestCondition: { type: String, default: '' },
        verifiedQuantity: { type: Number },
        remarks:          { type: String, default: '' },
        inspectedBy:      { type: String, default: '' },
        inspectedAt:      { type: Date }
      },
      
      // Product reviews from dealers
      reviews: [{
        dealerEmail: { type: String, required: true },
        quality: { 
          type: String, 
          enum: ['Excellent', 'Good', 'Average', 'Poor'],
          required: true 
        },
        comments: { type: String, required: true },
        rating: { type: Number, min: 1, max: 5, required: true },
        date: { type: Date, default: Date.now }
      }]
    }
  ],

  // Farmer notifications (for vehicle assignments, etc.)
  notifications: [{
    title: { type: String },
    message: { type: String },
    dealerDetails: {
      name: { type: String },
      email: { type: String },
      businessName: { type: String },
      mobile: { type: String },
      address: { type: String }
    },
    productDetails: {
      name: { type: String },
      quantity: { type: Number },
      price: { type: Number }
    },
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }],

  // ===========================
  // DEALER-SPECIFIC FIELDS
  // ===========================
  businessName: { type: String },
  gstin: { type: String },
  warehouseAddress: { type: String },
  preferredCommodities: [{ type: String }],

  // Dealer's vehicle fleet
  vehicles: [
    {
      vehicleId: { type: String, required: true },          // Unique vehicle identifier
      vehicleType: { 
        type: String, 
        enum: [
          "Reefer Truck (5 MT)", 
          "Insulated Van (2 MT)", 
          "Inspection Van", 
          "Heavy Truck (10 MT)"
        ], 
        required: true 
      },
      temperatureCapacity: { type: String, required: true }, // e.g., "-18°C to 0°C"
      currentStatus: { 
        type: String, 
        enum: ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE'], 
        default: 'AVAILABLE' 
      },
      // Assignment details when vehicle is assigned to a product
      assignedTo: {
        productId: { type: String },
        productName: { type: String },
        farmerEmail: { type: String },
        farmerName: { type: String },
        quantity: { type: Number },
        assignedDate: { type: Date }
      },
      dateAdded: { type: Date, default: Date.now }
    }
  ],

  // ===========================
  // DEALER INVENTORY SECTION
  // ===========================
  inventory: [
    {
      productId: { type: String, required: true },
      productName: { type: String, required: true },
      productType: { type: String },
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      totalValue: { type: Number },
      unitOfSale: { type: String },
      imageUrl: { type: String },
      farmerName: { type: String },
      farmerEmail: { type: String },
      receiptNumber: { type: String },
      addedDate: { type: Date, default: Date.now },
      
      // Reviews from retailers
      retailerReviews: [{
        retailerEmail: { type: String, required: true },
        quality: { 
          type: String, 
          enum: ['Excellent', 'Good', 'Average', 'Poor'],
          required: true 
        },
        comments: { type: String, required: true },
        rating: { type: Number, min: 1, max: 5, required: true },
        date: { type: Date, default: Date.now }
      }]
    }
  ],

  // ===========================
  // RETAILER-SPECIFIC FIELDS
  // ===========================
  shopName: { type: String },
  shopAddress: { type: String },
  shopType: { type: String },
  monthlyPurchaseVolume: { type: String }
  
}, { timestamps: true }); // Automatically add createdAt and updatedAt

module.exports = mongoose.model("User", userSchema);