import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { adminService } from '../../services/adminService';
import { formatPKR } from '../../lib/supabase';
import './CartDrawer.css';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { items, itemCount, subtotal, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart } = useCart();
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(5000);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await adminService.getSiteSettings();
        if (s.free_delivery_threshold !== undefined) {
          setFreeShippingThreshold(Number(s.free_delivery_threshold));
        }
      } catch (e) {}
    };
    loadSettings();

    const handleUpdate = (e: any) => {
      if (e.detail?.free_delivery_threshold !== undefined) {
        setFreeShippingThreshold(Number(e.detail.free_delivery_threshold));
      }
    };
    window.addEventListener('eba_settings_updated', handleUpdate);
    return () => window.removeEventListener('eba_settings_updated', handleUpdate);
  }, []);

  const isFree = freeShippingThreshold === 0 || subtotal >= freeShippingThreshold;
  const progressPercent = freeShippingThreshold === 0 ? 100 : Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const remainingForFreeShipping = freeShippingThreshold === 0 ? 0 : Math.max(0, freeShippingThreshold - subtotal);

  if (!isCartOpen) return null;

  return (
    <>
      <div
        className="cart-drawer-backdrop"
        onClick={() => setIsCartOpen(false)}
      />
      <div className="cart-drawer">
        {/* Drawer Header */}
        <div className="cart-drawer-header">
          <div className="cart-header-title">
            <ShoppingBag size={20} />
            <h3>SHOPPING BAG ({itemCount})</h3>
          </div>
          <button
            className="cart-close-btn"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close Shopping Bag"
          >
            <X size={20} />
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div className="shipping-progress-banner">
          {remainingForFreeShipping > 0 ? (
            <p className="shipping-progress-text">
              Add <strong>{formatPKR(remainingForFreeShipping)}</strong> more for <strong>Complimentary Nationwide Delivery</strong>
            </p>
          ) : (
            <p className="shipping-progress-text success">
              ✨ You have unlocked <strong>Free Nationwide Delivery</strong>!
            </p>
          )}
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="cart-items-container">
          {items.length === 0 ? (
            <div className="cart-empty-state">
              <ShoppingBag size={48} className="empty-cart-icon" />
              <h4>Your Shopping Bag is Empty</h4>
              <p>Discover refined Pakistani designer unstitched collections.</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/shop');
                }}
              >
                Explore Collections
              </button>
            </div>
          ) : (
            items.map((item) => {
              const unitPrice = item.product.sale_price ?? item.product.price;
              const imgUrl = item.product.images?.[0]?.url || '/assets/logo/eba-logo.png';

              return (
                <div key={`${item.product_id}_${item.variant_id}`} className="cart-item-row">
                  <div className="cart-item-image">
                    <img src={imgUrl} alt={item.product.name} />
                  </div>
                  <div className="cart-item-info">
                    {item.product.brand && (
                      <span className="cart-item-brand">{item.product.brand.name}</span>
                    )}
                    <Link
                      to={`/product/${item.product.slug}`}
                      className="cart-item-title"
                      onClick={() => setIsCartOpen(false)}
                    >
                      {item.product.name}
                    </Link>

                    {item.variant?.size && (
                      <span className="cart-item-variant">Variant: {item.variant.size}</span>
                    )}

                    <div className="cart-item-price">
                      {formatPKR(unitPrice)}
                    </div>

                    <div className="cart-item-actions">
                      {/* Quantity Modifier */}
                      <div className="qty-controls">
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.variant_id)}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.variant_id)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        className="cart-remove-btn"
                        onClick={() => removeFromCart(item.product_id, item.variant_id)}
                        aria-label="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-subtotal-row">
              <span className="subtotal-label">Subtotal</span>
              <span className="subtotal-value">{formatPKR(subtotal)}</span>
            </div>
            <p className="cart-tax-notice">
              Shipping & promotional discounts calculated at checkout.
            </p>

            <div className="cart-checkout-actions">
              <button
                className="btn btn-primary btn-full checkout-btn"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/checkout');
                }}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={16} />
              </button>

              <button
                className="btn btn-secondary btn-full btn-sm"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/cart');
                }}
              >
                View Full Bag Details
              </button>
            </div>

            <div className="cart-security-badge">
              <ShieldCheck size={14} />
              <span>Authentic Pakistani Designer Wear & Secure Checkout</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
