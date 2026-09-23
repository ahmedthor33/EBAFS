import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Package,
  AlertTriangle,
  Users,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { adminService, DashboardMetrics } from '../../services/adminService';
import { orderService } from '../../services/orderService';
import { productService } from '../../services/productService';
import { Order, Product } from '../../types';
import { formatPKR, formatDate } from '../../lib/supabase';
import './AdminDashboard.css';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [dashMetrics, allOrders, topProducts] = await Promise.all([
          adminService.getDashboardMetrics(),
          orderService.getAllOrdersAdmin(),
          productService.getBestsellers(5),
        ]);

        setMetrics(dashMetrics);
        setRecentOrders(allOrders.slice(0, 6));
        setBestSellers(topProducts);
      } catch (err) {
        console.error('Admin dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="admin-loading-view">
        <div className="skeleton" style={{ height: '140px', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '300px' }} />
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-heading">Executive Dashboard</h1>
          <p className="admin-page-sub">Performance metrics, order throughput, and inventory status.</p>
        </div>

        <div className="header-actions">
          <Link to="/admin/products/new" className="btn btn-primary btn-sm">
            + Add New Product
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="admin-kpi-grid">
        <div className="kpi-card revenue-card">
          <div className="kpi-icon-wrap gold">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">TOTAL STORE REVENUE</span>
            <span className="kpi-value highlight">{formatPKR(metrics.totalSales)}</span>
            <span className="kpi-note">Paid & Delivered orders</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap">
            <ShoppingBag size={22} />
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">TOTAL ORDERS</span>
            <span className="kpi-value">{metrics.totalOrders}</span>
            <span className="kpi-note">{metrics.deliveredOrders} Delivered</span>
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-icon-wrap warning">
            <Clock size={22} />
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">PENDING DISPATCH</span>
            <span className="kpi-value">{metrics.pendingOrders}</span>
            <span className="kpi-note">Awaiting fulfillment</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap">
            <Package size={22} />
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">PRODUCT CATALOG</span>
            <span className="kpi-value">{metrics.totalProducts}</span>
            <span className="kpi-note">Across {metrics.activeBrands} Designer Brands</span>
          </div>
        </div>
      </div>

      {/* Secondary KPI Bar */}
      <div className="admin-secondary-bar">
        <div className="sec-kpi-item">
          <span className="sec-label">Active Designer Brands:</span>
          <strong>{metrics.activeBrands}</strong>
        </div>
        <div className="sec-kpi-item">
          <span className="sec-label">Registered / Ordering Customers:</span>
          <strong>{metrics.totalCustomers}</strong>
        </div>
        <div className={`sec-kpi-item ${metrics.lowStockProducts > 0 ? 'alert' : ''}`}>
          <AlertTriangle size={15} />
          <span className="sec-label">Low Stock Inventory Alerts:</span>
          <strong>{metrics.lowStockProducts} Ensembles</strong>
        </div>
      </div>

      {/* Bottom Grid: Recent Orders & Best Sellers */}
      <div className="admin-dashboard-split">
        {/* Recent Orders Table */}
        <div className="admin-panel-card">
          <div className="panel-card-header">
            <h3>Recent Customer Orders</h3>
            <Link to="/admin/orders" className="panel-view-all">
              Manage All Orders <ArrowRight size={13} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="no-data-msg">No customer orders recorded yet.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Destination</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((ord) => (
                    <tr key={ord.id}>
                      <td className="mono font-bold">{ord.order_number}</td>
                      <td>
                        <div className="cust-cell">
                          <span>{ord.customer_name}</span>
                          <small>{ord.customer_phone}</small>
                        </div>
                      </td>
                      <td>{ord.shipping_address.city}</td>
                      <td className="font-semibold">{formatPKR(ord.total_amount)}</td>
                      <td>
                        <span className={`badge ${ord.order_status === 'DELIVERED' ? 'badge-success' : ord.order_status === 'PENDING' ? 'badge-warning' : 'badge-gold'}`}>
                          {ord.order_status}
                        </span>
                      </td>
                      <td>
                        <Link to={`/admin/orders?order=${ord.order_number}`} className="table-action-link">
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Best Sellers Showcase */}
        <div className="admin-panel-card bestsellers-panel">
          <div className="panel-card-header">
            <h3>Top Performing Ensembles</h3>
            <Link to="/admin/products" className="panel-view-all">
              View Catalog
            </Link>
          </div>

          <div className="bestsellers-list">
            {bestSellers.map((prod) => (
              <div key={prod.id} className="admin-bestseller-item">
                <img
                  src={prod.images?.find(i => i.is_primary)?.url || prod.images?.[0]?.url || (prod as any).image_url || '/assets/logo/eba-logo.png'}
                  alt={prod.name}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('eba-logo.png')) {
                      target.src = '/assets/logo/eba-logo.png';
                    }
                  }}
                />
                <div className="item-meta">
                  <span className="item-brand-tag">{prod.brand?.name}</span>
                  <h4 className="item-prod-name">{prod.name}</h4>
                  <div className="item-price-stock">
                    <span className="price-tag">{formatPKR(prod.sale_price ?? prod.price)}</span>
                    <span className={`stock-tag ${prod.stock_quantity <= prod.low_stock_threshold ? 'low' : ''}`}>
                      Stock: {prod.stock_quantity}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
