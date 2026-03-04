import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import '../assets/css/admin.css';
import { useNavigate } from 'react-router-dom';

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
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null); 

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [representatives, setRepresentatives] = useState([]);
  const [repEmail, setRepEmail] = useState('');
  const [repNote, setRepNote] = useState('');
  const [repLoading, setRepLoading] = useState(false);
  const [repStatus, setRepStatus] = useState({ msg: '', type: '' });

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [logUserFilter, setLogUserFilter] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('all');
  const [logDateFilter, setLogDateFilter] = useState('');

  // ---------- Dynamic Data Fetching with Polling ----------
  const loadAllData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [usersRes, logsRes, repsRes, statsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/logs'),
        api.get('/admin/representatives'),
        api.get('/admin/stats'), 
      ]);

      setUsers(usersRes.data);
      setLogs(logsRes.data);
      setRepresentatives(repsRes.data);
      setStats(statsRes.data); 
      setError(null);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      if (showLoading) {
        setError(err.response?.data?.msg || err.message || 'Failed to load data');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData(true); 

    const intervalId = setInterval(() => {
      loadAllData(false); // Background update every 10 seconds
    }, 10000);

    return () => clearInterval(intervalId);
  }, [loadAllData]);

  const handleSignout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
      navigate('/login');
    }
  };

  const handleNavigate = (section) => {
    setActiveSection(section);
  };

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
    if (!window.confirm(`Remove ${email} as a representative?`)) return;
    try {
      await api.delete(`/admin/representatives/${repId}`);
      setRepresentatives((prev) => prev.filter((r) => r._id !== repId));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to remove representative');
    }
  };

  const handleRefresh = () => {
    loadAllData(true);
  };

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


  return (
    <>
      <AdminNavbar
        onSignout={handleSignout}
        onNavigate={handleNavigate}
        activeSection={activeSection}
      />

      <main className="main-container" style={{ display: 'block' }}>
        {loading && <p className="loading-text">Synchronizing data...</p>}
        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

        {/* ---------------- Dedicated Dynamic Analytics Section ---------------- */}
        {activeSection === 'analytics' && stats && (
          <div className="admin-analytics-container" style={{ width: '100%', marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
               <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>📊 Live Platform Performance</h2>
               <button className="refresh-btn" onClick={() => loadAllData(true)}>🔄 Refresh Stats</button>
            </div>

            {/* ---- Core Platform Stats ---- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', width: '100%' }}>
              <div className="analytics-card" style={{ borderTop: '4px solid #10b981', padding: '25px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' }}>Platform Revenue</p>
                <h1 style={{ margin: '0', color: '#065f46', fontSize: '32px' }}>₹{(stats.totalAmount || 0).toLocaleString('en-IN')}</h1>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>Total transaction value</p>
              </div>

              <div className="analytics-card" style={{ borderTop: '4px solid #3b82f6', padding: '25px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' }}>Order Volume</p>
                <h1 style={{ margin: '0', color: '#1e40af', fontSize: '32px' }}>{stats.orders || 0}</h1>
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                   <span style={{color: '#059669'}}>✓ {stats.completedOrders || 0} Completed</span>
                   <span style={{color: '#d97706'}}>⏳ {stats.pendingOrders || 0} Active</span>
                </div>
              </div>

              <div className="analytics-card" style={{ borderTop: '4px solid #f59e0b', padding: '25px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' }}>User Ecosystem</p>
                <h1 style={{ margin: '0', color: '#b45309', fontSize: '32px' }}>{stats.activeUsers || 0}</h1>
                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', fontSize: '11px', textAlign: 'center' }}>
                   <div style={{background: '#fef3c7', padding: '4px', borderRadius: '4px'}}>🌾 {stats.farmers || 0}</div>
                   <div style={{background: '#dbeafe', padding: '4px', borderRadius: '4px'}}>🏢 {stats.dealers || 0}</div>
                   <div style={{background: '#d1fae5', padding: '4px', borderRadius: '4px'}}>🏪 {stats.retailers || 0}</div>
                </div>
              </div>

              <div className="analytics-card" style={{ borderTop: '4px solid #8b5cf6', padding: '25px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' }}>Market Listings</p>
                <h1 style={{ margin: '0', color: '#5b21b6', fontSize: '32px' }}>{stats.products || 0}</h1>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>Verified products live</p>
              </div>
            </div>

            {/* ---- Financial & Order Insights ---- */}
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ color: '#1e293b', fontWeight: '700', marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💰 Financial &amp; Order Insights
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>

                <div className="analytics-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #10b981' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '22px' }}>📈</span>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Avg Order Value</p>
                  </div>
                  <h2 style={{ margin: 0, color: '#065f46', fontSize: '26px' }}>₹{(stats.avgOrderValue || 0).toLocaleString('en-IN')}</h2>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>Per transaction average</p>
                </div>

                <div className="analytics-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '22px' }}>🤝</span>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Bid Acceptance Rate</p>
                  </div>
                  <h2 style={{ margin: 0, color: '#1e40af', fontSize: '26px' }}>{stats.bidAcceptanceRate || 0}%</h2>
                  <div style={{ marginTop: '8px', background: '#e2e8f0', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: stats.bidAcceptanceRate + '%', background: '#3b82f6', height: '100%', borderRadius: '99px' }} />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>✅ {stats.bidAccepted || 0} accepted · ❌ {stats.bidRejected || 0} rejected</p>
                </div>

                <div className="analytics-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '22px' }}>⏳</span>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Pending Payment</p>
                  </div>
                  <h2 style={{ margin: 0, color: '#b45309', fontSize: '26px' }}>₹{(stats.paymentPendingValue || 0).toLocaleString('en-IN')}</h2>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>Awaiting payment clearance</p>
                </div>

                <div className="analytics-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #06b6d4' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '22px' }}>🚚</span>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>In Transit</p>
                  </div>
                  <h2 style={{ margin: 0, color: '#0e7490', fontSize: '26px' }}>{stats.inTransitOrders || 0}</h2>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>Active deliveries right now</p>
                </div>

                <div className="analytics-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '22px' }}>🚫</span>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Cancellation Rate</p>
                  </div>
                  <h2 style={{ margin: 0, color: '#b91c1c', fontSize: '26px' }}>{stats.cancelledRate || 0}%</h2>
                  <div style={{ marginTop: '8px', background: '#e2e8f0', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: stats.cancelledRate + '%', background: '#ef4444', height: '100%', borderRadius: '99px' }} />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>{stats.cancelledOrders || 0} cancelled orders total</p>
                </div>

              </div>
            </div>

            {/* ---- User Growth & Health ---- */}
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ color: '#1e293b', fontWeight: '700', marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                👥 User Growth &amp; Health
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>

                <div className="analytics-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #10b981' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '22px' }}>🌱</span>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>New Today</p>
                  </div>
                  <h2 style={{ margin: 0, color: '#065f46', fontSize: '26px' }}>{stats.newUsersToday || 0}</h2>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>Registrations in last 24 hrs</p>
                </div>

                <div className="analytics-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '22px' }}>📅</span>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>New This Week</p>
                  </div>
                  <h2 style={{ margin: 0, color: '#5b21b6', fontSize: '26px' }}>{stats.newUsersThisWeek || 0}</h2>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>Registrations in last 7 days</p>
                </div>

                <div className="analytics-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #f97316' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '22px' }}>🔒</span>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Deactivated</p>
                  </div>
                  <h2 style={{ margin: 0, color: '#c2410c', fontSize: '26px' }}>{stats.inactiveUsers || 0}</h2>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>Accounts currently suspended</p>
                </div>

                <div className="analytics-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '22px' }}>✉️</span>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Email Verified</p>
                  </div>
                  <h2 style={{ margin: 0, color: '#1e40af', fontSize: '26px' }}>{stats.emailVerificationRate || 0}%</h2>
                  <div style={{ marginTop: '8px', background: '#e2e8f0', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: stats.emailVerificationRate + '%', background: '#3b82f6', height: '100%', borderRadius: '99px' }} />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>{stats.verifiedEmailUsers || 0} of {stats.totalUsers || 0} users verified</p>
                </div>

                <div className="analytics-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '22px' }}>🔑</span>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Google Sign-In</p>
                  </div>
                  <h2 style={{ margin: 0, color: '#b45309', fontSize: '26px' }}>{stats.googleAuthUsers || 0}</h2>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>Users via Google OAuth</p>
                </div>

              </div>
            </div>

            {/* ---- Top Products ---- */}
            <div className="analytics-card" style={{ marginTop: '25px', padding: '25px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginBottom: '20px', color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>🌾 Top Trending Product Categories</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                {(stats.topProducts || []).length === 0 && (
                  <p style={{ color: '#94a3b8', fontSize: '14px' }}>No product data available yet.</p>
                )}
                {(stats.topProducts || []).map((p, idx) => (
                  <div key={idx} style={{
                    background: '#f8fafc',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ fontWeight: '600', color: '#334155' }}>{p.name}</span>
                    <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- User Management Section ---------------- */}
        <section
          id="coreSection"
          className={activeSection === 'core' ? 'section active' : 'section'}
          style={{ width: '100%' }}
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

        {/* ---------------- Activity Logs Section ---------------- */}
        <section
          id="activitySection"
          className={activeSection === 'activity' ? 'section active' : 'section'}
          style={{ width: '100%' }}
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
          style={{ width: '100%' }}
        >
          <h2>🧑‍💼 Representative Access Management</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            Add email addresses here to grant representative access.
          </p>

          <div className="analytics-card" style={{ marginBottom: '28px', padding: '25px', background: '#fff', borderRadius: '12px' }}>
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

          <div className="analytics-card" style={{ padding: '25px', background: '#fff', borderRadius: '12px' }}>
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
                        No representatives added yet.
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
        </section>

      </main>
    </>
  );
};

export default AdminDashboard;