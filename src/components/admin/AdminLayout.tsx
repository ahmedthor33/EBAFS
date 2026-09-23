import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Sparkles,
  ShoppingBag,
  Truck,
  CreditCard,
  Users,
  ShieldAlert,
  Settings,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AdminLayout.css';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, role, isAdmin, isOwner, signOut, isLoading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Security Guard: Only permit authorized roles
  if (!isLoading && (!user || !isAdmin)) {
    navigate('/signin', { replace: true, state: { from: location } });
    return null;
  }

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, exact: true },
    { path: '/admin/products', label: 'Products', icon: <Package size={18} /> },
    { path: '/admin/brands', label: 'Brands', icon: <Sparkles size={18} /> },
    { path: '/admin/categories', label: 'Categories', icon: <Layers size={18} /> },
    { path: '/admin/orders', label: 'Orders', icon: <ShoppingBag size={18} /> },
    { path: '/admin/shipping', label: 'Shipping Zones', icon: <Truck size={18} /> },
    { path: '/admin/payments', label: 'Payments', icon: <CreditCard size={18} /> },
    { path: '/admin/customers', label: 'Customers', icon: <Users size={18} /> },
    ...(isOwner ? [{ path: '/admin/admins', label: 'Staff Roles', icon: <ShieldAlert size={18} /> }] : []),
    { path: '/admin/settings', label: 'Store Settings', icon: <Settings size={18} /> },
    { path: '/admin/activity', label: 'Activity Logs', icon: <Activity size={18} /> },
  ];

  return (
    <div className={`admin-app-layout ${collapsed ? 'collapsed' : ''}`}>
      {/* Admin Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Link to="/admin" className="admin-logo-link">
            <span className="admin-badge-icon">⚜</span>
            {!collapsed && (
              <div className="admin-logo-text">
                <span className="admin-brand-main">EBA STUDIO</span>
                <span className="admin-brand-sub">ADMINISTRATION</span>
              </div>
            )}
          </Link>
          <button
            className="sidebar-collapse-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Admin User Chip */}
        <div className="admin-user-chip">
          <div className="admin-avatar">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
          </div>
          {!collapsed && (
            <div className="admin-user-meta">
              <span className="admin-name">{profile?.full_name || user?.email}</span>
              <span className="admin-role-badge">{role || 'ADMIN'}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="admin-nav">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="admin-sidebar-footer">
          <Link to="/" target="_blank" className="admin-foot-link" title="Open Storefront in new tab">
            <Store size={16} />
            {!collapsed && <span>View Storefront</span>}
          </Link>
          <button onClick={signOut} className="admin-foot-link signout" title="Sign Out">
            <LogOut size={16} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main-wrapper">
        <header className="admin-topbar">
          <div className="admin-breadcrumb-wrap">
            <span className="admin-sec-title">EBA Management Portal</span>
          </div>

          <div className="admin-topbar-actions">
            <Link to="/" className="btn-store-preview">
              <Store size={14} />
              <span>Public Store</span>
            </Link>
          </div>
        </header>

        <main className="admin-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
