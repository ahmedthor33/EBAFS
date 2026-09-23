import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  Users,
  Percent,
  Coins,
  Search,
  X,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react';
import { couponService } from '../../services/couponService';
import { adminService } from '../../services/adminService';
import { Coupon } from '../../types';
import './AdminBrands.css';

export const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAudience, setFilterAudience] = useState<'ALL' | 'NEW_CUSTOMERS' | 'ACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrderAmount, setMinOrderAmount] = useState<string>('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('');
  const [forNewCustomersOnly, setForNewCustomersOnly] = useState<boolean>(true);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const list = await couponService.getAllCoupons();
      setCoupons(list);
    } catch (err) {
      console.error('Error fetching coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const showNotification = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4500);
  };

  const handleCopyCode = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(couponCode);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDescription('');
    setDiscountType('PERCENTAGE');
    setDiscountValue(10);
    setMinOrderAmount('3000');
    setMaxDiscountAmount('');
    setForNewCustomersOnly(true);
    setExpiryDate('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setDescription(coupon.description || '');
    setDiscountType(coupon.discount_type);
    setDiscountValue(coupon.discount_value);
    setMinOrderAmount(coupon.min_order_amount ? String(coupon.min_order_amount) : '');
    setMaxDiscountAmount(coupon.max_discount_amount ? String(coupon.max_discount_amount) : '');
    setForNewCustomersOnly(Boolean(coupon.for_new_customers_only));
    setExpiryDate(coupon.expiry_date ? coupon.expiry_date.split('T')[0] : '');
    setIsActive(coupon.is_active);
    setIsModalOpen(true);
  };

  const handleGenerateCode = () => {
    const prefixes = ['WELCOME', 'EBA', 'LUXE', 'FESTIVE', 'ROYAL', 'VIP'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    setCode(`${prefix}${num}`);
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    const newStatus = !coupon.is_active;
    await couponService.updateCoupon(coupon.id, { is_active: newStatus });
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: newStatus } : c));
    showNotification(`Coupon "${coupon.code}" marked as ${newStatus ? 'Active' : 'Inactive'}.`);
  };

  const handleDelete = async (id: string, couponCode: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete coupon "${couponCode}"?`)) return;
    await couponService.deleteCoupon(id);
    setCoupons(prev => prev.filter(c => c.id !== id));
    await adminService.logActivity('DELETE_COUPON', 'coupons', id, { code: couponCode });
    showNotification(`Coupon "${couponCode}" has been removed.`);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      showNotification('Please provide a coupon code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        description: description.trim(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_amount: minOrderAmount ? Number(minOrderAmount) : undefined,
        max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
        for_new_customers_only: forNewCustomersOnly,
        expiry_date: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        is_active: isActive,
      };

      if (editingCoupon) {
        await couponService.updateCoupon(editingCoupon.id, payload);
        await adminService.logActivity('UPDATE_COUPON', 'coupons', editingCoupon.id, payload);
        showNotification(`Coupon "${payload.code}" updated successfully.`);
      } else {
        await couponService.createCoupon(payload);
        await adminService.logActivity('CREATE_COUPON', 'coupons', undefined, payload);
        showNotification(`Coupon "${payload.code}" created successfully.`);
      }

      await loadCoupons();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving coupon:', err);
      showNotification(`Error: ${err.message || 'Could not save coupon.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.is_active).length;
  const newCustomerCoupons = coupons.filter(c => c.for_new_customers_only).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.times_used || 0), 0);

  // Filtered List
  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (filterAudience === 'NEW_CUSTOMERS') return c.for_new_customers_only;
    if (filterAudience === 'ACTIVE') return c.is_active;
    return true;
  });

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-heading">Coupons & Promotional Vouchers</h1>
          <p className="admin-page-sub">
            Create and manage customer discount vouchers, welcome incentives for new shoppers, and seasonal campaigns.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleOpenCreateModal}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Create New Coupon
        </button>
      </div>

      {actionMsg && (
        <div className="admin-action-alert success">
          <CheckCircle2 size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div className="admin-form-section" style={{ margin: 0, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888' }}>
              Total Coupons
            </span>
            <Tag size={16} color="var(--color-gold-dark)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-black-deep)', marginTop: '8px' }}>
            {totalCoupons}
          </div>
        </div>

        <div className="admin-form-section" style={{ margin: 0, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888' }}>
              Active Campaigns
            </span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', marginTop: '8px' }}>
            {activeCoupons}
          </div>
        </div>

        <div className="admin-form-section" style={{ margin: 0, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888' }}>
              New Customer Exclusive
            </span>
            <Users size={16} color="var(--color-gold)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-gold-dark)', marginTop: '8px' }}>
            {newCustomerCoupons}
          </div>
        </div>

        <div className="admin-form-section" style={{ margin: 0, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888' }}>
              Total Redemptions
            </span>
            <Sparkles size={16} color="#6366f1" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-black-deep)', marginTop: '8px' }}>
            {totalRedemptions}
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Filter Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div style={{ position: 'relative', minWidth: '260px', flex: 1, maxWidth: '400px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by coupon code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { key: 'ALL', label: 'All Coupons' },
            { key: 'NEW_CUSTOMERS', label: '⭐ New Customers Only' },
            { key: 'ACTIVE', label: 'Active Only' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterAudience(tab.key as any)}
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '4px',
                cursor: 'pointer',
                border: filterAudience === tab.key ? '1px solid var(--color-gold)' : '1px solid #dcd7ce',
                background: filterAudience === tab.key ? 'var(--color-gold-subtle, #fcf9f2)' : '#fff',
                color: filterAudience === tab.key ? 'var(--color-gold-dark)' : '#444',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
          Loading promotional coupons...
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div
          className="admin-form-section"
          style={{ padding: '60px 20px', textAlign: 'center', margin: 0 }}
        >
          <Tag size={40} style={{ color: '#ccc', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333', marginBottom: '8px' }}>
            No coupons match your criteria
          </h3>
          <p style={{ fontSize: '13px', color: '#777', maxWidth: '420px', margin: '0 auto 20px' }}>
            Create promotional discount vouchers to attract first-time shoppers or celebrate seasonal festive launches.
          </p>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={14} style={{ marginRight: '6px' }} /> Create First Coupon
          </button>
        </div>
      ) : (
        <div className="admin-form-section" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#faf9f6', borderBottom: '1px solid #ebe5dc', color: '#777' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
                    Coupon Code
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
                    Discount Privilege
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
                    Eligibility
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
                    Minimum Order
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
                    Used
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
                    Status
                  </th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((coupon) => {
                  const isExpired = coupon.expiry_date && new Date(coupon.expiry_date).getTime() < Date.now();

                  return (
                    <tr
                      key={coupon.id}
                      style={{
                        borderBottom: '1px solid #f0ece5',
                        background: '#ffffff',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fcfbfa')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      {/* Code */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '13px',
                              letterSpacing: '0.08em',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              background: '#1a1a1a',
                              color: 'var(--color-gold)',
                              border: '1px solid #333',
                            }}
                          >
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(coupon.code)}
                            title="Copy code"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: copiedCode === coupon.code ? '#10b981' : '#999',
                              padding: '4px',
                            }}
                          >
                            {copiedCode === coupon.code ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                        {coupon.description && (
                          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px', maxWidth: '280px', lineHeight: 1.4 }}>
                            {coupon.description}
                          </div>
                        )}
                      </td>

                      {/* Discount Privilege */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {coupon.discount_type === 'PERCENTAGE' ? (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                fontWeight: 700,
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Percent size={12} /> {coupon.discount_value}% OFF
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: '#ecfdf5',
                                color: '#047857',
                                fontWeight: 700,
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Coins size={12} /> PKR {coupon.discount_value.toLocaleString()} OFF
                            </span>
                          )}
                        </div>
                        {coupon.max_discount_amount && (
                          <span style={{ fontSize: '11px', color: '#888', display: 'block', marginTop: '3px' }}>
                            Max cap: PKR {coupon.max_discount_amount.toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* Eligibility */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        {coupon.for_new_customers_only ? (
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '12px',
                              background: '#fffbeb',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              fontSize: '11px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Sparkles size={11} /> New Customers Only
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '12px',
                              background: '#f3f4f6',
                              color: '#4b5563',
                              fontSize: '11px',
                              fontWeight: 500,
                            }}
                          >
                            All Customers
                          </span>
                        )}
                      </td>

                      {/* Minimum Order */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        {coupon.min_order_amount ? (
                          <span style={{ fontWeight: 600, color: '#333' }}>
                            PKR {coupon.min_order_amount.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: '#999', fontSize: '12px' }}>No Minimum</span>
                        )}
                      </td>

                      {/* Used */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: 600, color: '#333' }}>
                          {coupon.times_used || 0}
                        </span>
                        <span style={{ fontSize: '11px', color: '#888', marginLeft: '3px' }}>orders</span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {isExpired ? (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'inline-block',
                                width: 'fit-content',
                              }}
                            >
                              Expired
                            </span>
                          ) : coupon.is_active ? (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: '#ecfdf5',
                                color: '#047857',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'inline-block',
                                width: 'fit-content',
                              }}
                            >
                              Active
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: '#f3f4f6',
                                color: '#6b7280',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'inline-block',
                                width: 'fit-content',
                              }}
                            >
                              Paused
                            </span>
                          )}

                          {coupon.expiry_date && (
                            <span style={{ fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={10} /> Exp: {new Date(coupon.expiry_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(coupon)}
                            title={coupon.is_active ? 'Pause Coupon' : 'Activate Coupon'}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: coupon.is_active ? '#059669' : '#9ca3af',
                              padding: '4px',
                            }}
                          >
                            {coupon.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEditModal(coupon)}
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(coupon.id, coupon.code)}
                            title="Delete Coupon"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#dc2626',
                              padding: '6px',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Coupon Modal */}
      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '600px' }}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={18} color="var(--color-gold-dark)" />
                <h3 className="admin-modal-title">
                  {editingCoupon ? `Edit Coupon "${editingCoupon.code}"` : 'Create New Promotional Coupon'}
                </h3>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Code with Generator */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Coupon Code <strong style={{ color: '#dc2626' }}>*</strong></span>
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-gold-dark)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <RefreshCw size={11} /> Generate Random Code
                  </button>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME10, EBA10, FESTIVE500"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="form-input"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}
                />
                <span style={{ fontSize: '11px', color: '#777', marginTop: '3px' }}>
                  Customers will type this exact code in Cart & Checkout to redeem discount.
                </span>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Promotional Title / Customer Note</label>
                <input
                  type="text"
                  placeholder="e.g. 10% Welcome privilege discount on your first designer order"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Discount Type Selector */}
              <div className="form-group">
                <label className="form-label">Discount Structure</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setDiscountType('PERCENTAGE')}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      border: discountType === 'PERCENTAGE' ? '2px solid var(--color-gold)' : '1px solid #dcd7ce',
                      background: discountType === 'PERCENTAGE' ? '#fbf8f2' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-black-deep)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Percent size={14} color="var(--color-gold-dark)" /> Percentage (%) Off
                    </div>
                    <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>
                      Deducts a percentage from the cart order subtotal.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiscountType('FIXED')}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      border: discountType === 'FIXED' ? '2px solid var(--color-gold)' : '1px solid #dcd7ce',
                      background: discountType === 'FIXED' ? '#fbf8f2' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-black-deep)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Coins size={14} color="var(--color-gold-dark)" /> Flat Amount (PKR) Off
                    </div>
                    <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>
                      Deducts a fixed rupee amount directly from the total.
                    </div>
                  </button>
                </div>
              </div>

              {/* Discount Value & Max Cap */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    {discountType === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount (PKR)'} <strong style={{ color: '#dc2626' }}>*</strong>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={discountType === 'PERCENTAGE' ? 100 : 50000}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="form-input"
                    placeholder={discountType === 'PERCENTAGE' ? '10' : '500'}
                  />
                </div>

                {discountType === 'PERCENTAGE' ? (
                  <div className="form-group">
                    <label className="form-label">Max Discount Cap (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={maxDiscountAmount}
                      onChange={(e) => setMaxDiscountAmount(e.target.value)}
                      className="form-input"
                      placeholder="e.g. 5000 (Optional)"
                    />
                    <span style={{ fontSize: '11px', color: '#777', marginTop: '3px' }}>
                      Optional upper limit for percentage discount.
                    </span>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Minimum Order Subtotal (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                      className="form-input"
                      placeholder="e.g. 3000 (Optional)"
                    />
                  </div>
                )}
              </div>

              {discountType === 'PERCENTAGE' && (
                <div className="form-group">
                  <label className="form-label">Minimum Order Subtotal (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    className="form-input"
                    placeholder="e.g. 3000 (Optional)"
                  />
                  <span style={{ fontSize: '11px', color: '#777', marginTop: '3px' }}>
                    Cart subtotal required before this discount can be applied.
                  </span>
                </div>
              )}

              {/* Target Audience: New Customers Only Switch */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '6px',
                  border: forNewCustomersOnly ? '1px solid var(--color-gold)' : '1px solid #e5e0d8',
                  background: forNewCustomersOnly ? '#fffdf7' : '#fafafa',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-black-deep)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={15} color="var(--color-gold-dark)" /> Exclusive for New Customers Only
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '4px', lineHeight: 1.4 }}>
                    When enabled, this voucher can ONLY be redeemed by first-time shoppers who have never placed an order before.
                  </div>
                </div>

                <input
                  type="checkbox"
                  id="forNewCustomersOnly"
                  checked={forNewCustomersOnly}
                  onChange={(e) => setForNewCustomersOnly(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '4px', accentColor: 'var(--color-gold-dark)' }}
                />
              </div>

              {/* Expiry Date */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Expiration Date (Optional)</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="form-input"
                  />
                  <span style={{ fontSize: '11px', color: '#777', marginTop: '3px' }}>
                    Leave blank for permanent vouchers.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Voucher Status</label>
                  <select
                    className="form-select"
                    value={isActive ? 'true' : 'false'}
                    onChange={(e) => setIsActive(e.target.value === 'true')}
                  >
                    <option value="true">Active & Redeemable</option>
                    <option value="false">Paused / Inactive</option>
                  </select>
                </div>
              </div>

              {/* Footer buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '16px', borderTop: '1px solid #ebe5dc' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Tag size={15} />
                  <span>{isSubmitting ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
