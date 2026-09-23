import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { formatPKR } from '../lib/supabase';
import './WishlistPage.css';

export const WishlistPage: React.FC = () => {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  return (
    <div className="wishlist-page">
      <section className="wishlist-header-banner">
        <div className="container">
          <span className="wishlist-eyebrow">SAVED CURATIONS</span>
          <h1 className="wishlist-title">My Wishlist ({wishlist.length})</h1>
          <p className="wishlist-desc">
            Your personalized selection of luxury Pakistani designer wear saved for later.
          </p>
        </div>
      </section>

      <div className="container wishlist-container">
        {wishlist.length === 0 ? (
          <div className="empty-state">
            <Heart size={48} className="empty-state-icon" />
            <h3 className="empty-state-title">Your Wishlist is Empty</h3>
            <p className="empty-state-desc">
              Explore our collections of luxury lawn, formals, and gentlemen's unstitched wear and tap the heart icon to save your favorites.
            </p>
            <Link to="/shop" className="btn btn-primary">
              Discover Collections
            </Link>
          </div>
        ) : (
          <div className="wishlist-grid">
            {wishlist.map((product) => {
              const price = product.sale_price ?? product.price;
              const imgUrl = product.images?.[0]?.url || '/assets/logo/eba-logo.png';

              return (
                <div key={product.id} className="wishlist-card">
                  <div className="wishlist-card-media">
                    <img src={imgUrl} alt={product.name} />
                    <button
                      className="wishlist-remove-btn"
                      onClick={() => removeFromWishlist(product.id)}
                      aria-label="Remove from wishlist"
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="wishlist-card-info">
                    {product.brand && (
                      <span className="wishlist-brand">{product.brand.name}</span>
                    )}
                    <h3 className="wishlist-product-name">
                      <Link to={`/product/${product.slug}`}>{product.name}</Link>
                    </h3>
                    <div className="wishlist-price">{formatPKR(price)}</div>

                    <button
                      className="btn btn-primary btn-full btn-sm wishlist-bag-btn"
                      onClick={async () => {
                        await addToCart(product, 1, product.variants?.[0] || null);
                        await removeFromWishlist(product.id);
                      }}
                      disabled={product.stock_quantity <= 0}
                    >
                      <ShoppingBag size={14} />
                      <span>{product.stock_quantity > 0 ? 'Move to Bag' : 'Out of Stock'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
