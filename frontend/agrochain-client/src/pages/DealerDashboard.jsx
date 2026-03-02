import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../services/api.jsx';
import { useNavigate } from 'react-router-dom';
import '../assets/css/dealer.css';
import { useDispatch, useSelector } from 'react-redux';
import { initializeCart, addToCart, removeFromCart, clearCart } from '../redux/slices/cartSlice';

// --- DealerNavbar Component ---
const DealerNavbar = ({ user, cartCount, onSignout, onNavigate, activeSection }) => {
    const [profileOpen, setProfileOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleNav = (section) => {
        onNavigate(section);
        setMobileMenuOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileOpen && !event.target.closest('.profile-dropdown')) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [profileOpen]);

    return (
        <>
            <nav className="navbar">
                <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    ☰
                </button>
                <div className="nav-left">
                    <img src="https://ik.imagekit.io/a2wpi1kd9/imgToUrl/image-to-url_ThyEiMVLh" alt="AgroChain Logo" className="logo" />
                    <span className="brand-name">Agro<span className="chain-text">Chain</span></span>
                </div>
                <div className="navbar-center">
                    <button onClick={() => handleNav('browse')} className={activeSection === 'browse' ? 'active' : ''}>
                        🌾 Products
                    </button>
                    <button onClick={() => handleNav('vehicles')} className={activeSection === 'vehicles' ? 'active' : ''}>
                        🚗 Vehicles
                    </button>
                    <button onClick={() => handleNav('orders')} className={activeSection === 'orders' ? 'active' : ''}>
                        📦 Orders
                    </button>
                    <button onClick={() => handleNav('inventory')} className={activeSection === 'inventory' ? 'active' : ''}>
                        📦 Inventory
                    </button>
                    <button onClick={() => handleNav('retailerOrders')} className={activeSection === 'retailerOrders' ? 'active' : ''}>
                        🛍️ Retailer Orders
                    </button>
                </div>
                <div className="navbar-right">
                    <button className="cart-btn" onClick={() => handleNav('cart')}>
                        🛒 <span className="cart-badge" style={{ display: cartCount > 0 ? 'flex' : 'none' }}>{cartCount}</span>
                    </button>
                    <div className="profile-dropdown">
                        <button className="profile-btn" onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }}>
                            <div className="profile-avatar-small">{user.firstName?.charAt(0)}</div>
                            <span className="profile-name-text">{user.businessName || user.firstName}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>
                        <div className={`profile-menu ${profileOpen ? 'show' : ''}`}>
                            <button onClick={() => handleNav('profile')}>👤 My Profile</button>
                            <div className="dropdown-divider"></div>
                            <button className="logout-item" onClick={onSignout}>🚪 Sign Out</button>
                        </div>
                    </div>
                </div>
            </nav>
            
            <div className={`mobile-nav-overlay ${mobileMenuOpen ? 'show' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
            
            <div className={`mobile-nav-menu ${mobileMenuOpen ? 'show' : ''}`}>
                <div className="mobile-menu-header">
                    <h3>Menu</h3>
                    <button className="close-menu-btn" onClick={() => setMobileMenuOpen(false)}>&times;</button>
                </div>
                <button onClick={() => handleNav('browse')} className={activeSection === 'browse' ? 'active' : ''}>
                    🌾 Browse Products
                </button>
                <button onClick={() => handleNav('vehicles')} className={activeSection === 'vehicles' ? 'active' : ''}>
                    🚗 Vehicles
                </button>
                <button onClick={() => handleNav('orders')} className={activeSection === 'orders' ? 'active' : ''}>
                    📦 My Orders
                </button>
                <button onClick={() => handleNav('inventory')} className={activeSection === 'inventory' ? 'active' : ''}>
                    📦 My Inventory
                </button>
                <button onClick={() => handleNav('retailerOrders')} className={activeSection === 'retailerOrders' ? 'active' : ''}>
                    🛍️ Retailer Orders
                </button>
                <button onClick={() => handleNav('cart')} className={activeSection === 'cart' ? 'active' : ''}>
                    🛒 My Cart ({cartCount})
                </button>
                <button onClick={() => handleNav('profile')} className={activeSection === 'profile' ? 'active' : ''}>
                    👤 My Profile
                </button>
                <button className="logout-item" onClick={onSignout}>
                    🚪 Sign Out
                </button>
            </div>
        </>
    );
};

// --- DealerDashboard Page Component ---
const DealerDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    // Navigation & State
    const [activeSection, setActiveSection] = useState('browse');
    
    // Data State
    const [allProducts, setAllProducts] = useState([]);
    const [allVehicles, setAllVehicles] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [retailerOrders, setRetailerOrders] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Cart & Orders
    const dispatch = useDispatch();
    const { items: cart, totalItems } = useSelector((state) => state.cart);
    const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem("dealerOrders")) || []);

    // Filters & Modals
    const [filters, setFilters] = useState({ filterProductType: '', filterVariety: '', filterPrice: '' });
    const [productQuantities, setProductQuantities] = useState({});
    const [modal, setModal] = useState({ 
        farmer: false, 
        assignVehicle: false, 
        bid: false, 
        receipt: false, 
        viewReviews: false, // Used in inventory for Retailer reviews
        qualityReport: false, 
        editProfile: false,
        retailerReceipt: false 
    });
    const [selectedData, setSelectedData] = useState(null);
    
    // Forms
    const [vehicleFormData, setVehicleFormData] = useState({ vehicleId: '', vehicleType: '', temperatureCapacity: '' });
    const [bidPrice, setBidPrice] = useState(0);

    // --- Core Data Fetching ---
    const loadAllData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [prodRes, vehRes, profRes, retOrdRes] = await Promise.all([
                api.get('/dealer/all-products'),
                api.get(`/dealer/vehicles/${user.email}`),
                api.get(`/dealer/profile/${user.email}`),
                api.get(`/dealer/retailer-orders/${user.email}`)
            ]);
            setAllProducts(prodRes.data);
            setAllVehicles(vehRes.data);
            setProfile(profRes.data);
            setInventory(profRes.data.inventory || []);
            setRetailerOrders(retOrdRes.data);
        } catch (err) {
            console.error("Error loading data:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Initial Load
    useEffect(() => { loadAllData(); }, [loadAllData]);
    
    // Sync Storage
    useEffect(() => { dispatch(initializeCart('dealer')); }, [dispatch]);
    useEffect(() => { localStorage.setItem("dealerOrders", JSON.stringify(orders)); }, [orders]);

    // --- UPDATED POLLING LOGIC (PRODUCTS + ORDERS) ---
    useEffect(() => {
        if (!user) return;
        
        const fetchUpdates = async () => {
             try {
                // 1. Fetch Orders (Sync Status)
                const resOrders = await api.get(`/dealer/orders/${user.email}`);
                const serverOrders = resOrders.data;
                
                setOrders(prevOrders => {
                    let hasChanges = false;
                    const updatedOrders = prevOrders.map(localOrder => {
                        const serverOrder = localOrder.serverOrderId 
                            ? serverOrders.find(so => so._id === localOrder.serverOrderId)
                            : null;
                        
                        if (serverOrder) {
                            if (localOrder.bidStatus !== serverOrder.bidStatus || 
                                localOrder.status !== serverOrder.status ||
                                localOrder.receiptNumber !== serverOrder.receiptNumber) {
                                hasChanges = true;
                                if (serverOrder.bidStatus === 'Accepted' && localOrder.bidStatus !== 'Accepted') {
                                    loadAllData(); // Refresh inventory if bid accepted
                                }
                                return {
                                    ...localOrder,
                                    serverOrderId: serverOrder._id,
                                    serverDataSynced: true,
                                    bidStatus: serverOrder.bidStatus,
                                    status: serverOrder.status,
                                    receiptNumber: serverOrder.receiptNumber,
                                    receiptDate: serverOrder.receiptGeneratedAt,
                                    farmerName: serverOrder.farmerDetails?.firstName + ' ' + (serverOrder.farmerDetails?.lastName || ''),
                                    farmerMobile: serverOrder.farmerDetails?.mobile,
                                    totalAmount: serverOrder.totalAmount,
                                    bidPrice: serverOrder.bidPrice
                                };
                            }
                        }
                        return localOrder;
                    });
                    return hasChanges ? updatedOrders : prevOrders;
                });

                // 2. Fetch Products (Dynamic Loading)
                const resProducts = await api.get('/dealer/all-products');
                // Update state to reflect any new products added by farmers in real-time
                setAllProducts(resProducts.data);

             } catch(e) { console.error("Polling error:", e); }
        };

        const interval = setInterval(fetchUpdates, 5000); // Poll every 5 seconds
        fetchUpdates(); // Initial call

        return () => clearInterval(interval);
    }, [user, loadAllData]);

    // --- Actions ---
    const handleNavigate = (section) => {
        setActiveSection(section);
        window.scrollTo(0, 0);
    };

    const handleSignout = () => {
        if (window.confirm('Sign out?')) {
            logout();
            localStorage.removeItem('dealerCart');
            localStorage.removeItem('dealerOrders');
            navigate('/login');
        }
    };

    const handleFilterChange = (e) => setFilters({ ...filters, [e.target.id]: e.target.value });
    
    // --- DYNAMIC FILTERS ---
    const availableProductTypes = [...new Set(allProducts.map(p => p.productType))].sort();

    const getFilteredProducts = () => {
        return allProducts.filter(p => {
            if (p.harvestQuantity <= 0) return false;
            return (!filters.filterProductType || p.productType === filters.filterProductType) &&
                   (!filters.filterVariety || p.varietySpecies.toLowerCase().includes(filters.filterVariety.toLowerCase())) &&
                   (!filters.filterPrice || p.targetPrice <= parseFloat(filters.filterPrice));
        });
    };

    const handleQtyChange = (id, val) => setProductQuantities({ ...productQuantities, [id]: val });

    const handleAddToCart = (product) => {
        const qty = parseFloat(productQuantities[product._id]);
        if (!qty || qty <= 0) return alert("Please enter valid quantity");
        if (qty > product.harvestQuantity) return alert("Exceeds available stock");
        
        dispatch(addToCart({
            item: { ...product, quantity: qty, originalHarvestQuantity: product.harvestQuantity },
            userRole: 'dealer'
        }));
        setProductQuantities({ ...productQuantities, [product._id]: '' });
        alert("Added to cart");
    };

    const handleRemoveFromCart = (id) => {
        dispatch(removeFromCart({ itemId: id, userRole: 'dealer' }));
    };

    const handleOrderFromCart = (item) => {
        const product = allProducts.find(p => p._id === item._id);
        if (!product || item.quantity > product.harvestQuantity) {
             alert("Stock changed. Please update cart.");
             return;
        }
        setOrders(prev => [...prev, { 
            ...item, 
            orderId: `local-${Date.now()}-${Math.random()}`, 
            vehicleAssigned: false, 
            bidPlaced: false, 
            bidStatus: 'Pending Vehicle' 
        }]);
        handleRemoveFromCart(item._id);
        alert("Proceed to Orders to assign vehicle.");
        handleNavigate('orders');
    };

    // Vehicle Logic
    const handleVehicleFormChange = (e) => setVehicleFormData({ ...vehicleFormData, [e.target.id]: e.target.value });
    const handleAddVehicle = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/dealer/vehicles/${user.email}`, { ...vehicleFormData, dealerEmail: user.email });
            setVehicleFormData({ vehicleId: '', vehicleType: '', temperatureCapacity: '' });
            loadAllData();
        } catch (err) { alert("Error adding vehicle"); }
    };
    const handleDeleteVehicle = async (id) => {
        if(window.confirm("Delete vehicle?")) {
            await api.delete(`/dealer/vehicles/${user.email}/${id}`);
            loadAllData();
        }
    };
    const handleFreeVehicle = async (id) => {
        if(window.confirm("Free vehicle?")) {
            await api.post(`/dealer/vehicles/free/${user.email}/${id}`);
            loadAllData();
            setOrders(prev => prev.filter(o => o.vehicleId !== id || o.bidStatus === 'Accepted'));
        }
    };

    // Modal & Business Logic
    const openModal = (name, data) => { 
        setSelectedData(data); 
        if(name === 'bid') setBidPrice(0);
        setModal({ ...modal, [name]: true }); 
    };
    const closeModal = (name) => { setModal({ ...modal, [name]: false }); setSelectedData(null); };

    const handleAssignVehicle = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post("/dealer/assign-vehicle", {
                dealerEmail: user.email,
                productId: selectedData._id,
                farmerEmail: selectedData.farmerEmail,
                vehicleId: e.target.vehicleSelect.value,
                quantity: selectedData.quantity,
                tentativeDate: e.target.tentativeDate.value
            });
            setOrders(prev => prev.map(o => o.orderId === selectedData.orderId ? { 
                ...o, 
                vehicleAssigned: true, 
                serverOrderId: res.data.orderId,
                status: 'Vehicle Assigned' 
            } : o));
            closeModal('assignVehicle');
            loadAllData();
            alert("Vehicle Assigned!");
        } catch (err) { alert(err.response?.data?.msg || "Error"); }
    };

    const handlePlaceBid = async (e) => {
        e.preventDefault();
        try {
             await api.post('/dealer/place-bid', { orderId: selectedData.serverOrderId, bidPrice });
             setOrders(prev => prev.map(o => o.orderId === selectedData.orderId ? { ...o, bidPlaced: true, bidPrice, bidStatus: 'Pending' } : o));
             closeModal('bid');
             alert("Bid Placed!");
        } catch (err) { alert("Error placing bid"); }
    };

    const handleProfileUpdate = async (updatedData) => {
        try {
            const res = await api.put(`/dealer/profile/${user.email}`, updatedData);
            setProfile(res.data);
            closeModal('editProfile');
            alert("Profile updated successfully!");
        } catch (err) {
            alert(err.response?.data?.msg || "Error updating profile.");
        }
    };

    const handleInventoryPriceChange = async (item) => {
        const price = prompt("New Price:", item.unitPrice);
        if(price) {
            await api.put('/dealer/inventory/update-price', { dealerEmail: user.email, inventoryId: item._id, newPrice: price });
            loadAllData();
        }
    };

    // --- UPDATED INVENTORY QUANTITY CHANGE HANDLER ---
    const handleInventoryQuantityChange = async (item) => {
         const qtyStr = prompt(`Current Quantity: ${item.quantity}\nEnter New Quantity (Must be less than current):`, item.quantity);
         
         if (qtyStr === null) return; // User cancelled

         const newQty = parseFloat(qtyStr);
         
         if (isNaN(newQty) || newQty < 0) {
             alert("Please enter a valid number.");
             return;
         }

         if (newQty > item.quantity) {
             alert("You can only reduce the quantity, not increase it.");
             return;
         }

         if (newQty === item.quantity) return; // No change

         try {
            await api.put('/dealer/inventory/update-quantity', { dealerEmail: user.email, inventoryId: item._id, newQuantity: newQty });
            loadAllData();
         } catch (err) {
             alert(err.response?.data?.msg || "Error updating quantity");
         }
    };

    const handleRemoveFromInventory = async (item) => {
        if(window.confirm("Remove item?")) {
            await api.delete('/dealer/inventory/remove', { data: { dealerEmail: user.email, inventoryId: item._id } });
            loadAllData();
        }
    };

    if (loading && !profile) return <div style={{textAlign: 'center', padding: '50px'}}>Loading...</div>;
    if (!profile) return <div>Error loading profile.</div>;

    const totalInvItems = inventory.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const totalInvValue = inventory.reduce((sum, i) => sum + (i.totalValue || (i.unitPrice * i.quantity) || 0), 0);

    return (
        <>
            <DealerNavbar 
                user={profile} 
                cartCount={totalItems} 
                onSignout={handleSignout} 
                onNavigate={handleNavigate}
                activeSection={activeSection}
            />
            
            <div className="main-container">
                {activeSection === 'browse' && (
                    <aside className="sidebar-filters">
                        <h3>🔍 Filter Products</h3>
                        <div className="filter-group">
                            <label>Type</label>
                            {/* DYNAMIC FILTER DROPDOWN */}
                            <select id="filterProductType" value={filters.filterProductType} onChange={handleFilterChange}>
                                <option value="">All Types</option>
                                {availableProductTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Variety</label>
                            <input type="text" id="filterVariety" value={filters.filterVariety} onChange={handleFilterChange} placeholder="e.g. Mango" />
                        </div>
                        <div className="filter-group">
                            <label>Max Price</label>
                            <input type="number" id="filterPrice" value={filters.filterPrice} onChange={handleFilterChange} placeholder="₹" />
                        </div>
                    </aside>
                )}

                <main className="content-area">
                    {/* BROWSE SECTION */}
                    <section className={activeSection === 'browse' ? 'active-section' : 'hidden-section'}>
                        <div className="products-grid">
                            {getFilteredProducts().length === 0 ? <div className="empty-state"><h3>No products found.</h3></div> :
                            getFilteredProducts().map(p => (
                                <ProductCard 
                                    key={p._id} 
                                    product={p} 
                                    onAddToCart={handleAddToCart} 
                                    onQtyChange={handleQtyChange} 
                                    onViewFarmer={openModal} 
                                    onViewQualityReport={openModal} 
                                    qty={productQuantities[p._id] || ''} 
                                />
                            ))}
                        </div>
                    </section>

                    {/* CART SECTION */}
                    <section className={activeSection === 'cart' ? 'active-section' : 'hidden-section'}>
                        <div className="section-header"><h2>🛒 My Cart</h2></div>
                        <div className="cart-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
                            {cart.length === 0 ? <div className="empty-state"><h3>Your cart is empty.</h3></div> :
                            cart.map(item => (
                                <div key={item._id} className="modern-card">
                                    <img src={item.imageUrl} alt={item.varietySpecies} style={{width:'100%', height:'150px', objectFit:'cover'}} />
                                    <div className="card-body">
                                        <h4>{item.varietySpecies}</h4>
                                        <div className="card-badges"><span className="badge type">{item.productType}</span></div>
                                        <p className="price">₹{item.targetPrice} / {item.unitOfSale}</p>
                                        <p><strong>Qty:</strong> {item.quantity}</p>
                                        <div className="card-actions" style={{marginTop:'15px'}}>
                                            <button className="btn-primary" onClick={() => handleOrderFromCart(item)}>Order Now</button>
                                            <button className="btn-text" style={{color:'red'}} onClick={() => handleRemoveFromCart(item._id)}>Remove</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ORDERS SECTION */}
                    <section className={activeSection === 'orders' ? 'active-section' : 'hidden-section'}>
                        <div className="section-header"><h2>📦 My Orders (To Farmers)</h2></div>
                        <div className="orders-grid">
                            {orders.length === 0 ? <div className="empty-state"><h3>No orders yet.</h3></div> :
                            orders.map(order => (
                                <FarmerOrderCard key={order.orderId} item={order} onAssignVehicle={openModal} onPlaceBid={openModal} onViewReceipt={openModal} />
                            ))}
                        </div>
                    </section>

                    {/* INVENTORY SECTION */}
                    <section className={activeSection === 'inventory' ? 'active-section' : 'hidden-section'}>
                        <div className="section-header"><h2>📦 Warehouse Inventory</h2></div>
                        <div className="stats-row">
                            <div className="stat-box"><span>Items</span><h3>{totalInvItems.toFixed(2)}</h3></div>
                            <div className="stat-box"><span>Value</span><h3>₹{totalInvValue.toLocaleString()}</h3></div>
                        </div>
                        <div className="inventory-grid">
                            {inventory.map(item => (
                                <InventoryCard key={item._id} item={item} onPriceChange={handleInventoryPriceChange} onQtyChange={handleInventoryQuantityChange} onRemove={handleRemoveFromInventory} onViewReviews={openModal} />
                            ))}
                        </div>
                    </section>

                    {/* VEHICLES SECTION */}
                    <section className={activeSection === 'vehicles' ? 'active-section' : 'hidden-section'}>
                        <div className="section-header">
                            <h2>Vehicle Management</h2>
                        </div>
                        <div className="vehicle-form-container">
                             <div className="vehicle-form-header">
                                <h3>Add New Vehicle</h3>
                             </div>
                             <form onSubmit={handleAddVehicle} className="vehicle-add-form">
                                <div className="form-group">
                                    <label>Vehicle Registration No.</label>
                                    <input type="text" id="vehicleId" placeholder="e.g. MH-12-AB-1234" value={vehicleFormData.vehicleId} onChange={handleVehicleFormChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Vehicle Type</label>
                                    <select id="vehicleType" value={vehicleFormData.vehicleType} onChange={handleVehicleFormChange} required>
                                        <option value="">Select Type...</option>
                                        <option value="Reefer Truck (5 MT)">Reefer Truck (5 MT)</option>
                                        <option value="Heavy Truck (10 MT)">Heavy Truck (10 MT)</option>
                                        <option value="Insulated Van (2 MT)">Insulated Van (2 MT)</option>
                                        <option value="Inspection Van">Inspection Van</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Temperature Capacity</label>
                                    <input type="text" id="temperatureCapacity" placeholder="e.g. -18°C to 4°C" value={vehicleFormData.temperatureCapacity} onChange={handleVehicleFormChange} required />
                                </div>
                                <button type="submit" className="btn-add-vehicle">Add Vehicle</button>
                             </form>
                        </div>
                        <div className="vehicles-grid">
                            {allVehicles.length === 0 ? (
                                <div className="empty-state"><div style={{fontSize:'3rem'}}>🚚</div><h3>No vehicles in fleet</h3></div>
                            ) : (
                                allVehicles.map(v => (
                                    <VehicleCard key={v._id} vehicle={v} onDelete={handleDeleteVehicle} onFree={handleFreeVehicle} />
                                ))
                            )}
                        </div>
                    </section>

                    {/* RETAILER ORDERS SECTION */}
                    <section className={activeSection === 'retailerOrders' ? 'active-section' : 'hidden-section'}>
                        <div className="section-header"><h2>🛍️ Orders from Retailers</h2></div>
                        <div className="orders-grid">
                            {retailerOrders.length === 0 ? <div className="empty-state"><h3>No orders received.</h3></div> :
                            retailerOrders.map(order => (
                                <RetailerOrderCard key={order._id} order={order} onViewReceipt={openModal} />
                            ))}
                        </div>
                     </section>

                    {/* PROFILE SECTION */}
                    <section className={activeSection === 'profile' ? 'active-section' : 'hidden-section'}>
                        <div className="profile-container">
                            <div className="profile-header-card">
                                <div className="profile-cover"></div>
                                <div className="profile-avatar-large">
                                    {profile.firstName?.charAt(0)}
                                </div>
                                <div className="profile-main-info">
                                    <h1>{profile.businessName || `${profile.firstName} ${profile.lastName}`}</h1>
                                    <button className="btn-edit-profile" onClick={() => openModal('editProfile', profile)}>✏️ Edit Profile</button>
                                </div>
                            </div>
                            <div className="profile-details-grid">
                                <div className="detail-group">
                                    <h3>🏢 Business Information</h3>
                                    <div className="detail-row"><label>Business Name</label><span>{profile.businessName || 'N/A'}</span></div>
                                    <div className="detail-row"><label>GSTIN</label><span>{profile.gstin || 'N/A'}</span></div>
                                    <div className="detail-row"><label>Commodities</label><span>{profile.preferredCommodities?.join(', ') || 'General'}</span></div>
                                </div>
                                <div className="detail-group">
                                    <h3>📞 Contact Details</h3>
                                    <div className="detail-row"><label>Email</label><span>{profile.email}</span></div>
                                    <div className="detail-row"><label>Mobile</label><span>{profile.mobile}</span></div>
                                    <div className="detail-row"><label>Warehouse</label><span>{profile.warehouseAddress || 'N/A'}</span></div>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
            
            {/* --- MODALS --- */}
            <FarmerModal show={modal.farmer} onClose={() => closeModal('farmer')} farmerEmail={selectedData?.farmerEmail} />
            <AssignVehicleModal show={modal.assignVehicle} onClose={() => closeModal('assignVehicle')} onSubmit={handleAssignVehicle} vehicles={allVehicles.filter(v => v.currentStatus === 'AVAILABLE')} />
            <BidModal show={modal.bid} onClose={() => closeModal('bid')} onSubmit={handlePlaceBid} setBidPrice={setBidPrice} order={selectedData} />
            <ReceiptModal show={modal.receipt} onClose={() => closeModal('receipt')} order={selectedData} user={profile} />
            <ViewReviewsModal show={modal.viewReviews} onClose={() => closeModal('viewReviews')} product={selectedData} />
            <EditProfileModal show={modal.editProfile} onClose={() => closeModal('editProfile')} profileData={profile} onSave={handleProfileUpdate} />
            <RetailerReceiptModal show={modal.retailerReceipt} onClose={() => closeModal('retailerReceipt')} order={selectedData} dealer={profile} />
            <QualityReportModal show={modal.qualityReport} onClose={() => closeModal('qualityReport')} product={selectedData} />
        </>
    );
};

// --- SUB COMPONENTS ---

const ProductCard = ({ product, onAddToCart, qty, onQtyChange, onViewFarmer, onViewQualityReport }) => (
    <div className="modern-card product-card">
        <img src={product.imageUrl} alt={product.varietySpecies} />
        <div className="card-body">
            <div className="card-badges">
                <span className="badge type">{product.productType}</span>
                <span className="badge stock">{product.harvestQuantity} {product.unitOfSale}</span>
            </div>
            <h3>{product.varietySpecies}</h3>
            <p className="price">₹{product.targetPrice} <small>/ {product.unitOfSale}</small></p>

            {/* Row 1: View Farmer + Quality Report (same line) */}
            <div className="card-action-row info-row">
                <button className="btn-view-farmer" onClick={() => onViewFarmer('farmer', product)}>
                    👨‍🌾 View Farmer
                </button>
                {product.qualityReport && product.qualityReport.grade && (
                    <button className="btn-view-reviews" onClick={() => onViewQualityReport('qualityReport', product)} style={{background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0'}}>
                        📋 Quality Report
                    </button>
                )}
            </div>

            {/* Row 2: Qty + Add to Cart */}
            <div className="card-action-row cart-row">
                <input
                    type="number"
                    value={qty}
                    onChange={(e) => onQtyChange(product._id, e.target.value)}
                    placeholder="Qty"
                    className="qty-input"
                />
                <button className="btn-add-cart" onClick={() => onAddToCart(product)}>
                    🛒 Add to Cart
                </button>
            </div>
        </div>
    </div>
);

const VehicleCard = ({ vehicle, onDelete, onFree }) => {
    const isTruck = vehicle.vehicleType.toLowerCase().includes('truck');
    const statusClass = vehicle.currentStatus.toLowerCase();

    return (
        <div className="vehicle-card-enhanced">
            <div className={`vehicle-status-bar ${statusClass}`}></div>
            <div className="vehicle-card-body">
                <div className="vehicle-header-row">
                    <span className={`vehicle-status-badge ${statusClass}`}>
                        {vehicle.currentStatus}
                    </span>
                </div>
                
                <div className="vehicle-info">
                    <h4>{vehicle.vehicleId}</h4>
                    <span className="vehicle-type">{vehicle.vehicleType}</span>
                </div>

                <div className="vehicle-specs">
                    <div className="spec-item">
                        <span>Temp Range:</span>
                        <span>{vehicle.temperatureCapacity}</span>
                    </div>
                    {vehicle.assignedTo && (
                        <div className="spec-item" style={{marginTop:'8px', paddingTop:'8px', borderTop:'1px dashed #e5e7eb'}}>
                            <span>Assigned:</span>
                            <span>{vehicle.assignedTo.farmerName}</span>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="vehicle-card-footer">
                {vehicle.currentStatus === 'ASSIGNED' && (
                    <button onClick={() => onFree(vehicle._id)} className="btn-vehicle-action free">
                        ⚡ Free Vehicle
                    </button>
                )}
                <button onClick={() => onDelete(vehicle._id)} className="btn-vehicle-action delete">
                    🗑️ Delete
                </button>
            </div>
        </div>
    );
};

// --- UPDATED INVENTORY CARD WITH "Reduce Qty" Button ---
const InventoryCard = ({ item, onPriceChange, onQtyChange, onRemove, onViewReviews }) => {
    const isLowStock = item.quantity < 50;
    const totalValue = (item.quantity * item.unitPrice).toLocaleString('en-IN');

    return (
        <div className="inventory-card-pro">
            <div className="inv-card-image">
                <img src={item.imageUrl} alt={item.productName} />
                <span className={`stock-badge ${isLowStock ? 'low-stock' : 'in-stock'}`}>
                    {isLowStock ? '⚠️ Low Stock' : '✅ In Stock'}
                </span>
            </div>
            
            <div className="inv-card-details">
                <div className="inv-header">
                    <h4>{item.productName}</h4>
                    <span className="inv-type">{item.productType}</span>
                </div>

                <div className="inv-stats-grid">
                    <div className="inv-stat">
                        <span className="label">Quantity</span>
                        <span className="value">{item.quantity} <small>{item.unitOfSale}</small></span>
                    </div>
                    <div className="inv-stat">
                        <span className="label">Unit Price</span>
                        <span className="value" style={{color: '#10b981'}}>₹{item.unitPrice}</span>
                    </div>
                    <div className="inv-stat full-width">
                        <span className="label">Total Valuation</span>
                        <span className="value">₹{totalValue}</span>
                    </div>
                </div>

                <div className="inv-actions">
                    <button className="inv-action-btn" onClick={() => onQtyChange(item)}>📦 Reduce Qty</button>
                    <button className="inv-action-btn" onClick={() => onPriceChange(item)}>🏷️ Set Price</button>
                    <button className="inv-action-btn delete" onClick={() => onRemove(item)} title="Remove from Inventory">🗑️</button>
                </div>

                {item.retailerReviews && item.retailerReviews.length > 0 && (
                    <button className="view-reviews-link" onClick={() => onViewReviews('viewReviews', item)}>
                        ⭐ View {item.retailerReviews.length} Retailer Reviews
                    </button>
                )}
            </div>
        </div>
    );
};

const RetailerReceiptModal = ({ show, onClose, order, dealer }) => {
    if (!show || !order) return null;

    return (
        <div className="modal" style={{display:'block'}} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:'500px'}}>
                <span className="close" onClick={onClose}>&times;</span>
                
                <div className="receipt-paper" id="printable-receipt">
                    <div className="receipt-header">
                        <h2>TAX INVOICE</h2>
                        <p><strong>AgroChain Dealer Network</strong></p>
                        <p>{dealer?.businessName}</p>
                        <p style={{fontSize:'0.8rem'}}>{dealer?.warehouseAddress}</p>
                    </div>

                    <div className="receipt-row">
                        <span><strong>Order ID:</strong></span>
                        <span>#{order._id.slice(-8).toUpperCase()}</span>
                    </div>
                    <div className="receipt-row">
                        <span><strong>Date:</strong></span>
                        <span>{new Date(order.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <div className="receipt-row">
                        <span><strong>Billed To:</strong></span>
                        <span>{order.retailerEmail}</span>
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-row" style={{fontWeight:'bold', borderBottom:'1px solid #eee', paddingBottom:'5px'}}>
                        <span>Item</span>
                        <span>Qty</span>
                    </div>

                    {order.products.map((p, i) => (
                        <div key={i} className="receipt-row">
                            <span>{p.productName}</span>
                            <span>{p.quantity}</span>
                        </div>
                    ))}

                    <div className="receipt-total receipt-row">
                        <span>TOTAL AMOUNT</span>
                        <span>₹{order.totalAmount.toFixed(2)}</span>
                    </div>

                    <div style={{textAlign:'center', marginTop:'20px', fontSize:'0.8rem', fontStyle:'italic'}}>
                        <p>Thank you for your business!</p>
                        <p>Generated via AgroChain</p>
                    </div>
                </div>

                <button className="btn-primary" style={{width:'100%'}} onClick={() => window.print()}>
                    🖨️ Print Receipt
                </button>
            </div>
        </div>
    );
};

const FarmerOrderCard = ({ item, onAssignVehicle, onPlaceBid, onViewReceipt }) => {
    let statusBadge = null;
    let action = null;

    if (item.bidStatus === 'Accepted') {
        statusBadge = <span className="status-badge success">✓ Accepted</span>;
        action = (
            <button className="btn-action primary" onClick={() => onViewReceipt('receipt', item)}>
                📄 View Receipt
            </button>
        );
    } else if (item.bidStatus === 'Rejected') {
        statusBadge = <span className="status-badge error">❌ Rejected</span>;
    } else if (item.bidPlaced || item.status === 'Bid Placed') {
        statusBadge = <span className="status-badge warning">⏳ Bid Pending</span>;
    } else if (item.vehicleAssigned) {
        statusBadge = <span className="status-badge info">🚚 Vehicle Assigned</span>;
        action = (
            <button className="btn-action primary" onClick={() => onPlaceBid('bid', item)}>
                💰 Place Bid
            </button>
        );
    } else {
        statusBadge = <span className="status-badge danger">⚠️ Action Needed</span>;
        action = (
            <button className="btn-action danger" onClick={() => onAssignVehicle('assignVehicle', item)}>
                🚚 Assign Vehicle
            </button>
        );
    }

    const orderDate = item.orderId.includes('-') 
        ? new Date(parseInt(item.orderId.split('-')[1])).toLocaleDateString() 
        : 'Recent';

    return (
        <div className="order-card-pro">
            <div className="order-header">
                <div className="order-id-label">
                    <span>ID:</span>
                    <span>{item.receiptNumber || (item.serverOrderId ? item.serverOrderId.slice(-6).toUpperCase() : 'Local')}</span>
                </div>
                {statusBadge}
            </div>
            
            <div className="order-content">
                <div className="order-image">
                     <img src={item.imageUrl} alt={item.varietySpecies} />
                </div>
                
                <div className="order-details">
                    <h4 className="product-title">
                        {item.varietySpecies} 
                        <span className="product-type">({item.productType})</span>
                    </h4>
                    
                    <div className="detail-grid">
                        <div className="detail-item">
                            <span className="label">Farmer</span>
                            <span className="value">{item.farmerName || item.farmerEmail || 'Fetching...'}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Quantity</span>
                            <span className="value">{item.quantity} {item.unitOfSale}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Target Price</span>
                            <span className="value">₹{item.targetPrice}</span>
                        </div>
                        
                        {item.bidStatus && (
                             <div className="detail-item">
                                <span className="label">Bid Status</span>
                                <span className="value" style={{textTransform:'capitalize', color: item.bidStatus === 'Accepted' ? '#15803d' : '#b45309'}}>
                                    {item.bidStatus}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="order-footer">
                <div className="order-date">
                    Ordered on: {orderDate}
                </div>
                <div className="order-actions-container">
                    {action}
                </div>
            </div>
        </div>
    );
};

const RetailerOrderCard = ({ order, onViewReceipt }) => {
    const getStatusClass = (status) => {
        const s = status?.toLowerCase() || '';
        if (s.includes('delivered') || s.includes('completed')) return 'success';
        if (s.includes('cancel')) return 'error';
        if (s.includes('pending')) return 'warning';
        return 'info';
    };

    const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString();

    return (
        <div className="order-card-pro">
            <div className="order-header">
                <div className="order-id-label">
                    <span>Retailer:</span>
                    <span style={{textTransform: 'lowercase'}}>{order.retailerEmail.split('@')[0]}...</span>
                </div>
                <span className={`status-badge ${getStatusClass(order.orderStatus)}`}>
                    {order.orderStatus}
                </span>
            </div>

            <div className="order-content" style={{flexDirection:'column', gap:'10px'}}>
                <div style={{width:'100%'}}>
                    <h4 className="product-title" style={{fontSize:'1rem'}}>Order #{order._id.slice(-6).toUpperCase()}</h4>
                    
                    <div className="order-items-list">
                        {order.products.map((p, idx) => (
                            <div key={idx} className="order-item-row">
                                <span>{p.productName}</span>
                                <span>x {p.quantity}</span>
                            </div>
                        ))}
                    </div>

                    <div className="order-total-display">
                        <span className="total-label">Total Amount</span>
                        <span className="total-value">₹{order.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="order-footer">
                <div className="order-date">{orderDate}</div>
                <button className="btn-action primary" onClick={() => onViewReceipt('retailerReceipt', order)}>
                    📄 View Receipt
                </button>
            </div>
        </div>
    );
};

const FarmerModal = ({ show, onClose, farmerEmail }) => {
    const [farmer, setFarmer] = useState(null);
    useEffect(() => {
        if (show && farmerEmail) {
            setFarmer(null);
            api.get(`/dealer/farmer-profile/${farmerEmail}`)
                .then(res => setFarmer(res.data))
                .catch(err => console.error(err));
        }
    }, [show, farmerEmail]);

    if (!show) return null;
    return (
        <div className="modal" style={{display:'block'}} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <span className="close" onClick={onClose}>&times;</span>
                <h3>Farmer Profile</h3>
                {farmer ? (
                    <div>
                        <p><b>Name:</b> {farmer.firstName} {farmer.lastName}</p>
                        <p><b>Email:</b> {farmer.email}</p>
                        <p><b>Mobile:</b> {farmer.mobile || 'N/A'}</p>
                        <p><b>Location:</b> {farmer.farmLocation || 'N/A'}</p>
                    </div>
                ) : <p>Loading...</p>}
            </div>
        </div>
    );
};

const AssignVehicleModal = ({ show, onClose, onSubmit, vehicles }) => {
    if (!show) return null;
    return (
        <div className="modal" style={{display:'block'}} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <span className="close" onClick={onClose}>&times;</span>
                <h3>Assign Vehicle</h3>
                <form onSubmit={onSubmit}>
                    <label>Select Vehicle</label>
                    <select id="vehicleSelect" required style={{width:'100%', padding:'10px', margin:'10px 0'}}>
                        <option value="">-- Select --</option>
                        {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleType} ({v.vehicleId})</option>)}
                    </select>
                    <label>Tentative Date</label>
                    <input type="date" id="tentativeDate" required style={{width:'100%', padding:'10px', margin:'10px 0'}} />
                    <button className="btn-primary" type="submit" style={{width:'100%'}}>Assign</button>
                </form>
            </div>
        </div>
    );
};

const BidModal = ({ show, onClose, onSubmit, setBidPrice, order }) => {
    if (!show) return null;
    return (
        <div className="modal" style={{display:'block'}} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <span className="close" onClick={onClose}>&times;</span>
                <h3>Place Bid: {order?.varietySpecies}</h3>
                <p>Original Price: ₹{order?.targetPrice}</p>
                <input type="number" onChange={e => setBidPrice(e.target.value)} placeholder="Your Bid Price" required style={{width:'100%', padding:'10px', margin:'10px 0'}} />
                <button className="btn-primary" onClick={onSubmit} style={{width:'100%'}}>Submit Bid</button>
            </div>
        </div>
    );
};

const ViewReviewsModal = ({ show, onClose, product }) => {
    if (!show || !product) return null;
    const reviews = product.retailerReviews || product.reviews || [];

    return (
        <div className="modal" style={{display:'block', zIndex: 3000}} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <span className="close" onClick={onClose}>&times;</span>
                <h3>Reviews for {product.productName || product.varietySpecies}</h3>
                <div style={{maxHeight:'400px', overflowY:'auto', marginTop:'15px'}}>
                    {reviews.length === 0 ? (
                        <p style={{color:'#666', fontStyle:'italic'}}>No reviews available.</p>
                    ) : (
                        reviews.map((review, index) => (
                             <div key={index} style={{marginBottom: '15px', padding: '12px', background: '#f9fafb', borderRadius: '8px', border:'1px solid #eee'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                    <span style={{fontWeight: '600', color: '#10b981', fontSize: '14px'}}>{review.quality}</span>
                                    <span style={{color: '#f59e0b', fontSize: '14px'}}>{'⭐'.repeat(review.rating)}</span>
                                </div>
                                <p style={{margin: '8px 0', fontSize: '14px', color: '#374151', lineHeight:'1.5'}}>{review.comments}</p>
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginTop: '8px'}}>
                                    <span>By: {review.retailerEmail || review.dealerEmail || 'Anonymous'}</span>
                                    <span>{review.date ? new Date(review.date).toLocaleDateString() : 'Recent'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// --- NEW QUALITY REPORT MODAL ---
const QualityReportModal = ({ show, onClose, product }) => {
    if (!show || !product || !product.qualityReport) return null;
    const { grade, pesticidesUsed, storageCondition, harvestCondition, verifiedQuantity, remarks, inspectedBy, inspectedAt } = product.qualityReport;

    const gradeColor = grade === 'A' ? '#10b981' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#f59e0b' : '#ef4444';

    return (
        <div className="modal" style={{display:'block', zIndex: 3000}} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '500px'}}>
                <span className="close" onClick={onClose}>&times;</span>
                <h3 style={{marginBottom: '5px'}}>📋 Quality Report</h3>
                <p style={{color: '#6b7280', fontSize: '0.9rem', marginBottom: '15px'}}>For: {product.varietySpecies}</p>
                
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px', border:'1px solid #e5e7eb', marginTop: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '12px' }}>
                        <div>
                            <span style={{display: 'block', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Assigned Grade</span>
                            <span style={{fontSize: '24px', fontWeight: 'bold', color: gradeColor}}>{grade || 'N/A'}</span>
                        </div>
                        <div style={{textAlign: 'right'}}>
                            <span style={{display: 'block', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Verified Quantity</span>
                            <span style={{fontSize: '18px', fontWeight: '600', color: '#374151'}}>
                                {verifiedQuantity ? `${verifiedQuantity} ${product.unitOfSale}` : 'N/A'}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#4b5563' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                            <strong>Pesticides:</strong> <span>{pesticidesUsed || 'Not specified'}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                            <strong>Storage:</strong> <span>{storageCondition || 'Not specified'}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                            <strong>Harvest:</strong> <span>{harvestCondition || 'Not specified'}</span>
                        </div>
                        {remarks && (
                            <div style={{ marginTop: '5px' }}>
                                <strong>Inspector Remarks:</strong>
                                <p style={{ margin: '5px 0 0 0', padding: '10px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '4px', fontStyle: 'italic', lineHeight: '1.4' }}>
                                    {remarks}
                                </p>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '15px', paddingTop: '10px', fontSize: '12px', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Inspector: {inspectedBy || 'N/A'}</span>
                        <span>Date: {inspectedAt ? new Date(inspectedAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EditProfileModal = ({ show, onClose, profileData, onSave }) => {
    const [formData, setFormData] = useState({});
    const [validationErrors, setValidationErrors] = useState({});

    const errorStyle = { color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' };

    useEffect(() => {
        if (show && profileData) {
            setFormData({
                firstName: profileData.firstName || '',
                lastName: profileData.lastName || '',
                businessName: profileData.businessName || '',
                mobile: profileData.mobile || '',
                gstin: profileData.gstin || '',
                warehouseAddress: profileData.warehouseAddress || '',
                preferredCommodities: profileData.preferredCommodities?.join(', ') || '',
            });
            setValidationErrors({});
        }
    }, [show, profileData]);

    if (!show) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (validationErrors[e.target.name]) {
            setValidationErrors({ ...validationErrors, [e.target.name]: null });
        }
    };

    const validateForm = () => {
        const errors = {};
        let isValid = true;
        const { firstName, lastName, mobile, gstin } = formData;
        
        if (!firstName || firstName.trim().length === 0 || !/^[A-Za-z\s]+$/.test(firstName.trim())) {
            errors.firstName = "First Name is required and must contain only letters.";
            isValid = false;
        }
        if (!lastName || lastName.trim().length === 0 || !/^[A-Za-z\s]+$/.test(lastName.trim())) {
            errors.lastName = "Last Name is required and must contain only letters.";
            isValid = false;
        }
        if (mobile && mobile.length > 0 && !/^\d{10}$/.test(mobile)) {
            errors.mobile = "Mobile number must be exactly 10 digits.";
            isValid = false;
        } else if (!mobile) {
            errors.mobile = "Mobile number is required.";
            isValid = false;
        }
        if (gstin && gstin.length > 0 && !/^[a-zA-Z0-9]{12}$/.test(gstin)) {
            errors.gstin = "GSTIN must be exactly 12 alphanumeric characters (if provided).";
            isValid = false;
        }

        setValidationErrors(errors);
        return isValid;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) {
            alert("Please fix the highlighted errors before saving.");
            return;
        }
        const updatedData = {
            ...formData,
            preferredCommodities: formData.preferredCommodities ? formData.preferredCommodities.split(',').map(s => s.trim()) : [],
        };
        onSave(updatedData);
    };

    return (
        <div className="modal" style={{display:'block', zIndex: 4000}} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '600px'}}>
                <span className="close" onClick={onClose}>&times;</span>
                <h3>✏️ Edit Profile</h3>
                <form className="profile-edit-form" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h3>Personal Details</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="firstName">First Name *</label>
                                <input type="text" id="firstName" name="firstName" value={formData.firstName || ''} onChange={handleChange} required />
                                {validationErrors.firstName && <p style={errorStyle}>{validationErrors.firstName}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastName">Last Name *</label>
                                <input type="text" id="lastName" name="lastName" value={formData.lastName || ''} onChange={handleChange} required />
                                {validationErrors.lastName && <p style={errorStyle}>{validationErrors.lastName}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="mobile">Mobile *</label>
                                <input type="text" id="mobile" name="mobile" value={formData.mobile || ''} onChange={handleChange} required maxLength="10" />
                                {validationErrors.mobile && <p style={errorStyle}>{validationErrors.mobile}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="form-section">
                        <h3>Business Information</h3>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label htmlFor="businessName">Business Name</label>
                                <input type="text" id="businessName" name="businessName" value={formData.businessName || ''} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="gstin">GSTIN</label>
                                <input type="text" id="gstin" name="gstin" value={formData.gstin || ''} onChange={handleChange} maxLength="12" />
                                {validationErrors.gstin && <p style={errorStyle}>{validationErrors.gstin}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="preferredCommodities">Commodities (Comma Separated)</label>
                                <input type="text" id="preferredCommodities" name="preferredCommodities" value={formData.preferredCommodities || ''} onChange={handleChange} placeholder="e.g. Rice, Wheat, Mango" />
                            </div>
                            <div className="form-group full-width">
                                <label htmlFor="warehouseAddress">Warehouse Address</label>
                                <textarea id="warehouseAddress" name="warehouseAddress" value={formData.warehouseAddress || ''} onChange={handleChange} rows="3"></textarea>
                            </div>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-save">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ReceiptModal = ({ show, onClose, order, user }) => {
    if (!show || !order) return null;

    return (
        <div className="modal" style={{display:'block'}} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:'500px'}}>
                <span className="close" onClick={onClose}>&times;</span>
                
                <div className="receipt-paper" id="printable-receipt">
                    <div className="receipt-header">
                        <h2>OFFICIAL RECEIPT</h2>
                        <p><strong>AgroChain Dealer Network</strong></p>
                        <p>{user?.businessName}</p>
                        <p style={{fontSize:'0.8rem'}}>{user?.warehouseAddress}</p>
                        <p style={{fontSize:'0.8rem', marginTop:'5px'}}>GSTIN: {user?.gstin || 'N/A'}</p>
                    </div>

                    <div className="receipt-row">
                        <span><strong>Receipt No:</strong></span>
                        <span>{order.receiptNumber}</span>
                    </div>
                    <div className="receipt-row">
                        <span><strong>Date:</strong></span>
                        <span>{new Date(order.receiptDate || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <div className="receipt-row">
                        <span><strong>Purchased From:</strong></span>
                        <span>{order.farmerName}</span>
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-row" style={{fontWeight:'bold', borderBottom:'1px solid #eee', paddingBottom:'5px'}}>
                        <span>Item</span>
                        <span>Total</span>
                    </div>

                    <div className="receipt-row">
                        <span>
                            {order.varietySpecies} <br/>
                            <small style={{color:'#666'}}>{order.quantity} {order.unitOfSale} x ₹{order.bidPrice}</small>
                        </span>
                        <span>₹{(order.quantity * order.bidPrice).toFixed(2)}</span>
                    </div>

                    <div className="receipt-total receipt-row">
                        <span>TOTAL PAID</span>
                        <span>₹{(order.totalAmount || (order.quantity * order.bidPrice)).toFixed(2)}</span>
                    </div>

                    <div style={{textAlign:'center', marginTop:'20px', fontSize:'0.8rem', fontStyle:'italic', color:'#888'}}>
                        <p>Payment Status: COMPLETED</p>
                        <p>Generated via AgroChain</p>
                    </div>
                </div>

                <button className="btn-primary" style={{width:'100%'}} onClick={() => window.print()}>
                    🖨️ Print Receipt
                </button>
            </div>
        </div>
    );
};

export default DealerDashboard;