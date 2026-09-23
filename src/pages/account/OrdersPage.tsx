import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, ArrowRight, Eye, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
import { Order } from '../../types';
import { formatPKR, formatDate } from '../../lib/supabase';
import './AccountPages.css';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const list = await orderService.getCustomerOrders(user.id, user.email);
        setOrders(list);
      } catch (err) {
        console.error('Customer orders load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  if (!user) {
    navigate('/signin');
    return null;
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'badge-success';
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY': return 'badge-info';
      case 'PROCESSING':
      case 'CONFIRMED': return 'badge-gold';
      case 'CANCELLED':
      case 'RETURNED': return 'badge-danger';
      default: return 'badge-warning';
    }
  };

  return (
    <div className="account-page">
      <section className="account-header-banner">
        <div className="container">
          <span className="account-eyebrow">ORDER HISTORY</span>
          <h1 className="account-title">My Orders ({orders.length})</h1>
        </div>
      </section>

      <div className="container account-layout">
        <aside className="account-sidebar">
          <nav className="account-nav-list">
            <Link to="/account" className="account-nav-item">Profile Settings</Link>
            <Link to="/orders" className="account-nav-item active">My Orders</Link>
            <Link to="/wishlist" className="account-nav-item">My Wishlist</Link>
          </nav>
        </aside>

        <main className="account-main">
          {loading ? (
            <div className="skeleton-order-list">
              <div className="skeleton skeleton-order" />
              <div className="skeleton skeleton-order" />
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <Package size={48} className="empty-state-icon" />
              <h3 className="empty-state-title">No Orders Placed Yet</h3>
              <p className="empty-state-desc">When you acquire designer lawn, formals, or shawls, track them here.</p>
              <Link to="/shop" className="btn btn-primary">Start Exploring</Link>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-history-card">
                  <div className="order-card-header">
                    <div>
                      <span className="order-number-title">{order.order_number}</span>
                      <span className="order-date-text">
                        <Calendar size={12} /> Placed on {formatDate(order.created_at)}
                      </span>
                    </div>

                    <div className="order-card-status">
                      <span className={`badge ${getStatusBadgeClass(order.order_status)}`}>
                        {order.order_status.replace(/_/g, ' ')}
                      </span>
                      <span className="order-card-amount">
                        {formatPKR(order.total_amount)}
                      </span>
                    </div>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="order-items-snippet">
                      {order.items.slice(0, 3).map((it, idx) => (
                        <div key={idx} className="snippet-item">
                          <img
                            src={it.product_image || '/assets/logo/eba-logo.png'}
                            alt={it.product_name}
                          />
                          <div>
                            <span className="snippet-name">{it.product_name}</span>
                            <span className="snippet-meta">
                              Qty: {it.quantity} × {formatPKR(it.price)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <span className="more-items-tag">
                          +{order.items.length - 3} more items
                        </span>
                      )}
                    </div>
                  )}

                  <div className="order-card-footer">
                    <span className="order-payment-method">
                      Payment: {order.payment_method === 'COD' ? 'Cash on Delivery' : 'Bank Transfer'} ({order.payment_status})
                    </span>
                    <Link to={`/orders/${order.order_number}`} className="view-order-link">
                      <span>View Full Order Details</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
