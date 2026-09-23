import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Truck, CreditCard, Banknote, Building2, CheckCircle2, ArrowRight, Tag, X, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { adminService } from '../services/adminService';
import { couponService } from '../services/couponService';
import { ShippingZone, PaymentMethod, Order, Coupon } from '../types';
import { formatPKR } from '../lib/supabase';
import './CheckoutPage.css';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { user, profile } = useAuth();

  // Dynamic Shipping & Delivery Settings
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(5000);
  const [defaultShippingFee, setDefaultShippingFee] = useState<number>(250);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState<string>('2 - 4 Working Days');

  // Coupon / Promo State
  const [promoCode, setPromoCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Shipping & Payment Methods
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Form State
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('Lahore');
  const [province, setProvince] = useState('Punjab');
  const [postalCode, setPostalCode] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('COD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Load zones, payment methods, and live site delivery settings
  useEffect(() => {
    const loadData = async () => {
      try {
        const [zones, pMethods, siteSettings] = await Promise.all([
          orderService.getShippingZones(),
          orderService.getPaymentMethods(),
          adminService.getSiteSettings(),
        ]);
        setShippingZones(zones);
        setPaymentMethods(pMethods);
        if (siteSettings.free_delivery_threshold !== undefined) {
          setFreeShippingThreshold(Number(siteSettings.free_delivery_threshold));
        }
        if (siteSettings.default_shipping_fee !== undefined) {
          setDefaultShippingFee(Number(siteSettings.default_shipping_fee));
        }
        if (siteSettings.estimated_delivery_days) {
          setEstimatedDeliveryDays(siteSettings.estimated_delivery_days);
        }
      } catch (err) {
        console.error('Checkout data error:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    loadData();
  }, []);

  // Update profile fields if loaded
  useEffect(() => {
    if (profile) {
      if (!fullName) setFullName(profile.full_name || '');
      if (!phone) setPhone(profile.phone || '');
    }
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [profile, user]);

  // Restore coupon from sessionStorage
  useEffect(() => {
    const restoreSessionCoupon = async () => {
      try {
        const raw = sessionStorage.getItem('eba_applied_coupon');
        if (raw && subtotal > 0) {
          const parsed = JSON.parse(raw);
          if (parsed?.code) {
            setPromoCode(parsed.code);
            await validateCouponCode(parsed.code, false);
          }
        }
      } catch (e) {}
    };
    if (subtotal > 0) {
      restoreSessionCoupon();
    }
  }, [subtotal]);

  const validateCouponCode = async (codeToTest: string, showAlerts = true) => {
    if (!codeToTest.trim()) return;
    setIsValidatingPromo(true);
    if (showAlerts) setPromoError('');

    try {
      let isNewCustomer = true;
      if (user?.id) {
        const pastOrders = await orderService.getCustomerOrders(user.id);
        if (pastOrders && pastOrders.length > 0) {
          isNewCustomer = false;
        }
      }

      const res = await couponService.validateCoupon(codeToTest, subtotal, {
        isNewCustomer,
        customerEmail: email || user?.email,
      });

      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon);
        setDiscountAmount(res.discountAmount);
        sessionStorage.setItem('eba_applied_coupon', JSON.stringify({
          code: res.coupon.code,
          discountAmount: res.discountAmount,
          description: res.coupon.description,
        }));
      } else {
        if (showAlerts) {
          setPromoError(res.error || 'Invalid coupon.');
        }
        handleRemoveCoupon(false);
      }
    } catch (err: any) {
      if (showAlerts) setPromoError(err?.message || 'Error validating coupon.');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    validateCouponCode(promoCode, true);
  };

  const handleRemoveCoupon = (clearInput = true) => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    if (clearInput) setPromoCode('');
    sessionStorage.removeItem('eba_applied_coupon');
  };

  // Calculate dynamic shipping fee with freeDeliveryThreshold
  const calculateFinalShippingFee = (): number => {
    if (freeShippingThreshold === 0 || subtotal >= freeShippingThreshold) {
      return 0;
    }
    const zoneFee = orderService.calculateShippingFee(shippingZones, province, subtotal);
    return zoneFee > 0 ? zoneFee : defaultShippingFee;
  };

  const shippingFee = calculateFinalShippingFee();
  const totalAmount = Math.max(0, subtotal + shippingFee - discountAmount);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (items.length === 0) {
      setErrorMessage('Your shopping bag is empty.');
      return;
    }

    if (!fullName || !email || !phone || !streetAddress || !city || !province) {
      setErrorMessage('Please fill in all mandatory contact and shipping fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        user_id: user?.id || null,
        customer_name: fullName.trim(),
        customer_email: email.trim().toLowerCase(),
        customer_phone: phone.trim(),
        shipping_address: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          street_address: streetAddress.trim(),
          city: city.trim(),
          province: province.trim(),
          postal_code: postalCode.trim() || undefined,
        },
        subtotal,
        shipping_fee: shippingFee,
        discount: discountAmount,
        total_amount: totalAmount,
        payment_method: selectedPaymentMethod,
        payment_status: 'PENDING' as const,
        order_status: 'PENDING' as const,
        customer_notes: customerNotes.trim() || undefined,
      };

      const orderItems = items.map((it) => ({
        product_id: it.product_id,
        product_name: it.product.name,
        product_sku: it.product.sku || '',
        product_image: it.product.images?.[0]?.url || '/assets/logo/eba-logo.png',
        variant_title: it.variant?.size || 'Standard Cut',
        price: it.product.sale_price ?? it.product.price,
        quantity: it.quantity,
        subtotal: (it.product.sale_price ?? it.product.price) * it.quantity,
      }));

      const created = await orderService.createOrder(orderPayload, orderItems);

      if (appliedCoupon) {
        await couponService.recordUsage(appliedCoupon.code);
      }
      sessionStorage.removeItem('eba_applied_coupon');

      setCompletedOrder(created);
      await clearCart();
    } catch (err: any) {
      console.error('Order placement failure:', err);
      setErrorMessage(err.message || 'Failed to place order. Please try again or reach our WhatsApp support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order Success Screen
  if (completedOrder) {
    return (
      <div className="checkout-page">
        <div className="container success-container">
          <div className="success-card">
            <CheckCircle2 size={64} className="success-icon" />
            <span className="success-eyebrow">ORDER CONFIRMED</span>
            <h1 className="success-title">Thank You, {completedOrder.customer_name}</h1>
            <p className="success-desc">
              Your bespoke luxury order has been received by EBA Fashion Studio. A confirmation receipt has been dispatched to <strong>{completedOrder.customer_email}</strong>.
            </p>

            <div className="order-details-box">
              <div className="detail-row">
                <span className="detail-label">Order Number:</span>
                <span className="detail-value highlight">{completedOrder.order_number}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Total Amount:</span>
                <span className="detail-value">{formatPKR(completedOrder.total_amount)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Payment Method:</span>
                <span className="detail-value">
                  {completedOrder.payment_method === 'COD'
                    ? 'Cash on Delivery (COD)'
                    : completedOrder.payment_method === 'JAZZCASH'
                    ? 'JazzCash Mobile Account'
                    : 'Bank Transfer / IBFT'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Shipping Destination:</span>
                <span className="detail-value">
                  {completedOrder.shipping_address.street_address}, {completedOrder.shipping_address.city}, {completedOrder.shipping_address.province}
                </span>
              </div>
            </div>

            {completedOrder.payment_method === 'JAZZCASH' && (
              <div className="bank-instructions-box" style={{ borderLeft: '4px solid #d97706' }}>
                <h4 style={{ color: '#b45309' }}>Official JazzCash Payment Details</h4>
                <p>Please send <strong>{formatPKR(completedOrder.total_amount)}</strong> to:</p>
                <ul>
                  <li><strong>Account Title:</strong> EBA Fashion Studio</li>
                  <li><strong>JazzCash Mobile #:</strong> 0300 1234567</li>
                  <li><strong>Method:</strong> JazzCash App or dial *786#</li>
                </ul>
                <p className="bank-note">
                  Kindly share your payment screenshot with Order # <strong>{completedOrder.order_number}</strong> on WhatsApp at <strong>+92 300 1234567</strong> for instant courier dispatch.
                </p>
              </div>
            )}

            {completedOrder.payment_method === 'BANK_TRANSFER' && (
              <div className="bank-instructions-box">
                <h4>Official Bank Transfer Details</h4>
                <p>Please transfer <strong>{formatPKR(completedOrder.total_amount)}</strong> to:</p>
                <ul>
                  <li><strong>Bank:</strong> Meezan Bank Limited</li>
                  <li><strong>Title:</strong> EBA Fashion Studio</li>
                  <li><strong>Account #:</strong> 01020304050607</li>
                  <li><strong>IBAN:</strong> PK12MEZN0001020304050607</li>
                </ul>
                <p className="bank-note">
                  Kindly share your payment receipt with your Order # <strong>{completedOrder.order_number}</strong> on WhatsApp at <strong>+92 300 1234567</strong> for priority courier dispatch.
                </p>
              </div>
            )}

            <div className="success-actions">
              <Link to="/orders" className="btn btn-primary">
                View My Orders
              </Link>
              <Link to="/shop" className="btn btn-secondary">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="checkout-page">
        <div className="container empty-state">
          <h2 className="empty-state-title">Your Bag is Empty</h2>
          <p className="empty-state-desc">Please add items to your shopping bag before proceeding to checkout.</p>
          <Link to="/shop" className="btn btn-primary">Browse Collections</Link>
        </div>
      </div>
    );
  }

  const selectedMethodObj = paymentMethods.find(m => m.code === selectedPaymentMethod);

  return (
    <div className="checkout-page">
      <section className="checkout-banner">
        <div className="container">
          <span className="checkout-eyebrow">SECURE LUXURY CHECKOUT</span>
          <h1 className="checkout-title">Complete Your Order</h1>
        </div>
      </section>

      <div className="container checkout-layout">
        {/* Left Column: Form */}
        <form onSubmit={handlePlaceOrder} className="checkout-form-column">
          {errorMessage && (
            <div className="checkout-error-banner">
              {errorMessage}
            </div>
          )}

          {/* Section 1: Customer Contact */}
          <div className="checkout-section-box">
            <h3 className="section-box-title">1. Customer Contact Details</h3>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ayesha Khan / Daniyal Ahmed"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (for order receipts) *</label>
                <input
                  type="email"
                  placeholder="yourname@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number (Active for Courier SMS/Call) *</label>
              <input
                type="tel"
                placeholder="0300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="form-input"
              />
            </div>
          </div>

          {/* Section 2: Delivery Destination */}
          <div className="checkout-section-box">
            <h3 className="section-box-title">2. Shipping Destination (Pakistan)</h3>
            <div className="form-group">
              <label className="form-label">Street Address / House / Apartment / Plaza *</label>
              <input
                type="text"
                placeholder="House #, Street #, Sector / Phase, Area"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  placeholder="e.g. Lahore, Karachi, Islamabad"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Province / Region *</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="Punjab">Punjab</option>
                  <option value="Sindh">Sindh</option>
                  <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa (KPK)</option>
                  <option value="Balochistan">Balochistan</option>
                  <option value="Islamabad Capital Territory">Islamabad Capital Territory</option>
                  <option value="Azad Kashmir">Azad Kashmir</option>
                  <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Postal Code</label>
                <input
                  type="text"
                  placeholder="e.g. 54000"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Special Delivery Instructions (Optional)</label>
              <textarea
                placeholder="Gate code, landmark, or preferred delivery timing..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="form-textarea"
                rows={2}
              />
            </div>
          </div>

          {/* Section 3: Payment Options */}
          <div className="checkout-section-box">
            <h3 className="section-box-title">3. Payment Selection</h3>
            <div className="payment-options-list">
              {paymentMethods.map((method) => (
                <label
                  key={method.id}
                  className={`payment-method-card ${selectedPaymentMethod === method.code ? 'selected' : ''}`}
                >
                  <div className="payment-radio-row">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.code}
                      checked={selectedPaymentMethod === method.code}
                      onChange={() => setSelectedPaymentMethod(method.code)}
                    />
                    <div className="payment-title-group">
                      <span className="payment-method-name">{method.name}</span>
                      <p className="payment-method-instructions">{method.instructions}</p>
                    </div>
                  </div>

                  {selectedPaymentMethod === method.code && method.account_details && method.code === 'BANK_TRANSFER' && (
                    <div className="bank-account-accordion">
                      <div className="bank-details-grid">
                        <div>
                          <strong>Bank Name:</strong>
                          <span>{method.account_details.bank_name}</span>
                        </div>
                        <div>
                          <strong>Account Title:</strong>
                          <span>{method.account_details.account_title}</span>
                        </div>
                        <div>
                          <strong>Account Number:</strong>
                          <span>{method.account_details.account_number}</span>
                        </div>
                        <div>
                          <strong>IBAN:</strong>
                          <span>{method.account_details.iban}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPaymentMethod === method.code && method.account_details && method.code === 'JAZZCASH' && (
                    <div className="bank-account-accordion" style={{ borderLeft: '3px solid #d97706', backgroundColor: '#fffbeb' }}>
                      <div className="bank-details-grid">
                        <div>
                          <strong>Account Title:</strong>
                          <span>{method.account_details.account_title || 'EBA Fashion Studio'}</span>
                        </div>
                        <div>
                          <strong>JazzCash Mobile #:</strong>
                          <span style={{ fontWeight: 600, color: '#b45309' }}>
                            {method.account_details.mobile_number || method.account_details.account_number || '0300 1234567'}
                          </span>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <strong>Transfer Instructions:</strong>
                          <span>{method.account_details.note || 'Dial *786# or transfer via JazzCash Mobile App to Mobile Account.'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg place-order-btn"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Confirming Order...' : `Confirm & Place Order (${formatPKR(totalAmount)})`}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Right Column: Order Overview */}
        <aside className="checkout-summary-column">
          <div className="checkout-summary-card">
            <h3 className="summary-title">Ensembles in Order ({items.length})</h3>

            <div className="checkout-items-list">
              {items.map((it) => {
                const price = it.product.sale_price ?? it.product.price;
                const img = it.product.images?.[0]?.url || '/assets/logo/eba-logo.png';
                return (
                  <div key={`${it.product_id}_${it.variant_id}`} className="checkout-item-row">
                    <div className="checkout-item-thumb">
                      <img src={img} alt={it.product.name} />
                      <span className="checkout-item-qty">{it.quantity}</span>
                    </div>
                    <div className="checkout-item-info">
                      <span className="item-brand-mini">{it.product.brand?.name}</span>
                      <h4 className="item-title-mini">{it.product.name}</h4>
                      {it.variant?.size && (
                        <span className="item-variant-mini">{it.variant.size}</span>
                      )}
                    </div>
                    <div className="checkout-item-price">
                      {formatPKR(price * it.quantity)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Promotional Voucher in Checkout */}
            <div style={{ marginTop: '16px', marginBottom: '16px', borderTop: '1px solid #e8dfcf', paddingTop: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#666', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Tag size={13} color="var(--color-gold-dark)" />
                <span>Promotional Voucher</span>
              </label>

              {appliedCoupon ? (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#fcf9f2',
                    border: '1px solid var(--color-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: 'var(--color-black-deep)', background: '#fff', padding: '2px 6px', borderRadius: '3px', border: '1px solid #e0d8c7' }}>
                      {appliedCoupon.code}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-gold-dark)' }}>
                      -{formatPKR(discountAmount)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCoupon(true)}
                    title="Remove coupon"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="e.g. WELCOME10, EBA10"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #dcd7ce',
                        borderRadius: '4px',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="btn btn-secondary btn-sm"
                      disabled={isValidatingPromo || !promoCode.trim()}
                      style={{ padding: '8px 14px', fontSize: '12px' }}
                    >
                      {isValidatingPromo ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                  {promoError && (
                    <p style={{ fontSize: '11px', color: '#dc2626', margin: '4px 0 0 0' }}>{promoError}</p>
                  )}
                </div>
              )}
            </div>

            <div className="checkout-calculations">
              <div className="calc-row">
                <span>Subtotal</span>
                <span>{formatPKR(subtotal)}</span>
              </div>
              <div className="calc-row">
                <span>
                  Shipping ({province})
                  <small style={{ display: 'block', fontSize: '10px', color: '#777' }}>
                    {estimatedDeliveryDays}
                  </small>
                </span>
                <span>{shippingFee === 0 ? 'COMPLIMENTARY' : formatPKR(shippingFee)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="calc-row" style={{ color: '#047857' }}>
                  <span>Privilege Discount ({appliedCoupon?.code || promoCode})</span>
                  <span>-{formatPKR(discountAmount)}</span>
                </div>
              )}

              <div className="calc-row total">
                <span>Total Amount</span>
                <span className="total-val">{formatPKR(totalAmount)}</span>
              </div>
            </div>

            <div className="checkout-trust-badge">
              <ShieldCheck size={16} />
              <span>Cash on Delivery & Secure Bank Transfers Supported</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
