import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, Heart, ArrowRight, ShieldCheck, Truck, Check, X, Tag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import { couponService } from '../services/couponService';
import { orderService } from '../services/orderService';
import { Coupon } from '../types';
import { formatPKR } from '../lib/supabase';
import './CartPage.css';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();

  // Dynamic Site Settings for Delivery
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(5000);
  const [defaultShippingFee, setDefaultShippingFee] = useState<number>(250);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState<string>('2 - 4 Working Days');

  // Dynamic Promo / Coupon State
  const [promoCode, setPromoCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoMsg, setPromoMsg] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Load live store delivery parameters
  useEffect(() => {
    const loadDeliverySettings = async () => {
      try {
        const s = await adminService.getSiteSettings();
        if (s.free_delivery_threshold !== undefined) {
          setFreeShippingThreshold(Number(s.free_delivery_threshold));
        }
        if (s.default_shipping_fee !== undefined) {
          setDefaultShippingFee(Number(s.default_shipping_fee));
        }
        if (s.estimated_delivery_days) {
          setEstimatedDeliveryDays(s.estimated_delivery_days);
        }
      } catch (e) {
        // fallback to defaults
      }
    };

    loadDeliverySettings();

    const handleSettingsUpdated = (e: any) => {
      if (e.detail?.free_delivery_threshold !== undefined) {
        setFreeShippingThreshold(Number(e.detail.free_delivery_threshold));
      }
      if (e.detail?.default_shipping_fee !== undefined) {
        setDefaultShippingFee(Number(e.detail.default_shipping_fee));
      }
      if (e.detail?.estimated_delivery_days) {
        setEstimatedDeliveryDays(e.detail.estimated_delivery_days);
      }
    };

    window.addEventListener('eba_settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('eba_settings_updated', handleSettingsUpdated);
  }, []);

  // Restore existing session coupon if present
  useEffect(() => {
    const checkSavedCoupon = async () => {
      try {
        const raw = sessionStorage.getItem('eba_applied_coupon');
        if (raw && subtotal > 0) {
          const parsed = JSON.parse(raw);
          if (parsed?.code) {
            setPromoCode(parsed.code);
            await validateAndApply(parsed.code, false);
          }
        }
      } catch (e) {}
    };
    if (subtotal > 0) {
      checkSavedCoupon();
    }
  }, [subtotal]);

  const isFreeShipping = freeShippingThreshold === 0 || subtotal >= freeShippingThreshold;
  const shippingEstimate = isFreeShipping ? 0 : defaultShippingFee;
  const grandTotal = Math.max(0, subtotal + shippingEstimate - discountAmount);

  const validateAndApply = async (codeToTest: string, showAlerts = true) => {
    if (!codeToTest.trim()) return;
    setIsValidatingPromo(true);
    if (showAlerts) setPromoError('');

    try {
      // Check customer order history for new-customer eligibility
      let isNewCustomer = true;
      if (user?.id) {
        const pastOrders = await orderService.getCustomerOrders(user.id);
        if (pastOrders && pastOrders.length > 0) {
          isNewCustomer = false;
        }
      }

      const result = await couponService.validateCoupon(codeToTest, subtotal, {
        isNewCustomer,
        customerEmail: user?.email,
      });

      if (result.valid && result.coupon) {
        setAppliedCoupon(result.coupon);
        setDiscountAmount(result.discountAmount);
        setPromoApplied(true);
        setPromoMsg(result.message || `✓ Voucher "${result.coupon.code}" applied!`);
        sessionStorage.setItem('eba_applied_coupon', JSON.stringify({
          code: result.coupon.code,
          discountAmount: result.discountAmount,
          description: result.coupon.description,
        }));
      } else {
        if (showAlerts) {
          setPromoError(result.error || 'Invalid promotional voucher.');
        }
        handleRemovePromo(false);
      }
    } catch (err: any) {
      if (showAlerts) {
        setPromoError(err?.message || 'Failed to validate voucher.');
      }
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    validateAndApply(promoCode, true);
  };

  const handleRemovePromo = (clearInput = true) => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setPromoApplied(false);
    setPromoMsg('');
    if (clearInput) setPromoCode('');
    sessionStorage.removeItem('eba_applied_coupon');
  };

  const handleMoveToWishlist = async (item: any) => {
    if (!isInWishlist(item.product.id)) {
      await toggleWishlist(item.product);
    }
    await removeFromCart(item.product_id, item.variant_id);
  };

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="container empty-cart-view">
          <ShoppingBag size={56} className="empty-state-icon" />
          <h2 className="empty-state-title">Your Shopping Bag is Currently Empty</h2>
          <p className="empty-state-desc">
            Indulge in Pakistan's finest unstitched designer lawn, hand-embroidered formals, and luxury wool shawls.
          </p>
          <Link to="/shop" className="btn btn-primary btn-lg">
            Explore Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <section className="cart-header-banner">
        <div className="container">
          <span className="cart-eyebrow">YOUR ORDER IN PROGRESS</span>
          <h1 className="cart-title">Shopping Bag ({items.length} Ensembles)</h1>
        </div>
      </section>

      <div className="container cart-layout">
        {/* Left Column: Items List */}
        <div className="cart-items-column">
          {/* Free Shipping Tracker */}
          <div className="cart-shipping-card">
            <div className="shipping-card-text">
              <Truck size={18} />
              {freeShippingThreshold === 0 ? (
                <span>Complimentary Nationwide Express Delivery on all orders ({estimatedDeliveryDays})!</span>
              ) : isFreeShipping ? (
                <span>Complimentary Nationwide Express Delivery unlocked ({estimatedDeliveryDays})!</span>
              ) : (
                <span>
                  Add <strong>{formatPKR(freeShippingThreshold - subtotal)}</strong> more to qualify for <strong>Free Express Delivery</strong> ({estimatedDeliveryDays}).
                </span>
              )}
            </div>
            <div className="cart-progress-track">
              <div
                className="cart-progress-fill"
                style={{
                  width: freeShippingThreshold === 0 ? '100%' : `${Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100))}%`
                }}
              />
            </div>
          </div>

          <div className="cart-table-header">
            <span className="col-product">Ensemble</span>
            <span className="col-price">Unit Price</span>
            <span className="col-qty">Quantity</span>
            <span className="col-total">Line Total</span>
          </div>

          {items.map((item) => {
            const unitPrice = item.product.sale_price ?? item.product.price;
            const lineTotal = unitPrice * item.quantity;
            const imgUrl = item.product.images?.[0]?.url || '/assets/logo/eba-logo.png';

            return (
              <div key={`${item.product_id}_${item.variant_id}`} className="cart-item-card">
                <div className="cart-item-main">
                  <div className="item-thumbnail">
                    <img src={imgUrl} alt={item.product.name} />
                  </div>
                  <div className="item-meta">
                    {item.product.brand && (
                      <span className="item-brand">{item.product.brand.name}</span>
                    )}
                    <Link to={`/product/${item.product.slug}`} className="item-name">
                      {item.product.name}
                    </Link>
                    {item.variant?.size && (
                      <span className="item-variant">Cut: {item.variant.size}</span>
                    )}
                    {item.product.fabric && (
                      <span className="item-fabric">Fabric: {item.product.fabric}</span>
                    )}

                    <div className="item-secondary-actions">
                      <button
                        className="item-action-link"
                        onClick={() => handleMoveToWishlist(item)}
                      >
                        <Heart size={13} /> Move to Wishlist
                      </button>
                      <button
                        className="item-action-link danger"
                        onClick={() => removeFromCart(item.product_id, item.variant_id)}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                </div>

                <div className="cart-item-price-col">
                  <span className="mobile-only-label">Price:</span>
                  <span className="unit-price-text">{formatPKR(unitPrice)}</span>
                </div>

                <div className="cart-item-qty-col">
                  <div className="cart-qty-box">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.variant_id)}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={13} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.variant_id)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <div className="cart-item-total-col">
                  <span className="mobile-only-label">Total:</span>
                  <span className="line-total-text">{formatPKR(lineTotal)}</span>
                </div>
              </div>
            );
          })}

          <div className="cart-bottom-actions">
            <Link to="/shop" className="continue-shopping-link">
              ← Continue Shopping
            </Link>
            <button onClick={clearCart} className="clear-bag-btn">
              Clear Shopping Bag
            </button>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="cart-summary-column">
          <div className="order-summary-card">
            <h3 className="summary-card-title">Order Summary</h3>

            {/* Promo Code Form */}
            <form onSubmit={handleApplyPromo} className="promo-code-form">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={13} color="var(--color-gold-dark)" />
                <span>Promotional Voucher / Coupon</span>
              </label>

              {promoApplied && appliedCoupon ? (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: '#fcf9f2',
                    border: '1px solid var(--color-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: 'var(--color-black-deep)', background: '#fff', padding: '2px 6px', borderRadius: '3px', border: '1px solid #e0d8c7' }}>
                        {appliedCoupon.code}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-gold-dark)' }}>
                        -{formatPKR(discountAmount)}
                      </span>
                    </div>
                    {promoMsg && (
                      <p style={{ fontSize: '11px', color: '#047857', margin: '4px 0 0 0', fontWeight: 500 }}>
                        {promoMsg}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePromo(true)}
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
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="promo-input-group">
                  <input
                    type="text"
                    placeholder="e.g. WELCOME10, EBA10"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="promo-input"
                    style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  />
                  <button
                    type="submit"
                    className="btn btn-secondary btn-sm"
                    disabled={isValidatingPromo || !promoCode.trim()}
                  >
                    {isValidatingPromo ? 'Validating...' : 'Apply'}
                  </button>
                </div>
              )}

              {promoError && (
                <p className="promo-error-msg" style={{ marginTop: '6px' }}>{promoError}</p>
              )}
            </form>

            <div className="summary-lines">
              <div className="summary-line">
                <span>Subtotal</span>
                <span>{formatPKR(subtotal)}</span>
              </div>

              <div className="summary-line">
                <span>Estimated Nationwide Delivery ({estimatedDeliveryDays})</span>
                <span>{isFreeShipping ? 'COMPLIMENTARY' : formatPKR(shippingEstimate)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="summary-line discount">
                  <span>Privilege Discount ({appliedCoupon?.code || promoCode})</span>
                  <span>-{formatPKR(discountAmount)}</span>
                </div>
              )}

              <div className="summary-total-line">
                <span>Grand Total</span>
                <span className="grand-total-amount">{formatPKR(grandTotal)}</span>
              </div>
            </div>

            <button
              className="btn btn-primary btn-full btn-lg checkout-submit-btn"
              onClick={() => navigate('/checkout')}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </button>

            <div className="summary-trust-points">
              <div className="point-item">
                <ShieldCheck size={15} />
                <span>100% Authentic Designer Guarantee</span>
              </div>
              <div className="point-item">
                <Truck size={15} />
                <span>Tracked Courier across all Pakistani cities</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
