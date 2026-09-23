import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { Order } from '../../types';
import { formatPKR, formatDate } from '../../lib/supabase';
import './AccountPages.css';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        const found = await orderService.getOrderByNumber(id);
        setOrder(found);
      } catch (err) {
        console.error('Error fetching order details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 0' }}>
        <div className="skeleton" style={{ height: '300px' }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container empty-state">
        <h3 className="empty-state-title">Order Not Found</h3>
        <p className="empty-state-desc">The requested order number could not be found.</p>
        <Link to="/orders" className="btn btn-primary">Back to Orders</Link>
      </div>
    );
  }

  const steps = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const currentStepIdx = steps.indexOf(order.order_status);

  return (
    <div className="account-page">
      <div className="container order-detail-container">
        <Link to="/orders" className="back-link">
          <ArrowLeft size={16} /> Back to My Orders
        </Link>

        <div className="order-detail-card">
          <div className="order-detail-header">
            <div>
              <span className="order-detail-eyebrow">ORDER SUMMARY</span>
              <h1 className="order-detail-number">{order.order_number}</h1>
              <p className="order-detail-date">Placed on {formatDate(order.created_at)}</p>
            </div>
            <div className="order-detail-status-badge">
              <span className="badge badge-gold">
                {order.order_status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Progress Timeline */}
          {order.order_status !== 'CANCELLED' && order.order_status !== 'RETURNED' && (
            <div className="order-timeline">
              {steps.map((st, idx) => {
                const isPassed = currentStepIdx >= idx;
                return (
                  <div key={st} className={`timeline-step ${isPassed ? 'completed' : ''}`}>
                    <div className="timeline-node">
                      {isPassed ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                    </div>
                    <span className="timeline-label">{st.replace(/_/g, ' ')}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Items Table */}
          <div className="order-items-table">
            <h3>Ensembles in Order</h3>
            {order.items?.map((it, idx) => (
              <div key={idx} className="detail-item-row">
                <img src={it.product_image || '/assets/logo/eba-logo.png'} alt={it.product_name} />
                <div className="detail-item-info">
                  <h4 className="detail-item-name">{it.product_name}</h4>
                  {it.variant_title && (
                    <span className="detail-item-cut">Specification: {it.variant_title}</span>
                  )}
                  <span className="detail-item-price-calc">
                    Qty {it.quantity} × {formatPKR(it.price)}
                  </span>
                </div>
                <div className="detail-item-subtotal">
                  {formatPKR(it.subtotal)}
                </div>
              </div>
            ))}
          </div>

          {/* Financial Breakdown */}
          <div className="order-financial-breakdown">
            <div className="fin-row">
              <span>Subtotal:</span>
              <span>{formatPKR(order.subtotal)}</span>
            </div>
            <div className="fin-row">
              <span>Nationwide Shipping Fee:</span>
              <span>{order.shipping_fee === 0 ? 'COMPLIMENTARY' : formatPKR(order.shipping_fee)}</span>
            </div>
            <div className="fin-row total">
              <span>Total Paid / Payable:</span>
              <span className="fin-total">{formatPKR(order.total_amount)}</span>
            </div>
          </div>

          {/* Shipping & Payment Info */}
          <div className="order-info-columns">
            <div className="info-box">
              <h4>Shipping Destination</h4>
              <p><strong>{order.shipping_address.full_name}</strong></p>
              <p>{order.shipping_address.street_address}</p>
              <p>{order.shipping_address.city}, {order.shipping_address.province}</p>
              <p>Phone: {order.shipping_address.phone}</p>
            </div>

            <div className="info-box">
              <h4>Payment Information</h4>
              <p>
                Method: <strong>{order.payment_method === 'COD' ? 'Cash on Delivery' : 'Bank Transfer / IBFT'}</strong>
              </p>
              <p>Status: <span className="highlight-status">{order.payment_status}</span></p>
              {order.customer_notes && (
                <p className="notes-display">
                  <em>Notes: {order.customer_notes}</em>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
