import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, Heart, ArrowRight, ShieldCheck, Truck, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatPKR } from '../lib/supabase';
import './CartPage.css';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [promoCode, setPromoCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  const freeShippingThreshold = 5000;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingEstimate = isFreeShipping ? 0 : 250;
  const grandTotal = Math.max(0, subtotal + shippingEstimate - discountAmount);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    const code = promoCode.trim().toUpperCase();

    if (code === 'EBA10' || code === 'WELCOME10') {
      const disc = Math.round(subtotal * 0.1);
      setDiscountAmount(disc);
      setPromoApplied(true);
    } else if (code === 'FREESHIP') {
      setDiscountAmount(250);
      setPromoApplied(true);
    } else {
      setPromoError('Invalid promotion code. Try "EBA10" for 10% off.');
    }
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
              {isFreeShipping ? (
                <span>Complimentary Nationwide Express Shipping unlocked!</span>
              ) : (
                <span>
                  Add <strong>{formatPKR(freeShippingThreshold - subtotal)}</strong> more to qualify for <strong>Free Express Shipping</strong>.
                </span>
              )}
            </div>
            <div className="cart-progress-track">
              <div
                className="cart-progress-fill"
                style={{ width: `${Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100))}%` }}
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
              <label className="form-label">Promotional Voucher</label>
              <div className="promo-input-group">
                <input
                  type="text"
                  placeholder="e.g. EBA10"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="promo-input"
                  disabled={promoApplied}
                />
                <button
                  type="submit"
                  className="btn btn-secondary btn-sm"
                  disabled={promoApplied || !promoCode.trim()}
                >
                  {promoApplied ? <Check size={14} /> : 'Apply'}
                </button>
              </div>
              {promoApplied && (
                <p className="promo-success-msg">✓ 10% Luxury privilege discount applied</p>
              )}
              {promoError && (
                <p className="promo-error-msg">{promoError}</p>
              )}
            </form>

            <div className="summary-lines">
              <div className="summary-line">
                <span>Subtotal</span>
                <span>{formatPKR(subtotal)}</span>
              </div>

              <div className="summary-line">
                <span>Estimated Nationwide Delivery</span>
                <span>{isFreeShipping ? 'COMPLIMENTARY' : formatPKR(shippingEstimate)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="summary-line discount">
                  <span>Privilege Discount</span>
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
