const User = require("../models/user");
const { cloudinary } = require("../config/cloudinary");

// ─── helper: build crop response DTO ─────────────────────────────────────────
function buildCropDTO(farmer, crop) {
  return {
    cropId: crop._id,
    productType: crop.productType,
    varietySpecies: crop.varietySpecies,
    harvestQuantity: crop.harvestQuantity,
    unitOfSale: crop.unitOfSale,
    targetPrice: crop.targetPrice,
    availabilityStatus: crop.availabilityStatus,
    approvalStatus: crop.approvalStatus,
    verificationStatus: crop.verificationStatus || 'pending',
    claimedBy: crop.claimedBy || '',
    claimedByName: crop.claimedByName || '',
    claimedAt: crop.claimedAt,
    batchId: crop.batchId || '',
    harvestDate: crop.harvestDate,
    farmerVillage: crop.farmerVillage || '',
    additionalNotes: crop.additionalNotes || '',
    imageUrl: crop.imageUrl,
    representativeImages: crop.representativeImages || [],
    fieldImages: crop.fieldImages || [],
    expiryDate: crop.expiryDate,
    qualityReport: crop.qualityReport || {},
    dateAdded: crop.dateAdded,
    lastUpdated: crop.lastUpdated,
    farmer: {
      id: farmer._id,
      name: `${farmer.firstName} ${farmer.lastName || ''}`.trim(),
      email: farmer.email,
      mobile: farmer.mobile,
      farmLocation: farmer.farmLocation || '',
    },
  };
}

/* ════════════════════════════════════════════════════════════
   1. GET UNASSIGNED (PENDING) REQUESTS — grouped by batchId
════════════════════════════════════════════════════════════ */
exports.getPendingCrops = async (req, res, next) => {
  try {
    const farmers = await User.find({ role: 'farmer' }, 'firstName lastName email mobile farmLocation crops');

    const allPending = [];
    farmers.forEach(farmer => {
      if (!Array.isArray(farmer.crops)) return;
      farmer.crops.forEach(crop => {
        const vs = crop.verificationStatus;
        const isUnassigned = vs === 'pending' || (!vs && crop.approvalStatus === 'pending');
        if (isUnassigned) allPending.push(buildCropDTO(farmer, crop));
      });
    });

    // Group by batchId
    const batches = {};
    allPending.forEach(crop => {
      const key = crop.batchId || crop.cropId.toString();
      if (!batches[key]) {
        batches[key] = {
          batchId: key,
          farmer: crop.farmer,
          submittedAt: crop.dateAdded,
          farmerVillage: crop.farmerVillage,
          crops: [],
        };
      }
      batches[key].crops.push(crop);
    });

    const result = Object.values(batches).sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/* ════════════════════════════════════════════════════════════
   2. CLAIM A BATCH
════════════════════════════════════════════════════════════ */
exports.claimBatch = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const repEmail = req.user?.email;
    const repName  = req.user?.firstName || 'Representative';

    if (!repEmail) return res.status(401).json({ msg: 'Not authenticated' });

    // Find all farmers with crops in this batch
    const farmers = await User.find({ role: 'farmer', 'crops.batchId': batchId });
    let updated = 0;
    let conflict = null;

    for (const farmer of farmers) {
      let changed = false;
      for (const crop of farmer.crops) {
        if (crop.batchId !== batchId) continue;
        const vs = crop.verificationStatus;
        if (vs !== 'pending' && vs !== undefined && vs !== '') {
          conflict = crop.claimedByName || 'another representative';
          break;
        }
        crop.verificationStatus = 'claimed';
        crop.claimedBy = repEmail;
        crop.claimedByName = repName;
        crop.claimedAt = new Date();
        changed = true;
        updated++;
      }
      if (conflict) break;
      if (changed) {
        if (!Array.isArray(farmer.notifications)) farmer.notifications = [];
        farmer.notifications.push({
          title: '🔍 Verification Started',
          message: `Representative ${repName} has accepted your product submission and will visit soon for physical verification.`,
          createdAt: new Date(),
          read: false,
        });
        await farmer.save();
      }
    }

    if (conflict) return res.status(409).json({ msg: `This batch was already claimed by ${conflict}.` });

    // Handle single-crop batch (batchId = cropId when only one crop submitted)
    if (updated === 0) {
      const singleFarmer = await User.findOne({ role: 'farmer' });
      const farmers2 = await User.find({ role: 'farmer' }, 'firstName lastName email mobile crops notifications');
      for (const f of farmers2) {
        const crop = f.crops && f.crops.id ? f.crops.id(batchId) : null;
        if (!crop) continue;
        const vs = crop.verificationStatus;
        if (vs && vs !== 'pending') {
          return res.status(409).json({ msg: `Already claimed by ${crop.claimedByName}.` });
        }
        crop.verificationStatus = 'claimed';
        crop.claimedBy = repEmail;
        crop.claimedByName = repName;
        crop.claimedAt = new Date();
        crop.batchId = batchId;
        if (!Array.isArray(f.notifications)) f.notifications = [];
        f.notifications.push({
          title: '🔍 Verification Started',
          message: `Representative ${repName} will visit soon to verify your product "${crop.varietySpecies}".`,
          createdAt: new Date(),
          read: false,
        });
        await f.save();
        updated++;
        break;
      }
    }

    if (updated === 0) return res.status(404).json({ msg: 'Batch not found or no unclaimed crops' });

    res.json({ msg: `Claimed ${updated} crop(s) successfully.`, updated });
  } catch (err) {
    next(err);
  }
};

/* ════════════════════════════════════════════════════════════
   3. UNCLAIM — release back to queue
════════════════════════════════════════════════════════════ */
exports.unclaimBatch = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const repEmail = req.user?.email;

    const farmers = await User.find({ role: 'farmer', 'crops.batchId': batchId });
    let updated = 0;

    for (const farmer of farmers) {
      let changed = false;
      farmer.crops.forEach(crop => {
        if (crop.batchId === batchId && crop.claimedBy === repEmail && crop.verificationStatus === 'claimed') {
          crop.verificationStatus = 'pending';
          crop.claimedBy = '';
          crop.claimedByName = '';
          crop.claimedAt = undefined;
          changed = true;
          updated++;
        }
      });
      if (changed) await farmer.save();
    }

    res.json({ msg: `Released ${updated} crop(s) back to queue.` });
  } catch (err) {
    next(err);
  }
};

/* ════════════════════════════════════════════════════════════
   4. GET MY ASSIGNED VERIFICATIONS (claimed + in_verification)
════════════════════════════════════════════════════════════ */
exports.getMyAssigned = async (req, res, next) => {
  try {
    const repEmail = req.user?.email;
    const farmers = await User.find({ role: 'farmer' }, 'firstName lastName email mobile farmLocation crops');

    const assigned = [];
    farmers.forEach(farmer => {
      if (!Array.isArray(farmer.crops)) return;
      farmer.crops.forEach(crop => {
        if (crop.claimedBy === repEmail && ['claimed', 'in_verification'].includes(crop.verificationStatus)) {
          assigned.push(buildCropDTO(farmer, crop));
        }
      });
    });

    // Group by batchId
    const batches = {};
    assigned.forEach(crop => {
      const key = crop.batchId || crop.cropId.toString();
      if (!batches[key]) {
        batches[key] = { batchId: key, farmer: crop.farmer, submittedAt: crop.dateAdded, crops: [] };
      }
      batches[key].crops.push(crop);
    });

    res.json(Object.values(batches).sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt)));
  } catch (err) {
    next(err);
  }
};

/* ════════════════════════════════════════════════════════════
   5. GET ALL CROPS BY STATUS (for approved/rejected tabs)
════════════════════════════════════════════════════════════ */
exports.getAllCropsForRep = async (req, res, next) => {
  try {
    const { status, mine } = req.query;
    const repEmail = req.user?.email;

    const farmers = await User.find({ role: 'farmer' }, 'firstName lastName email mobile farmLocation crops');
    const result = [];

    farmers.forEach(farmer => {
      if (!Array.isArray(farmer.crops)) return;
      farmer.crops.forEach(crop => {
        const vs = crop.verificationStatus || crop.approvalStatus;
        if (status && vs !== status) return;
        if (mine === 'true' && crop.claimedBy !== repEmail) return;
        result.push(buildCropDTO(farmer, crop));
      });
    });

    result.sort((a, b) => new Date(b.lastUpdated || b.dateAdded) - new Date(a.lastUpdated || a.dateAdded));
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/* ════════════════════════════════════════════════════════════
   6. EDIT DURING VERIFICATION (before approval)
════════════════════════════════════════════════════════════ */
exports.editVerification = async (req, res, next) => {
  try {
    const { farmerEmail, cropId } = req.params;
    const repEmail = req.user?.email;
    const { verifiedQuantity, harvestCondition, pesticidesUsed, storageCondition, remarks } = req.body;

    const farmer = await User.findOne({ email: farmerEmail, role: 'farmer' });
    if (!farmer) return res.status(404).json({ msg: 'Farmer not found' });

    const crop = farmer.crops.id(cropId);
    if (!crop) return res.status(404).json({ msg: 'Crop not found' });
    if (crop.claimedBy !== repEmail) return res.status(403).json({ msg: 'Not assigned to you' });

    crop.verificationStatus = 'in_verification';
    if (!crop.qualityReport) crop.qualityReport = {};
    if (verifiedQuantity !== undefined) crop.qualityReport.verifiedQuantity = parseFloat(verifiedQuantity);
    if (harvestCondition !== undefined) crop.qualityReport.harvestCondition = harvestCondition;
    if (pesticidesUsed !== undefined) crop.qualityReport.pesticidesUsed = pesticidesUsed;
    if (storageCondition !== undefined) crop.qualityReport.storageCondition = storageCondition;
    if (remarks !== undefined) crop.qualityReport.remarks = remarks;
    crop.lastUpdated = new Date();

    await farmer.save();
    res.json({ msg: 'Updated', crop: buildCropDTO(farmer, crop) });
  } catch (err) {
    next(err);
  }
};

/* ════════════════════════════════════════════════════════════
   7. APPROVE — upload images + complete quality report
════════════════════════════════════════════════════════════ */
exports.approveCrop = async (req, res, next) => {
  try {
    const { farmerEmail, cropId } = req.params;
    const repEmail = req.user?.email;
    const repName  = req.user?.firstName || 'Representative';

    const farmer = await User.findOne({ email: farmerEmail, role: 'farmer' });
    if (!farmer) return res.status(404).json({ msg: 'Farmer not found' });

    const cropIndex = farmer.crops.findIndex(c => c._id.toString() === cropId);
    if (cropIndex === -1) return res.status(404).json({ msg: 'Crop not found' });

    const crop = farmer.crops[cropIndex];

    if (crop.claimedBy && crop.claimedBy !== repEmail) {
      return res.status(403).json({ msg: 'Assigned to another representative' });
    }

    // Upload product images (field 'images') and field images (field 'fieldImages')
    const productUrls = [];
    const fieldUrls   = [];

    if (req.files) {
      for (const file of (req.files['images'] || [])) {
        try {
          const r = await cloudinary.uploader.upload(file.path, { folder: 'agrochain/products' });
          productUrls.push(r.secure_url);
        } catch (e) { console.error('Product img upload error:', e); }
      }
      for (const file of (req.files['fieldImages'] || [])) {
        try {
          const r = await cloudinary.uploader.upload(file.path, { folder: 'agrochain/fields' });
          fieldUrls.push(r.secure_url);
        } catch (e) { console.error('Field img upload error:', e); }
      }
    }

    if (productUrls.length === 0) {
      return res.status(400).json({ msg: 'At least one product image is required for approval' });
    }

    const { grade, pesticidesUsed, storageCondition, harvestCondition, verifiedQuantity, remarks, expiryDate } = req.body;
    if (!grade) return res.status(400).json({ msg: 'Quality grade is required' });

    crop.verificationStatus = 'approved';
    crop.approvalStatus     = 'approved';
    crop.representativeImages = productUrls;
    crop.fieldImages          = fieldUrls;
    crop.imageUrl             = productUrls[0];
    crop.expiryDate           = expiryDate ? new Date(expiryDate) : undefined;
    crop.qualityReport = {
      grade,
      pesticidesUsed:   pesticidesUsed   || '',
      storageCondition: storageCondition || '',
      harvestCondition: harvestCondition || '',
      verifiedQuantity: verifiedQuantity ? parseFloat(verifiedQuantity) : crop.harvestQuantity,
      remarks:          remarks          || '',
      inspectedBy:      repEmail,
      inspectedAt:      new Date(),
    };
    crop.lastUpdated = new Date();

    await farmer.save();

    if (!Array.isArray(farmer.notifications)) farmer.notifications = [];
    farmer.notifications.push({
      title: '✅ Product Approved — Now Live!',
      message: `"${crop.varietySpecies}" verified by ${repName} is now visible to dealers for bidding.`,
      createdAt: new Date(),
      read: false,
    });
    await farmer.save();

    res.json({ msg: 'Crop approved successfully', crop: buildCropDTO(farmer, farmer.crops[cropIndex]) });
  } catch (err) {
    next(err);
  }
};

/* ════════════════════════════════════════════════════════════
   8. REJECT
════════════════════════════════════════════════════════════ */
exports.rejectCrop = async (req, res, next) => {
  try {
    const { farmerEmail, cropId } = req.params;
    const repEmail = req.user?.email;
    const repName  = req.user?.firstName || 'Representative';
    const { reason } = req.body;

    const farmer = await User.findOne({ email: farmerEmail, role: 'farmer' });
    if (!farmer) return res.status(404).json({ msg: 'Farmer not found' });

    const crop = farmer.crops.id(cropId);
    if (!crop) return res.status(404).json({ msg: 'Crop not found' });

    if (crop.claimedBy && crop.claimedBy !== repEmail) {
      return res.status(403).json({ msg: 'Assigned to another representative' });
    }

    crop.verificationStatus = 'rejected';
    crop.approvalStatus     = 'rejected';
    crop.lastUpdated        = new Date();
    if (!crop.qualityReport) crop.qualityReport = {};
    crop.qualityReport.remarks     = reason ? `REJECTED: ${reason}` : 'REJECTED by representative.';
    crop.qualityReport.inspectedBy = repEmail;
    crop.qualityReport.inspectedAt = new Date();

    await farmer.save();

    if (!Array.isArray(farmer.notifications)) farmer.notifications = [];
    farmer.notifications.push({
      title: '❌ Product Rejected',
      message: `"${crop.varietySpecies}" was rejected by ${repName}.${reason ? ` Reason: ${reason}` : ''} Please edit the details and resubmit.`,
      createdAt: new Date(),
      read: false,
    });
    await farmer.save();

    res.json({ msg: 'Crop rejected', crop: buildCropDTO(farmer, crop) });
  } catch (err) {
    next(err);
  }
};

/* ════════════════════════════════════════════════════════════
   9. POST-APPROVAL EDIT (expiry update / deactivate / remarks)
════════════════════════════════════════════════════════════ */
exports.postApprovalEdit = async (req, res, next) => {
  try {
    const { farmerEmail, cropId } = req.params;
    const { expiryDate, remarks, deactivate } = req.body;

    const farmer = await User.findOne({ email: farmerEmail, role: 'farmer' });
    if (!farmer) return res.status(404).json({ msg: 'Farmer not found' });

    const crop = farmer.crops.id(cropId);
    if (!crop) return res.status(404).json({ msg: 'Crop not found' });
    if (crop.verificationStatus !== 'approved') return res.status(400).json({ msg: 'Only approved products can be edited this way' });

    if (expiryDate !== undefined) crop.expiryDate = new Date(expiryDate);
    if (remarks !== undefined && crop.qualityReport) crop.qualityReport.remarks = remarks;
    if (deactivate === true) crop.availabilityStatus = 'Unavailable';
    crop.lastUpdated = new Date();

    await farmer.save();
    res.json({ msg: 'Product updated', crop: buildCropDTO(farmer, crop) });
  } catch (err) {
    next(err);
  }
};

/* ════════════════════════════════════════════════════════════
   10. EXPIRY ALERTS (approved products expiring within N days)
════════════════════════════════════════════════════════════ */
exports.getExpiryAlerts = async (req, res, next) => {
  try {
    const days   = parseInt(req.query.days) || 7;
    const repEmail = req.user?.email;
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const farmers = await User.find({ role: 'farmer' }, 'firstName lastName email crops');
    const alerts  = [];

    farmers.forEach(farmer => {
      if (!Array.isArray(farmer.crops)) return;
      farmer.crops.forEach(crop => {
        if (
          crop.verificationStatus === 'approved' &&
          crop.expiryDate &&
          new Date(crop.expiryDate) <= cutoff &&
          crop.claimedBy === repEmail
        ) {
          alerts.push(buildCropDTO(farmer, crop));
        }
      });
    });

    alerts.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    res.json(alerts);
  } catch (err) {
    next(err);
  }
};