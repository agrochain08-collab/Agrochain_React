import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import '../assets/css/farmer.css'; 
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setNotifications, addNotification } from '../redux/slices/notificationSlice';

// --- FarmerNavbar Component (from farmer.html) ---
// THIS IS DEFINED *INSIDE* THE DASHBOARD FILE
const FarmerNavbar = ({ user, notificationCount, onSignout, onNavigate, activeSection }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.profile-dropdown')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <nav className="navbar farmer-navbar">
      <div className="nav-left">
        <img src="https://ik.imagekit.io/a2wpi1kd9/imgToUrl/image-to-url_ThyEiMVLh" alt="AgroChain Logo" className="logo" />
        <span className="brand-name">Agro<span className="chain-text">Chain</span></span>
      </div>
      
      <button className="menu-toggle" id="menuToggleBtn" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? '✖' : '☰'}
      </button>
      
      <div className={`nav-links-container ${menuOpen ? 'active' : ''}`} id="navLinksContainer">
          <div className="nav-center">
            <a href="#" className={activeSection === 'inventory' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('inventory')}>
              <span className="nav-icon">🌾</span> Inventory
            </a>
            <a href="#" className={activeSection === 'orders' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('orders')}>
              <span className="nav-icon">📦</span> Orders
            </a>
          </div>
          
          <div className="nav-right">
            <a href="#" className={activeSection === 'notifications' ? 'nav-link active' : 'nav-link'} id="navNotificationBtn" onClick={() => onNavigate('notifications')}>
              <span className="nav-icon">🔔</span>
              {notificationCount > 0 &&
                <span className="notification-badge" id="notificationBadge">{notificationCount}</span>
              }
            </a>
            <div className="profile-dropdown">
              <button className="profile-btn" id="profileDropdownBtn" onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}>
                <span className="profile-icon">👤</span>
                <span id="farmerNameDisplay">{user ? user.firstName : 'Farmer'}</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              <div className={`profile-dropdown-menu ${dropdownOpen ? 'show' : ''}`} id="profileDropdownMenu">
                <a href="#" className="dropdown-item" id="viewProfileBtn" onClick={() => onNavigate('profile')}>
                  <span className="dropdown-icon">👤</span> My Profile
                </a>
                <div className="dropdown-divider"></div>
                <a href="#" className="dropdown-item logout-item" id="navSignoutBtn" onClick={onSignout}>
                  <span className="dropdown-icon">🚪</span> Sign Out
                </a>
              </div>
            </div>
          </div>
      </div>
    </nav>
  );
};

// --- FarmerDashboard Page Component ---
const FarmerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeSection, setActiveSection] = useState('inventory');
  const [crops, setCrops] = useState([]);
  const [orders, setOrders] = useState([]);
  // Add this to your existing modal state
  const [modal, setModal] = useState({ 
    farmer: false, 
    assignVehicle: false, 
    review: false, 
    bid: false, 
    receipt: false, 
    viewReviews: false,
    farmerReceipt: false  // ADD THIS
  });

  // Add state to track selected order for receipt
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);

  const dispatch = useDispatch();
  const { notifications, unreadCount } = useSelector((state) => state.notification);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showCropForm, setShowCropForm] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const emptyRow = () => ({ productType:'', varietySpecies:'', harvestQuantity:'', unitOfSale:'kg', targetPrice:'' });
  const [bulkRows, setBulkRows] = useState([emptyRow()]);
  const [formData, setFormData] = useState({
    productType: '', varietySpecies: '', harvestQuantity: '',
    unitOfSale: 'kg', targetPrice: '',
    harvestDate: '', farmerVillage: '', additionalNotes: '',
  });
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });
  const [editProfileData, setEditProfileData] = useState(null);

  // --- Data Loading ---
  const loadAllData = useCallback(async () => {
  if (!user) return;
  try {
    setLoading(true);
    
    // Fetch all data in parallel
    const [cropsRes, ordersRes, notificationsRes, profileRes] = await Promise.all([
      api.get(`/farmer/crops/${user.email}`),
      api.get(`/farmer/orders/${user.email}`),
      api.get(`/farmer/notifications/${user.email}`),
      api.get(`/auth/profile/${user.email}`)
    ]);
    
    // Auto-delete crops with 0 quantity (await all deletions)
    const deletePromises = cropsRes.data
      .filter(crop => crop.harvestQuantity <= 0)
      .map(crop => 
        api.delete(`/farmer/crops/${user.email}/${crop._id}?force=true`)
          .catch(err => console.error("Auto delete failed:", err))
      );
    
    // If any crops were deleted, reload the crops list
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      const updatedCropsRes = await api.get(`/farmer/crops/${user.email}`);
      setCrops(updatedCropsRes.data);
    } else {
      setCrops(cropsRes.data);
    }
    
    // Set other data
    setOrders(ordersRes.data);
    dispatch(setNotifications(notificationsRes.data));
    setProfile(profileRes.data);
    setEditProfileData({
      farmLocation: profileRes.data.farmLocation || '',
      latitude: profileRes.data.latitude || '',
      longitude: profileRes.data.longitude || '',
      farmSize: profileRes.data.farmSize || ''
    });
  } catch (err) {
    setError(err.message || 'Failed to load data');
  } finally {
    setLoading(false);
  }
}, [user, dispatch]);

  useEffect(() => {
    loadAllData();
  }, [user, loadAllData]);

  // 🔄 Auto-refresh orders + notifications every 30 seconds 
  useEffect(() => {
      if (!user) return;

      const intervalId = setInterval(() => {
          console.log("Auto-refreshing...");
          loadAllData();   // refresh crops, orders, notifications
      }, 10000); // 30 seconds

      return () => clearInterval(intervalId);
  }, [user, loadAllData]);


  const handleSignout = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      logout();
      navigate('/login');
    }
  };

  const handleNavigate = (section) => {
    setActiveSection(section);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  
  const resetForm = () => {
    setFormData({ productType:'', varietySpecies:'', harvestQuantity:'', unitOfSale:'kg', targetPrice:'', harvestDate:'', farmerVillage:'', additionalNotes:'' });
    setBulkRows([emptyRow()]);
    setIsBulkMode(false);
    setIsEditing(null);
    setShowCropForm(false);
  };

  const handleCropSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormMessage({ type: '', text: '' });
    try {
      if (isEditing) {
        // Edit — only pending/rejected crops can be edited
        await api.put(`/farmer/crops/${user.email}/${isEditing}`, {
          productType: formData.productType,
          varietySpecies: formData.varietySpecies,
          harvestQuantity: formData.harvestQuantity,
          unitOfSale: formData.unitOfSale,
          targetPrice: formData.targetPrice,
          harvestDate: formData.harvestDate,
          farmerVillage: formData.farmerVillage,
          additionalNotes: formData.additionalNotes,
        });
        setFormMessage({ type: 'success', text: 'Product updated and re-submitted for verification.' });
      } else if (isBulkMode) {
        const valid = bulkRows.filter(r => r.productType && r.varietySpecies && r.harvestQuantity && r.targetPrice);
        if (!valid.length) { setFormMessage({ type:'error', text:'Fill at least one complete row.' }); setLoading(false); return; }
        await api.post(`/farmer/crops-bulk/${user.email}`, {
          crops: valid,
          harvestDate: formData.harvestDate,
          farmerVillage: formData.farmerVillage,
          additionalNotes: formData.additionalNotes,
        });
        setFormMessage({ type: 'success', text: `${valid.length} product(s) submitted for verification!` });
      } else {
        await api.post(`/farmer/crops/${user.email}`, {
          productType: formData.productType,
          varietySpecies: formData.varietySpecies,
          harvestQuantity: formData.harvestQuantity,
          unitOfSale: formData.unitOfSale,
          targetPrice: formData.targetPrice,
          harvestDate: formData.harvestDate,
          farmerVillage: formData.farmerVillage,
          additionalNotes: formData.additionalNotes,
        });
        setFormMessage({ type: 'success', text: 'Product submitted! Awaiting representative verification.' });
      }
      resetForm();
      loadAllData();
    } catch (err) {
      setFormMessage({ type: 'error', text: err.response?.data?.msg || 'Operation failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRowChange = (idx, field, val) => setBulkRows(prev => prev.map((r,i) => i===idx ? {...r, [field]:val} : r));
  const addBulkRow = () => setBulkRows(prev => [...prev, emptyRow()]);
  const removeBulkRow = idx => setBulkRows(prev => prev.length===1 ? prev : prev.filter((_,i)=>i!==idx));
  
  const handleEditClick = (crop) => {
    const vs = crop.verificationStatus;
    if (vs && vs !== 'pending' && vs !== 'rejected') {
      alert('This product cannot be edited while under verification or after approval. Contact your representative for changes.');
      return;
    }
    setIsEditing(crop._id);
    setFormData({
      productType: crop.productType,
      varietySpecies: crop.varietySpecies,
      harvestQuantity: crop.harvestQuantity,
      unitOfSale: crop.unitOfSale,
      targetPrice: crop.targetPrice,
      harvestDate: crop.harvestDate ? new Date(crop.harvestDate).toISOString().split('T')[0] : '',
      farmerVillage: crop.farmerVillage || '',
      additionalNotes: crop.additionalNotes || '',
    });
    setShowCropForm(true);
    window.scrollTo(0, 0);
  };
  
  const handleDeleteCrop = async (cropId) => {
    // Check status before attempting delete
    const crop = crops.find(c => c._id === cropId);
    if (crop) {
      const vs = crop.verificationStatus;
      if (vs && vs !== 'pending' && vs !== 'rejected') {
        alert('This product cannot be deleted while under verification or after approval.');
        return;
      }
    }
    try {
     await api.delete(`/farmer/crops/${user.email}/${cropId}`);
    setFormMessage({ type: 'success', text: 'Product deleted!' });
    await loadAllData();

    } catch (err) {
      const msg = err.response?.data?.msg;

      // 🔥 Auto delete fallback when backend blocks delete
      if (msg?.includes("quantity") || msg?.includes("0")) {
        try {
          await api.delete(`/farmer/crops/${user.email}/${cropId}?force=true`);
          loadAllData();
        } catch (e) {
          setFormMessage({ type: 'error', text: 'Failed to delete crop.' });
        }
      } else {
        setFormMessage({ type: 'error', text: msg || 'Failed to delete crop' });
      }
    }
  };


 const handleAcceptBid = async (orderId) => {
  if (!window.confirm('Are you sure you want to accept this bid?')) return;
  
  try {
    const res = await api.post(`/farmer/accept-bid/${user.email}`, { orderId });
    const data = res.data;
    
    if (res.status === 200 || res.status === 201) {
      alert(`✅ Bid accepted! Receipt Number: ${data.receiptNumber}`);
      
      // Reload all data to get updated inventory and orders
      await loadAllData();
      
      // Optional: Show receipt modal immediately
      // You can add a receipt modal state and show it here if needed
    }
  } catch (err) {
    alert(err.response?.data?.msg || 'Error accepting bid');
    console.error('Error accepting bid:', err);
  }
};

  const handleRejectBid = async (orderId) => {
    if (!window.confirm('Are you sure you want to reject this bid?')) return;
    try {
      await api.post(`/farmer/reject-bid/${user.email}`, { orderId });
      alert('Bid rejected.');
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.msg || 'Error rejecting bid');
    }
  };
  
  const handleProfileEditChange = (e) => {
    const { name, value } = e.target;
    setEditProfileData(prev => ({...prev, [name]: value}));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/auth/farmer/update/${user.email}`, editProfileData);
      alert("Profile updated!");
      loadAllData();
      setEditProfileData(null); // Close edit form
    } catch (err) {
       alert(err.response?.data?.msg || 'Error updating profile');
    }
  };

  const handleGetGeo = () => {
     if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setEditProfileData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          }));
          alert("📍 Location updated!");
        },
        () => alert("Unable to fetch location. Please allow access.")
      );
    }
  };
  

  return (
    <>
      <FarmerNavbar 
        user={user} 
        notificationCount={unreadCount}
        onSignout={handleSignout} 
        onNavigate={handleNavigate} 
        activeSection={activeSection}
      />
      
      <div className="content">
        {error && <div className="error-message">{error}</div>}
        {formMessage.text && <div className={formMessage.type === 'success' ? 'message' : 'error-message'}>{formMessage.text}</div>}
        
        {activeSection === 'inventory' && (
          <section id="inventorySection">
            <div className="section-header">
              <button className="add-btn" onClick={() => { resetForm(); setShowCropForm(!showCropForm); }}>
                {showCropForm ? '✖ Cancel' : '+ Submit New Product'}
              </button>
            </div>

            {/* ── PRODUCT SUBMISSION FORM ── */}
            {showCropForm && (
              <form id="cropForm" onSubmit={handleCropSubmit} style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:'12px', padding:'20px 24px', marginBottom:'24px'}}>
                
                {/* Info banner */}
                {!isEditing && (
                  <div style={{background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'8px', padding:'10px 14px', marginBottom:'18px', fontSize:'13px', color:'#1d4ed8'}}>
                    📋 <strong>Note:</strong> Images are added by our representative after physical inspection. Just submit your crop details — a rep will visit and verify.
                  </div>
                )}

                {/* Mode toggle (only for new submissions) */}
                {!isEditing && (
                  <div style={{display:'flex', gap:'8px', marginBottom:'18px'}}>
                    <button type="button" onClick={() => setIsBulkMode(false)}
                      style={{padding:'8px 16px', borderRadius:'8px', border:'none', fontWeight:700, fontSize:'13px', cursor:'pointer', background: !isBulkMode ? '#10b981' : '#f3f4f6', color: !isBulkMode ? '#fff' : '#374151'}}>
                      Single Product
                    </button>
                    <button type="button" onClick={() => setIsBulkMode(true)}
                      style={{padding:'8px 16px', borderRadius:'8px', border:'none', fontWeight:700, fontSize:'13px', cursor:'pointer', background: isBulkMode ? '#10b981' : '#f3f4f6', color: isBulkMode ? '#fff' : '#374151'}}>
                      Multiple Products
                    </button>
                  </div>
                )}

                {/* ── SINGLE PRODUCT fields ── */}
                {(!isBulkMode || isEditing) && (
                  <>
                    <div className="form-row">
                      <label>Product Type:
                        <select name="productType" value={formData.productType} onChange={handleFormChange} required>
                          <option value="">Select Product Type</option>
                          <option value="Fruit">Fruit</option>
                          <option value="Vegetable">Vegetable</option>
                          <option value="Cereal">Cereal</option>
                          <option value="Spices">Spices</option>
                          <option value="Pulses">Pulses</option>
                          <option value="Oil Seeds">Oil Seeds</option>
                          <option value="Other">Other</option>
                        </select>
                      </label>
                    </div>
                    <div className="form-row">
                      <label>Variety / Species:
                        <input type="text" name="varietySpecies" value={formData.varietySpecies} onChange={handleFormChange} placeholder="e.g., Alphonso Mango" required />
                      </label>
                    </div>
                    <div className="form-row">
                      <label>Harvest Quantity:
                        <input type="number" name="harvestQuantity" value={formData.harvestQuantity} onChange={handleFormChange} placeholder="e.g., 500" required min="1" />
                      </label>
                      <label>Unit of Sale:
                        <select name="unitOfSale" value={formData.unitOfSale} onChange={handleFormChange} required>
                          <option value="kg">Kilograms (kg)</option>
                          <option value="quintal">Quintals (100 kg)</option>
                          <option value="ton">Tons (1000 kg)</option>
                          <option value="box">Box</option>
                          <option value="dozen">Dozen</option>
                        </select>
                      </label>
                    </div>
                    <div className="form-row">
                      <label>Target Price (₹):
                        <input type="number" name="targetPrice" value={formData.targetPrice} onChange={handleFormChange} placeholder="e.g., 50" required min="0" />
                      </label>
                    </div>
                  </>
                )}

                {/* ── BULK PRODUCT rows ── */}
                {isBulkMode && !isEditing && (
                  <div style={{overflowX:'auto', marginBottom:'12px'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
                      <thead>
                        <tr style={{background:'#f9fafb'}}>
                          <th style={{padding:'8px 10px', textAlign:'left', border:'1px solid #e5e7eb', color:'#6b7280', fontWeight:600, width:'28px'}}>#</th>
                          <th style={{padding:'8px 10px', textAlign:'left', border:'1px solid #e5e7eb', color:'#6b7280', fontWeight:600}}>Product Type</th>
                          <th style={{padding:'8px 10px', textAlign:'left', border:'1px solid #e5e7eb', color:'#6b7280', fontWeight:600}}>Variety / Species</th>
                          <th style={{padding:'8px 10px', textAlign:'left', border:'1px solid #e5e7eb', color:'#6b7280', fontWeight:600}}>Quantity</th>
                          <th style={{padding:'8px 10px', textAlign:'left', border:'1px solid #e5e7eb', color:'#6b7280', fontWeight:600}}>Unit</th>
                          <th style={{padding:'8px 10px', textAlign:'left', border:'1px solid #e5e7eb', color:'#6b7280', fontWeight:600}}>Price (₹)</th>
                          <th style={{padding:'8px 10px', textAlign:'left', border:'1px solid #e5e7eb', color:'#6b7280', fontWeight:600}}>Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{padding:'6px 10px', border:'1px solid #e5e7eb', color:'#9ca3af', textAlign:'center'}}>{idx+1}</td>
                            <td style={{padding:'4px', border:'1px solid #e5e7eb'}}>
                              <select value={row.productType} onChange={e=>handleBulkRowChange(idx,'productType',e.target.value)} style={{width:'100%', padding:'6px', border:'none', fontSize:'13px'}}>
                                <option value="">Select</option>
                                <option value="Fruit">Fruit</option>
                                <option value="Vegetable">Vegetable</option>
                                <option value="Cereal">Cereal</option>
                                <option value="Spices">Spices</option>
                                <option value="Pulses">Pulses</option>
                                <option value="Oil Seeds">Oil Seeds</option>
                                <option value="Other">Other</option>
                              </select>
                            </td>
                            <td style={{padding:'4px', border:'1px solid #e5e7eb'}}>
                              <input type="text" value={row.varietySpecies} onChange={e=>handleBulkRowChange(idx,'varietySpecies',e.target.value)} placeholder="e.g., Basmati Rice" style={{width:'100%', padding:'6px', border:'none', fontSize:'13px', boxSizing:'border-box'}} />
                            </td>
                            <td style={{padding:'4px', border:'1px solid #e5e7eb'}}>
                              <input type="number" value={row.harvestQuantity} onChange={e=>handleBulkRowChange(idx,'harvestQuantity',e.target.value)} placeholder="500" min="1" style={{width:'100%', padding:'6px', border:'none', fontSize:'13px', boxSizing:'border-box'}} />
                            </td>
                            <td style={{padding:'4px', border:'1px solid #e5e7eb'}}>
                              <select value={row.unitOfSale} onChange={e=>handleBulkRowChange(idx,'unitOfSale',e.target.value)} style={{width:'100%', padding:'6px', border:'none', fontSize:'13px'}}>
                                <option value="kg">kg</option>
                                <option value="quintal">quintal</option>
                                <option value="ton">ton</option>
                                <option value="box">box</option>
                                <option value="dozen">dozen</option>
                              </select>
                            </td>
                            <td style={{padding:'4px', border:'1px solid #e5e7eb'}}>
                              <input type="number" value={row.targetPrice} onChange={e=>handleBulkRowChange(idx,'targetPrice',e.target.value)} placeholder="50" min="0" style={{width:'100%', padding:'6px', border:'none', fontSize:'13px', boxSizing:'border-box'}} />
                            </td>
                            <td style={{padding:'6px 10px', border:'1px solid #e5e7eb', textAlign:'center'}}>
                              <button type="button" onClick={()=>removeBulkRow(idx)} style={{background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:'6px', padding:'4px 8px', cursor:'pointer', fontSize:'13px'}}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button type="button" onClick={addBulkRow}
                      style={{marginTop:'8px', padding:'7px 14px', background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe', borderRadius:'8px', cursor:'pointer', fontWeight:600, fontSize:'13px'}}>
                      + Add Row
                    </button>
                  </div>
                )}

                {/* ── Shared fields for all modes ── */}
                <div className="form-row">
                  <label>Harvest Date:
                    <input type="date" name="harvestDate" value={formData.harvestDate} onChange={handleFormChange} />
                  </label>
                  <label>Village / Location:
                    <input type="text" name="farmerVillage" value={formData.farmerVillage} onChange={handleFormChange} placeholder="e.g., Nashik, Maharashtra" />
                  </label>
                </div>
                <div className="form-row">
                  <label>Additional Notes for Representative:
                    <input type="text" name="additionalNotes" value={formData.additionalNotes} onChange={handleFormChange} placeholder="e.g., Contact before visit, stored in shed, gate on left side..." />
                  </label>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Submitting...' : isEditing ? '💾 Update & Resubmit for Verification' : isBulkMode ? `📦 Submit ${bulkRows.filter(r=>r.varietySpecies).length || ''} Products for Verification` : '📋 Submit for Verification'}
                </button>
              </form>
            )}

            {/* ── PRODUCT CARDS ── */}
            <div className="products-grid" id="productsGrid">
              {!loading && crops.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">🌱</div>
                  <h3>No Products Submitted Yet</h3>
                  <p style={{color:'#9ca3af', fontSize:'14px'}}>Submit your first product above to get started.</p>
                </div>
              )}
              {crops.map(crop => {
                const vs = crop.verificationStatus || crop.approvalStatus || 'pending';
                const isApproved  = vs === 'approved';
                const isRejected  = vs === 'rejected';
                const isClaimed   = vs === 'claimed';
                const isInVerif   = vs === 'in_verification';
                const isPending   = vs === 'pending';
                const canEdit     = isPending || isRejected;
                const canDelete   = isPending || isRejected;

                // Status display config
                const statusMap = {
                  pending:         { bg:'#fef9c3', color:'#92400e', label:'⏳ Waiting for Verification',    border:'#fde68a' },
                  claimed:         { bg:'#eff6ff', color:'#1d4ed8', label:'🔒 Assigned to Representative',  border:'#bfdbfe' },
                  in_verification: { bg:'#f5f3ff', color:'#5b21b6', label:'🔍 Under Physical Verification', border:'#ddd6fe' },
                  approved:        { bg:'#d1fae5', color:'#065f46', label:'✅ Verified & Live on Marketplace', border:'#6ee7b7' },
                  rejected:        { bg:'#fee2e2', color:'#991b1b', label:'❌ Rejected — Edit & Resubmit',   border:'#fca5a5' },
                };
                const st = statusMap[vs] || statusMap.pending;

                return (
                  <div key={crop._id} className="product-card" style={{border:`1.5px solid ${st.border}`, opacity: isRejected ? 0.85 : 1, position:'relative'}}>
                    
                    {/* Status banner at top of card */}
                    <div style={{background:st.bg, color:st.color, fontSize:'11px', fontWeight:700, padding:'6px 14px', textAlign:'center', borderBottom:`1px solid ${st.border}`}}>
                      {st.label}
                    </div>

                    {/* Approved: show rep image. Others: placeholder */}
                    {isApproved && crop.imageUrl
                      ? <img src={crop.imageUrl} alt={crop.varietySpecies} className="product-card-image" />
                      : !isApproved && (
                          <div style={{height:'120px', background:'#f9fafb', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#d1d5db', borderBottom:'1px solid #f3f4f6'}}>
                            <span style={{fontSize:'32px'}}>📷</span>
                            <span style={{fontSize:'11px', marginTop:'6px', color:'#9ca3af'}}>
                              {isPending ? 'Photos added after verification' : isClaimed ? 'Representative will add photos' : isInVerif ? 'Rep is inspecting the crop' : 'Photos pending'}
                            </span>
                          </div>
                        )
                    }

                    <div className="product-card-content">
                      <h3 style={{margin:'0 0 4px'}}>{crop.varietySpecies}</h3>
                      <span className="product-type">{crop.productType}</span>

                      {/* Core details */}
                      <div className="product-details" style={{marginTop:'10px'}}>
                        <div className="product-detail-item">
                          <div className="product-detail-label">Quantity</div>
                          <div className="product-detail-value">{crop.harvestQuantity} {crop.unitOfSale}</div>
                        </div>
                        <div className="product-detail-item price-highlight">
                          <div className="product-detail-label">Target Price</div>
                          <div className="product-detail-value">₹{crop.targetPrice}/{crop.unitOfSale}</div>
                        </div>
                        <div className="product-detail-item">
                          <div className="product-detail-label">Submitted</div>
                          <div className="product-detail-value">{new Date(crop.dateAdded).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
                        </div>
                        {crop.harvestDate && (
                          <div className="product-detail-item">
                            <div className="product-detail-label">Harvest Date</div>
                            <div className="product-detail-value">{new Date(crop.harvestDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
                          </div>
                        )}
                      </div>

                      {/* Claimed: show rep name */}
                      {(isClaimed || isInVerif) && crop.claimedByName && (
                        <div style={{background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'8px', padding:'8px 12px', marginTop:'10px', fontSize:'12px', color:'#1d4ed8'}}>
                          👤 <strong>Assigned Rep:</strong> {crop.claimedByName}<br/>
                          <span style={{color:'#6b7280'}}>Claimed on {crop.claimedAt ? new Date(crop.claimedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—'}</span>
                        </div>
                      )}

                      {/* Approved: quality report badge */}
                      {isApproved && crop.qualityReport?.grade && (
                        <div style={{background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'8px', padding:'10px 12px', marginTop:'10px'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px'}}>
                            <span style={{fontWeight:700, color:'#065f46', fontSize:'13px'}}>🏅 Quality Report</span>
                            <span style={{background:'#065f46', color:'#fff', borderRadius:'6px', padding:'2px 10px', fontSize:'12px', fontWeight:700}}>Grade {crop.qualityReport.grade}</span>
                          </div>
                          <div style={{fontSize:'12px', color:'#374151', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px'}}>
                            {crop.qualityReport.verifiedQuantity && <span>✓ Verified: {crop.qualityReport.verifiedQuantity} {crop.unitOfSale}</span>}
                            {crop.expiryDate && <span>📅 Expires: {new Date(crop.expiryDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>}
                            {crop.qualityReport.pesticidesUsed && <span style={{gridColumn:'1/-1'}}>🧪 {crop.qualityReport.pesticidesUsed}</span>}
                            {crop.qualityReport.storageCondition && <span style={{gridColumn:'1/-1'}}>🏠 {crop.qualityReport.storageCondition}</span>}
                            {crop.qualityReport.remarks && <span style={{gridColumn:'1/-1', fontStyle:'italic', color:'#6b7280'}}>{crop.qualityReport.remarks}</span>}
                          </div>
                          {crop.qualityReport.inspectedBy && (
                            <div style={{fontSize:'11px', color:'#9ca3af', marginTop:'6px', borderTop:'1px solid #d1fae5', paddingTop:'6px'}}>
                              Inspected by: {crop.qualityReport.inspectedBy} · {crop.qualityReport.inspectedAt ? new Date(crop.qualityReport.inspectedAt).toLocaleDateString('en-IN') : ''}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Field images from rep */}
                      {isApproved && crop.fieldImages?.length > 0 && (
                        <div style={{display:'flex', gap:'6px', marginTop:'8px', flexWrap:'wrap'}}>
                          {crop.fieldImages.map((img, i) => (
                            <img key={i} src={img} alt="" style={{width:'52px', height:'52px', objectFit:'cover', borderRadius:'6px', border:'1px solid #e5e7eb'}} />
                          ))}
                        </div>
                      )}

                      {/* Rejected reason */}
                      {isRejected && crop.qualityReport?.remarks && (
                        <div style={{background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:'8px', padding:'8px 12px', marginTop:'10px', fontSize:'12px', color:'#991b1b'}}>
                          {crop.qualityReport.remarks}
                        </div>
                      )}

                      {/* Dealer reviews (approved only) */}
                      {isApproved && crop.reviews && crop.reviews.length > 0 && (
                        <div style={{marginTop:'10px', padding:'10px', background:'#f9fafb', borderRadius:'8px', border:'1px solid #e5e7eb'}}>
                          <h4 style={{fontSize:'13px', margin:'0 0 8px', color:'#374151'}}>
                            Dealer Reviews ({crop.reviews.length}) · Avg {(crop.reviews.reduce((s,r)=>s+r.rating,0)/crop.reviews.length).toFixed(1)}/5 ⭐
                          </h4>
                          {crop.reviews.slice(0,2).map((review,idx) => (
                            <div key={idx} style={{marginBottom:'8px', padding:'8px', background:'white', borderRadius:'6px', borderLeft:'3px solid #10b981', fontSize:'12px'}}>
                              <div style={{display:'flex', justifyContent:'space-between'}}>
                                <span style={{fontWeight:600, color:'#10b981'}}>{review.quality}</span>
                                <span style={{color:'#f59e0b'}}>{'★'.repeat(review.rating)}</span>
                              </div>
                              <p style={{margin:'4px 0', color:'#374151'}}>{review.comments}</p>
                            </div>
                          ))}
                          {crop.reviews.length > 2 && <small style={{color:'#6b7280'}}>+{crop.reviews.length-2} more reviews</small>}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="product-actions" style={{marginTop:'12px'}}>
                        {canEdit && (
                          <button className="action-btn edit-btn" onClick={() => handleEditClick(crop)}>
                            ✏️ Edit Request
                          </button>
                        )}
                        {canDelete && (
                          <button className="action-btn delete-btn" onClick={() => handleDeleteCrop(crop._id)}>
                            🗑 Delete
                          </button>
                        )}
                        {!canEdit && !isApproved && (
                          <div style={{fontSize:'12px', color:'#6b7280', fontStyle:'italic', padding:'6px 0'}}>
                            {isClaimed ? '🔒 Editing disabled — representative assigned' : isInVerif ? '🔍 Editing disabled — inspection in progress' : ''}
                          </div>
                        )}
                        {isApproved && (
                          <div style={{fontSize:'12px', color:'#065f46', fontStyle:'italic', padding:'6px 0', fontWeight:600}}>
                            ✅ Verified listing — visible to dealers for bidding
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        
        {activeSection === 'orders' && (
          <section id="ordersSection">
            <div className="section-header"><h2>📦 My Orders</h2></div>
            <div className="orders-grid" id="farmerOrdersGrid">
              {!loading && orders.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <h3>No Orders Yet</h3>
                </div>
              )}
              {orders.map(order => (
                <div key={order._id} className={`farmer-order-card status-${order.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  <span className={`order-status-badge status-${order.status.toLowerCase().replace(/\s+/g, '-')}`}>{order.status}</span>
                  <div className="order-product-info">
                    <div className="order-product-name">{order.productDetails.varietySpecies}</div>
                  </div>
                  <div className="order-details-grid">
                    <div className="order-detail-item"><div className="order-detail-label">Quantity</div><div className="order-detail-value">{order.quantity} {order.productDetails.unitOfSale}</div></div>
                    <div className="order-detail-item"><div className="order-detail-label">Vehicle</div><div className="order-detail-value">{order.vehicleDetails.vehicleId}</div></div>
                    <div className="order-detail-item"><div className="order-detail-label">Total Amount</div><div className="order-detail-value">₹{order.totalAmount.toFixed(2)}</div></div>
                  </div>
                  <div className="dealer-info-panel">
                    <div className="dealer-info-title">🏢 Dealer Information</div>
                    <div className="dealer-contact-info">
                      <span><strong>Name:</strong> {order.dealerDetails.businessName || `${order.dealerDetails.firstName}`}</span>
                      <span><strong>Mobile:</strong> {order.dealerDetails.mobile}</span>
                    </div>
                  </div>
                  {order.status === 'Bid Placed' && order.bidStatus === 'Pending' && (
                    <div className="bid-panel">
                      <h4>💰 New Bid Received</h4>
                      <p><strong>Bid Price:</strong> ₹{order.bidPrice} per {order.productDetails.unitOfSale}</p>
                      <p><strong>Total Amount:</strong> ₹{order.totalAmount.toFixed(2)}</p>
                      <div className="bid-actions">
                        <button onClick={() => handleAcceptBid(order._id)} disabled={loading}>✓ Accept Bid</button>
                        <button onClick={() => handleRejectBid(order._id)} disabled={loading}>✗ Reject Bid</button>
                      </div>
                    </div>
                  )}
                  {order.status === 'Bid Accepted' && order.receiptNumber && (
                    <div style={{ background: '#d1fae5', border: '2px solid #10b981', borderRadius: '8px', padding: '15px', marginTop: '15px' }}>
                      <h4 style={{ marginTop: 0, color: '#059669' }}>✓ Bid Accepted</h4>
                      <p style={{ margin: '5px 0' }}><strong>Final Price:</strong> ₹{order.bidPrice} per {order.productDetails?.unitOfSale}</p>
                      <p style={{ margin: '5px 0' }}><strong>Total Amount:</strong> ₹{order.totalAmount?.toFixed(2)}</p>
                      <p style={{ margin: '5px 0' }}><strong>Receipt Number:</strong> {order.receiptNumber}</p>
                      <button 
                        onClick={() => {
                          setSelectedReceiptOrder(order);
                          setModal({...modal, farmerReceipt: true});
                        }} 
                        style={{ background: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' }}
                      >
                        📄 View Receipt
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        
        {activeSection === 'notifications' && (
          <section id="notificationsSection">
            <div className="section-header"><h2>🔔 Notifications</h2></div>
            <div className="notifications-panel" id="notificationsList">
              {!loading && notifications.length === 0 && (
                <div className="empty-state"><div className="empty-state-icon">🔔</div><h3>No New Notifications</h3></div>
              )}
              {notifications.map(n => (
                <div key={n.id || n._id} className={`notification-item ${n.read ? 'read' : 'unread'}`}>
                  {/* ... notif card ... */}
                  <p className="notification-message">{n.message}</p>
                  <small className="notification-time">{new Date(n.timestamp).toLocaleString()}</small>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {activeSection === 'profile' && (
          <section id="profileSection">
            <div className="section-header"><h2>👤 My Profile</h2></div>
            <div className="profile-container">
              {loading ? <p>Loading profile...</p> : profile && (
                <div className="profile-card" id="profileInfo">
                  <p><b>Name:</b> {profile.firstName} {profile.lastName || ''}</p>
                  <p><b>Email:</b> {profile.email}</p>
                  <p><b>Mobile:</b> {profile.mobile}</p>
                  <p><b>Aadhaar:</b> {profile.aadhaar || 'N/A'}</p>
                  <p><b>Farm Location:</b> {profile.farmLocation || "N/A"}</p>
                  <p><b>Farm Size:</b> {profile.farmSize || "N/A"}</p>
                  <button id="editProfileBtnInCard" className="add-btn" style={{marginTop: '20px'}} onClick={() => setEditProfileData(profile)}>✏️ Edit Additional Details</button>
                </div>
              )}
              {editProfileData && (
                <form id="editProfileForm" className="profile-card edit-profile-form" onSubmit={handleProfileUpdate}>
                  <h3>Edit Additional Details</h3>
                  <label>Farm Location</label>
                  <input type="text" name="farmLocation" value={editProfileData.farmLocation} onChange={handleProfileEditChange} />
                  <label>Latitude</label>
                  <input type="text" name="latitude" value={editProfileData.latitude} readOnly />
                  <label>Longitude</label>
                  <input type="text" name="longitude" value={editProfileData.longitude} readOnly />
                  <button type="button" id="getGeoBtn" className="geo-btn" onClick={handleGetGeo}>📍 Get Current Location</button>
                  <label>Farm Size</label>
                  <input type="text" name="farmSize" value={editProfileData.farmSize} onChange={handleProfileEditChange} />
                  <div className="form-actions">
                    <button type="submit" id="saveProfileBtn" className="save-btn" disabled={loading}>💾 Save Changes</button>
                    <button type="button" id="cancelEditBtn" className="cancel-btn" onClick={() => setEditProfileData(null)}>✖ Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}
      </div>
      <FarmerReceiptModal 
            show={modal.farmerReceipt} 
            onClose={() => {
                setModal({ ...modal, farmerReceipt: false });
                setSelectedReceiptOrder(null);
            }} 
            order={selectedReceiptOrder} 
            user={user}
        />

    </>
  );
};

// Add this new modal component
const FarmerReceiptModal = ({ show, onClose, order, user }) => {
  if (!show || !order) return null;
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal" style={{display:'block', zIndex: 2000}} onClick={onClose}>
      <div className="modal-content" style={{maxWidth: '700px'}} onClick={e => e.stopPropagation()}>
        <span className="close" onClick={onClose}>&times;</span>
        
        <div id="farmerReceiptContent">
          {/* Removed inline styles from the container and h2, relying on CSS for #farmerReceiptContent h2 */}
          <div style={{textAlign: 'center', marginBottom: '20px'}}>
            <h2>AgroChain Sale Receipt</h2>
            <p style={{fontSize: '1.2em', margin: '10px 0'}}>Receipt No: <strong>{order.receiptNumber}</strong></p>
          </div>
          
          <div style={{border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', marginBottom: '20px', background: '#f9f9f9'}}>
            <h3 style={{marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '15px'}}>Transaction Summary</h3>
            
            {/* START: Replaced Table with Divs using #receiptDetails ID and .total-line class */}
            <div id="receiptDetails">
              <div>
                <span><strong>Product:</strong></span>
                <span>{order.productDetails?.varietySpecies || 'N/A'}</span>
              </div>
              <div>
                <span><strong>Quantity Sold:</strong></span>
                <span>{order.quantity} {order.productDetails?.unitOfSale}</span>
              </div>
              <div>
                <span><strong>Price per Unit:</strong></span>
                <span>₹{order.bidPrice || order.originalPrice}</span>
              </div>
              <div className="total-line">
                <span><strong>TOTAL AMOUNT:</strong></span>
                <span>₹{order.totalAmount?.toFixed(2)}</span>
              </div>
            </div>
            {/* END: Replaced Table with Divs */}

            {/* Dealer and Farmer details (kept inside Transaction Summary, cleaned up some inline borders) */}
            <div style={{display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', borderTop: '1px solid #e0e0e0', paddingTop: '15px', marginTop: '20px'}}>
              <div style={{flex: 1, minWidth: '250px', padding: '10px', background: '#fff', borderRadius: '6px'}}>
                <h4 style={{marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px', color: '#3b82f6'}}>Sold To (Dealer)</h4>
                <p><strong>Name:</strong> {order.dealerDetails?.businessName || `${order.dealerDetails?.firstName} ${order.dealerDetails?.lastName}`}</p>
                <p><strong>Email:</strong> {order.dealerDetails?.email}</p>
                <p><strong>Mobile:</strong> {order.dealerDetails?.mobile}</p>
              </div>
              <div style={{flex: 1, minWidth: '250px', padding: '10px', background: '#fff', borderRadius: '6px'}}>
                <h4 style={{marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px', color: '#3b82f6'}}>Seller (Farmer)</h4>
                <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Mobile:</strong> {user?.mobile}</p>
              </div>
            </div>
          </div>

          
          <div style={{textAlign: 'center', marginTop: '30px', fontSize: '0.9em', color: '#6b7280', paddingTop: '15px', borderTop: '1px solid #e0e0e0'}}>
            <p>This transaction was securely recorded on {order.assignedDate ? new Date(order.assignedDate).toLocaleDateString() : new Date().toLocaleDateString()}.</p>
          </div>
        </div>
        
        <div style={{textAlign: 'center', marginTop: '20px'}}>
          {/* Removed inline style, relying on CSS for .btn-primary */}
          <button className="btn-primary" onClick={handlePrint}>
            🖨️ Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;