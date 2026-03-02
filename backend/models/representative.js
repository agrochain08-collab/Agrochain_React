// models/representative.js
const mongoose = require("mongoose");

const representativeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    addedBy: {
      type: String, // admin email
      default: "admin",
    },
    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Representative", representativeSchema);