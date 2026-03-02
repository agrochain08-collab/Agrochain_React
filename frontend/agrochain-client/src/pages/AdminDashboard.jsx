import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import '../assets/css/admin.css';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
} from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
);

// ---------- Admin Navbar ----------
const AdminNavbar = ({ onSignout, onNavigate, activeSection }) => {
  const tabClass = (tab) =>
    `nav-btn ${activeSection === tab ? 'active' : ''}`;

  return (
    <nav className="navbar">
      <div className="nav-left">
        <img
          src="https://ik.imagekit.io/a2wpi1kd9/imgToUrl/image-to-url_ThyEiMVLh"
          className="logo"
          alt="AgroChain Logo"
        />
        <span className="brand-name">
          Agro<span className="chain-text">Chain</span>
        </span>
      </div>

      <div className="nav-center">
        <button
          id="analyticsTab"
          className={tabClass('analytics')}
          onClick={() => onNavigate('analytics')}
        >
          📊 System Analytics
        </button>
        <button
          id="coreTab"
          className={tabClass('core')}
          onClick={() => onNavigate('core')}
        >
          ⚙️ User Management
        </button>
        <button
          id="productsTab"
          className={tabClass('products')}
          onClick={() => onNavigate('products')}
        >
          🧺 Products
        </button>
        <button
          id="activityTab"
          className={tabClass('activity')}
          onClick={() => onNavigate('activity')}
        >
          📜 Activity Logs
        </button>
        <button
          id="representativesTab"
          className={tabClass('representatives')}
          onClick={() => onNavigate('representatives')}
        >
          🧑‍💼 Representatives
        </button>
      </div>

      <div className="nav-right">
        <span className="admin-badge">👤 Admin</span>
        <button
          id="signoutBtn"
          className="logout-btn"
          onClick={onSignout}
        >
          🚪 Sign Out
        </button>
      </div>
    </nav>
  );
};

// ---------- Admin Dashboard ----------
const AdminDashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('analytics');

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  // products for moderation
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Representatives state
  const [representatives, setRepresentatives] = useState([]);
  const [repEmail, setRepEmail] = useState('');
  const [repNote, setRepNote] = useState('');
  const [repLoading, setRepLoading] = useState(false);
  const [repStatus, setRepStatus] = useState({ msg: '', type: '' });

  // User filters
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Log filters
  const [logUserFilter, setLogUserFilter] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('all');
  const [logDateFilter, setLogDateFilter] = useState('');

  // Product filters
  const [productSearch, setProductSearch] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState('all');

  // ---------- Data loading ----------
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, logsRes, productsRes, repsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/logs'),
        api.get('/admin/products'),
        api.get('/admin/representatives'),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setLogs(logsRes.data);
      setProducts(productsRes.data);
      setRepresentatives(repsRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError(err.response?.data?.msg || err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // ---------- Handlers ----------
  const handleSignout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
      navigate('/login');
    }
  };

  const handleNavigate = (section) => {
    setActiveSection(section);
  };

  // User management actions
  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`Delete user ${email}? This cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete user');
    }
  };

  const handleToggleUserActive = async (userId) => {
    try {
      const res = await api.put(`/admin/deactivate/${userId}`);
      const { isActive } = res.data;
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, isActive } : u
        )
      );
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to update user status');
    }
  };

  // Product moderation
  const handleDeleteProduct = async (product) => {
    const confirmation = window.confirm(
      `Delete "${product.varietySpecies}" for farmer ${product.farmer.email}? This will remove the product from the database.`
    );
    if (!confirmation) return;

    try {
      await api.delete(
        `/admin/products/${product.farmer.email}/${product.cropId}`
      );
      setProducts((prev) =>
        prev.filter((p) => p.cropId !== product.cropId)
      );
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert(err.response?.data?.msg || 'Failed to delete product');
    }
  };

  // Representative management
  const handleAddRepresentative = async () => {
    if (!repEmail.trim()) return;
    setRepLoading(true);
    setRepStatus({ msg: '', type: '' });
    try {
      const res = await api.post('/admin/representatives', { email: repEmail.trim(), note: repNote.trim() });
      setRepresentatives((prev) => [res.data.representative, ...prev]);
      setRepEmail('');
      setRepNote('');
      setRepStatus({ msg: '✅ Representative added successfully!', type: 'success' });
    } catch (err) {
      setRepStatus({ msg: err.response?.data?.msg || 'Failed to add representative', type: 'error' });
    }
    setRepLoading(false);
  };

  const handleDeleteRepresentative = async (repId, email) => {
    if (!window.confirm(`Remove ${email} as a representative? They will no longer be redirected to the representative dashboard.`)) return;
    try {
      await api.delete(`/admin/representatives/${repId}`);
      setRepresentatives((prev) => prev.filter((r) => r._id !== repId));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to remove representative');
    }
  };

  const handleRefresh = () => {
    loadAllData();
  };

  // ---------- Derived data ----------
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !userSearch ||
        u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole =
        roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, roleFilter]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesUser =
        !logUserFilter ||
        log.userEmail
          ?.toLowerCase()
          .includes(logUserFilter.toLowerCase());
      const matchesAction =
        logActionFilter === 'all' ||
        log.actionType === logActionFilter;
      const matchesDate =
        !logDateFilter ||
        new Date(log.timestamp).toISOString().slice(0, 10) ===
          logDateFilter;
      return matchesUser && matchesAction && matchesDate;
    });
  }, [logs, logUserFilter, logActionFilter, logDateFilter]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const term = productSearch.toLowerCase();
      const matchesSearch =
        !term ||
        p.varietySpecies?.toLowerCase().includes(term) ||
        p.productType?.toLowerCase().includes(term) ||
        p.farmer?.email?.toLowerCase().includes(term);
      const matchesType =
        productTypeFilter === 'all' ||
        p.productType === productTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [products, productSearch, productTypeFilter]);

  // ---------- Chart data ----------
  const userDistData = stats
    ? {
        labels: ['Farmers', 'Dealers', 'Retailers'],
        datasets: [
          {
            data: [stats.farmers, stats.dealers, stats.retailers],
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
          },
        ],
      }
    : { labels: [], datasets: [] };

  // Monthly revenue chart (from stats.monthlyRevenue)
  const revenueData = stats
    ? {
        labels: stats.monthlyRevenue.map((m) => m.month),
        datasets: [
          {
            label: 'Monthly Revenue',
            data: stats.monthlyRevenue.map((m) => m.revenue),
            backgroundColor: '#06b6d4',
          },
        ],
      }
    : { labels: [], datasets: [] };

  // Orders by status bar chart
  const ordersTrendData = stats
    ? {
        labels: stats.ordersByStatus.map((s) => s.name),
        datasets: [
          {
            label: 'Orders by Status',
            data: stats.ordersByStatus.map((s) => s.count),
            backgroundColor: '#8b5cf6',
          },
        ],
      }
    : { labels: [], datasets: [] };

  // Top products list
  const topProducts = stats?.topProducts || [];

  return (
    <>
      <AdminNavbar
        onSignout={handleSignout}
        onNavigate={handleNavigate}
        activeSection={activeSection}
      />

      <main className="main-container">
        {loading && <p className="loading-text">Loading dashboard...</p>}
        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

        {/* ---------------- Analytics Section ---------------- */}
        <section
          id="analyticsSection"
          className={activeSection === 'analytics' ? 'section active' : 'section'}
        >
          <h2>📊 System Analytics &amp; Insights</h2>

          {stats && (
            <>
              <div className="stats-grid" id="statsGrid">
                <div className="stat-card stat-farmers">
                  <div className="stat-content">
                    <h3>Farmers</h3>
                    <p className="stat-number" id="farmerCount">
                      {stats.farmers}
                    </p>
                  </div>
                </div>
                <div className="stat-card stat-dealers">
                  <div className="stat-content">
                    <h3>Dealers</h3>
                    <p className="stat-number" id="dealerCount">
                      {stats.dealers}
                    </p>
                  </div>
                </div>
                <div className="stat-card stat-retailers">
                  <div className="stat-content">
                    <h3>Retailers</h3>
                    <p className="stat-number" id="retailerCount">
                      {stats.retailers}
                    </p>
                  </div>
                </div>
                <div className="stat-card stat-products">
                  <div className="stat-content">
                    <h3>Total Products</h3>
                    <p className="stat-number" id="productCount">
                      {stats.products}
                    </p>
                  </div>
                </div>
                <div className="stat-card stat-orders">
                  <div className="stat-content">
                    <h3>Total Orders</h3>
                    <p className="stat-number" id="orderCount">
                      {stats.orders}
                    </p>
                  </div>
                </div>
                <div className="stat-card stat-revenue">
                  <div className="stat-content">
                    <h3>Total Revenue</h3>
                    <p className="stat-number" id="totalAmount">
                      ₹{stats.totalAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="charts-container">
                <div className="chart-card">
                  <h3>📈 User Distribution</h3>
                  <Pie data={userDistData} />
                </div>
                <div className="chart-card">
                  <h3>📊 Orders by Status</h3>
                  <Bar data={ordersTrendData} />
                </div>
                <div className="chart-card full-width">
                  <h3>💹 Revenue Analytics (Last 6 Months)</h3>
                  <Bar data={revenueData} />
                </div>
              </div>

              <div className="detailed-analytics">
                <div className="analytics-card">
                  <h3>Platform Performance</h3>
                  <div className="performance-metrics">
                    <div className="metric-item">
                      <span className="metric-label">Active Users</span>
                      <span className="metric-value success">
                        {stats.activeUsers}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Pending Orders</span>
                      <span className="metric-value warning">
                        {stats.pendingOrders}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Completed Orders</span>
                      <span className="metric-value success">
                        {stats.completedOrders}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>Top Product Categories</h3>
                  <div className="top-products-list">
                    {topProducts.length === 0 && (
                      <p>No product analytics available.</p>
                    )}
                    {topProducts.map((p) => (
                      <div key={p.name} className="product-item">
                        <span className="product-name">{p.name}</span>
                        <span className="product-count">
                          {p.count} listings
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ---------------- User Management Section ---------------- */}
        <section
          id="coreSection"
          className={activeSection === 'core' ? 'section active' : 'section'}
        >
          <h2>⚙️ User Management &amp; Control</h2>

          <div className="filter-bar">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="farmer">Farmers</option>
              <option value="dealer">Dealers</option>
              <option value="retailer">Retailers</option>
            </select>
            <button className="refresh-btn" onClick={handleRefresh}>
              🔄 Refresh
            </button>
          </div>

          <div id="usersTableContainer" className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>
                      No users found.
                    </td>
                  </tr>
                )}
                {filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <strong>
                        {u.firstName} {u.lastName || ''}
                      </strong>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span
                        className={`role-badge role-${u.role || 'other'}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          u.isActive === false
                            ? 'status-inactive'
                            : 'status-active'
                        }`}
                      >
                        {u.isActive === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="action-btn deactivate"
                        onClick={() => handleToggleUserActive(u._id)}
                      >
                        {u.isActive === false ? 'Activate' : 'Deactivate'}
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() =>
                          handleDeleteUser(u._id, u.email)
                        }
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------------- Products Moderation Section ---------------- */}
        <section
          id="productsSection"
          className={activeSection === 'products' ? 'section active' : 'section'}
        >
          <h2>🧺 All Farmer Products</h2>

          <div className="filter-bar">
            <input
              type="text"
              placeholder="Search by product or farmer email..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <select
              value={productTypeFilter}
              onChange={(e) => setProductTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="Grain">Grain</option>
              <option value="Vegetable">Vegetable</option>
              <option value="Fruit">Fruit</option>
              <option value="Pulse">Pulse</option>
              <option value="Spice">Spice</option>
            </select>
            <button className="refresh-btn" onClick={handleRefresh}>
              🔄 Refresh
            </button>
          </div>

          <div className="admin-products-grid">
            {filteredProducts.length === 0 && (
              <p>No products found for the selected filters.</p>
            )}

            {filteredProducts.map((product) => (
              <div
                key={product.cropId}
                className="admin-product-card"
              >
                <div className="admin-product-main">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.varietySpecies}
                      className="admin-product-image"
                    />
                  )}
                  <div className="admin-product-info">
                    <h3>{product.varietySpecies}</h3>
                    <span className="badge">{product.productType}</span>
                    <p>
                      <strong>Quantity:</strong>{' '}
                      {product.harvestQuantity} {product.unitOfSale}
                    </p>
                    <p>
                      <strong>Price:</strong> ₹{product.targetPrice} per{' '}
                      {product.unitOfSale}
                    </p>
                  </div>
                </div>

                <div className="admin-product-farmer">
                  <h4>Farmer Details</h4>
                  <p>
                    <strong>Name:</strong> {product.farmer.name}
                  </p>
                  <p>
                    <strong>Email:</strong> {product.farmer.email}
                  </p>
                  <p>
                    <strong>Mobile:</strong> {product.farmer.mobile}
                  </p>
                </div>

                <div className="admin-product-actions">
                  <button
                    className="danger-btn"
                    onClick={() => handleDeleteProduct(product)}
                  >
                    🗑️ Delete Product from DB
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- Activity Logs Section ---------------- */}
        <section
          id="activitySection"
          className={activeSection === 'activity' ? 'section active' : 'section'}
        >
          <h2>📜 User Activity Logs</h2>

          <div className="filter-bar">
            <input
              type="text"
              placeholder="Filter by user email..."
              value={logUserFilter}
              onChange={(e) => setLogUserFilter(e.target.value)}
            />
            <select
              value={logActionFilter}
              onChange={(e) => setLogActionFilter(e.target.value)}
            >
              <option value="all">All Actions</option>
              <option value="login">Login</option>
              <option value="addProduct">Add Product</option>
              <option value="orderPlaced">Order Placed</option>
              <option value="updateProfile">Update Profile</option>
              <option value="deleteUser">Delete User</option>
              <option value="other">Other</option>
            </select>
            <input
              type="date"
              value={logDateFilter}
              onChange={(e) => setLogDateFilter(e.target.value)}
            />
          </div>

          <div id="logsTableContainer" className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User Email</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center' }}>
                      No logs found.
                    </td>
                  </tr>
                )}
                {filteredLogs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <strong>{log.userEmail}</strong>
                    </td>
                    <td>
                      <span
                        className={`log-action log-${log.actionType}`}
                      >
                        {log.actionType}
                      </span>
                    </td>
                    <td>{log.details}</td>
                    <td>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {/* ---------------- Representatives Section ---------------- */}
        <section
          id="representativesSection"
          className={activeSection === 'representatives' ? 'section active' : 'section'}
        >
          <h2>🧑‍💼 Representative Access Management</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            Add email addresses here to grant representative access. When a user logs in with one of these emails, they will be automatically redirected to the Representative Dashboard regardless of their registered role.
          </p>

          {/* Add new representative */}
          <div className="analytics-card" style={{ marginBottom: '28px' }}>
            <h3 style={{ marginBottom: '16px' }}>➕ Add Representative Email</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 240px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Email Address *</label>
                <input
                  type="email"
                  placeholder="representative@example.com"
                  value={repEmail}
                  onChange={(e) => setRepEmail(e.target.value)}
                  disabled={repLoading}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRepresentative()}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 200px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Field representative – North Zone"
                  value={repNote}
                  onChange={(e) => setRepNote(e.target.value)}
                  disabled={repLoading}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRepresentative()}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={handleAddRepresentative}
                disabled={repLoading || !repEmail.trim()}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  background: repLoading || !repEmail.trim() ? '#9ca3af' : '#10b981',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: repLoading || !repEmail.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  height: '42px',
                  alignSelf: 'flex-end',
                }}
              >
                {repLoading ? 'Adding...' : '➕ Add Representative'}
              </button>
            </div>

            {repStatus.msg && (
              <div style={{
                marginTop: '14px',
                padding: '10px 16px',
                borderRadius: '8px',
                background: repStatus.type === 'success' ? '#d1fae5' : '#fee2e2',
                color: repStatus.type === 'success' ? '#065f46' : '#991b1b',
                fontSize: '14px',
                fontWeight: 500,
              }}>
                {repStatus.msg}
              </div>
            )}
          </div>

          {/* Representatives table */}
          <div className="analytics-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>Authorized Representatives ({representatives.length})</h3>
              <button className="refresh-btn" onClick={handleRefresh}>🔄 Refresh</button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Email</th>
                    <th>Note</th>
                    <th>Added By</th>
                    <th>Date Added</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {representatives.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: '#6b7280', padding: '32px' }}>
                        No representatives added yet. Use the form above to add one.
                      </td>
                    </tr>
                  )}
                  {representatives.map((rep, idx) => (
                    <tr key={rep._id}>
                      <td style={{ color: '#9ca3af' }}>{idx + 1}</td>
                      <td>
                        <strong>{rep.email}</strong>
                      </td>
                      <td style={{ color: '#6b7280', fontStyle: rep.note ? 'normal' : 'italic' }}>
                        {rep.note || '—'}
                      </td>
                      <td>{rep.addedBy}</td>
                      <td>{new Date(rep.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteRepresentative(rep._id, rep.email)}
                        >
                          🗑️ Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{
            marginTop: '20px',
            padding: '14px 18px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            fontSize: '13px',
            color: '#1e40af',
          }}>
            <strong>ℹ️ How it works:</strong> When a user whose email is listed here logs in (via Google or OTP), the login page automatically checks this list and redirects them to <code>/representative</code> instead of their normal role dashboard. Removing an email immediately revokes representative redirect access on their next login.
          </div>
        </section>

      </main>
    </>
  );
};

export default AdminDashboard;