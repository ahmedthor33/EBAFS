import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, CheckCircle2, Eye, Calendar, User, MapPin, Check } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { adminService } from '../../services/adminService';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { formatPKR, formatDate } from '../../lib/supabase';

export const AdminOrders: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('order') || '');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Order for Modal / Status edit
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newOrderStatus, setNewOrderStatus] = useState<OrderStatus>('PENDING');
  const [newPaymentStatus, setNewPaymentStatus] = useState<PaymentStatus>('PENDING');
  const [internalNotes, setInternalNotes] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const list = await orderService.getAllOrdersAdmin(
        statusFilter === 'ALL' ? undefined : (statusFilter as OrderStatus),
        searchTerm || undefined
      );
      setOrders(list);

      // If URL has order parameter, automatically open it
      const targetParam = searchParams.get('order');
      if (targetParam && list.length > 0) {
        const found = list.find(o => o.order_number === targetParam);
        if (found) {
          openManageModal(found);
        }
      }
    } catch (err) {
      console.error('Error loading orders in admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, searchTerm]);

  const openManageModal = (order: Order) => {
    setSelectedOrder(order);
    setNewOrderStatus(order.order_status);
    setNewPaymentStatus(order.payment_status);
    setInternalNotes(order.internal_notes || '');
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setIsUpdating(true);

    try {
      await orderService.updateOrderStatus(selectedOrder.id, newOrderStatus, internalNotes);
      if (newPaymentStatus !== selectedOrder.payment_status) {
        await orderService.updatePaymentStatus(selectedOrder.id, newPaymentStatus);
      }

      await adminService.logActivity(
        `Updated Order ${selectedOrder.order_number}`,
        'Order',
        selectedOrder.id,
        { orderStatus: newOrderStatus, paymentStatus: newPaymentStatus }
      );

      setActionMsg(`Order ${selectedOrder.order_number} status updated.`);
      setSelectedOrder(null);
      await loadOrders();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      alert(`Error updating order: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const orderStatuses: OrderStatus[] = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-heading">Customer Orders & Fulfillment</h1>
          <p className="admin-page-sub">
            Track order status progression, verify manual bank deposits, and manage shipments.
          </p>
        </div>
      </div>

      {actionMsg && (
        <div className="admin-action-alert success">
          <CheckCircle2 size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="admin-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search order number, customer name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-search-input"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="admin-select"
        >
          <option value="ALL">All Order Statuses</option>
          {orderStatuses.map(st => (
            <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="admin-card-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Placed Date</th>
              <th>Customer</th>
              <th>City / Province</th>
              <th>Total Amount</th>
              <th>Payment</th>
              <th>Order Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>
                  Loading orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((ord) => (
                <tr key={ord.id}>
                  <td className="mono font-bold">{ord.order_number}</td>
                  <td>{formatDate(ord.created_at)}</td>
                  <td>
                    <div className="cust-cell">
                      <span>{ord.customer_name}</span>
                      <small>{ord.customer_phone}</small>
                    </div>
                  </td>
                  <td>{ord.shipping_address.city}, {ord.shipping_address.province}</td>
                  <td className="font-semibold">{formatPKR(ord.total_amount)}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>{ord.payment_method}</span>
                      <small style={{ color: ord.payment_status === 'PAID' ? 'var(--color-success)' : '#E65100' }}>
                        {ord.payment_status}
                      </small>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${ord.order_status === 'DELIVERED' ? 'badge-success' : ord.order_status === 'PENDING' ? 'badge-warning' : 'badge-gold'}`}>
                      {ord.order_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => openManageModal(ord)}
                      className="btn btn-secondary btn-sm"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Manage Order Modal */}
      {selectedOrder && (
        <div className="assistant-modal-backdrop">
          <div className="assistant-modal" style={{ maxWidth: '640px' }}>
            <div className="assistant-header">
              <div>
                <h3>Manage Order: {selectedOrder.order_number}</h3>
                <span className="assistant-subtitle">Placed on {formatDate(selectedOrder.created_at)}</span>
              </div>
              <button className="assistant-close" onClick={() => setSelectedOrder(null)}>×</button>
            </div>

            <form onSubmit={handleUpdateOrder} className="assistant-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Customer & Destination Summary */}
              <div style={{ background: 'var(--color-ivory)', padding: '12px', borderRadius: '4px', fontSize: '12px' }}>
                <p><strong>Customer:</strong> {selectedOrder.customer_name} ({selectedOrder.customer_phone} / {selectedOrder.customer_email})</p>
                <p><strong>Address:</strong> {selectedOrder.shipping_address.street_address}, {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.province}</p>
                <p><strong>Total:</strong> {formatPKR(selectedOrder.total_amount)} ({selectedOrder.payment_method})</p>
                {selectedOrder.customer_notes && (
                  <p style={{ marginTop: '4px', color: '#666' }}><em>Note: {selectedOrder.customer_notes}</em></p>
                )}
              </div>

              {/* Status Selectors */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Order Fulfillment Status</label>
                  <select
                    value={newOrderStatus}
                    onChange={(e) => setNewOrderStatus(e.target.value as any)}
                    className="form-select"
                  >
                    {orderStatuses.map(st => (
                      <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Verification Status</label>
                  <select
                    value={newPaymentStatus}
                    onChange={(e) => setNewPaymentStatus(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PAID">PAID (Verified IBFT / COD Settled)</option>
                    <option value="FAILED">FAILED</option>
                    <option value="REFUNDED">REFUNDED</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Internal Administrative Notes / Courier Waybill Tracking</label>
                <textarea
                  rows={3}
                  placeholder="e.g. TCS Tracking # 123456789 dispatched on 23rd Sep..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedOrder(null)}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Update Order Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
