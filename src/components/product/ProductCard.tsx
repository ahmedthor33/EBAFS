import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { Product } from '../../types';
import { formatPKR } from '../../lib/supabase';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const isSaved = isInWishlist(product.id);

  // Helper to extract image URL safely whether object or string
  const getImgUrl = (img: any): string => {
    if (!img) return '';
    if (typeof img === 'string') return img;
    return img.url || '';
  };

  // Determine primary & secondary image
  const primaryImg =
    getImgUrl(product.images?.find(i => i.is_primary)) ||
    getImgUrl(product.images?.[0]) ||
    (product as any).image_url ||
    (product as any).primary_image ||
    '/assets/logo/eba-logo.png';

  const secondaryImg =
    getImgUrl(product.images?.find(i => !i.is_primary && getImgUrl(i) !== primaryImg)) ||
    getImgUrl(product.images?.[1]) ||
    primaryImg;

  // Calculate discount percentage
  const discountPercent = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : null;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdding(true);
    await addToCart(product, 1, product.variants?.[0] || null);
    setTimeout(() => setIsAdding(false), 600);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <div
      className="product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/product/${product.slug}`} className="product-media-link">
        <div className="product-image-container">
          {/* Badges */}
          <div className="card-badges">
            {product.is_on_sale && discountPercent && (
              <span className="badge badge-sale">-{discountPercent}%</span>
            )}
            {product.is_new && <span className="badge badge-new">NEW</span>}
            {product.is_bestseller && <span className="badge badge-gold">BESTSELLER</span>}
          </div>

          {/* Wishlist Button */}
          <button
            className={`card-wishlist-btn ${isSaved ? 'saved' : ''}`}
            onClick={handleWishlistToggle}
            aria-label={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} />
          </button>

          {/* Primary & Secondary Crossfade Images */}
          <img
            src={primaryImg}
            alt={product.name}
            className={`card-img primary ${isHovered && secondaryImg !== primaryImg ? 'fade-out' : ''}`}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('eba-logo.png')) {
                target.src = '/assets/logo/eba-logo.png';
              }
            }}
          />
          {secondaryImg !== primaryImg && (
            <img
              src={secondaryImg}
              alt={`${product.name} alternate view`}
              className={`card-img secondary ${isHovered ? 'fade-in' : ''}`}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('eba-logo.png')) {
                  target.src = '/assets/logo/eba-logo.png';
                }
              }}
            />
          )}

          {/* Quick Action Overlay (Desktop) */}
          <div className="card-quick-actions">
            <button
              className="quick-add-btn"
              onClick={handleQuickAdd}
              disabled={isAdding || product.stock_quantity <= 0}
            >
              <ShoppingBag size={15} />
              <span>{product.stock_quantity <= 0 ? 'Out of Stock' : isAdding ? 'Added to Bag' : 'Quick Add'}</span>
            </button>
          </div>
        </div>
      </Link>

      {/* Product Details */}
      <div className="product-info">
        {product.brand && (
          <span className="product-brand-tag">{product.brand.name}</span>
        )}
        <h3 className="product-name">
          <Link to={`/product/${product.slug}`}>{product.name}</Link>
        </h3>

        {product.fabric && (
          <p className="product-fabric-preview">{product.fabric}</p>
        )}

        <div className="product-price-container">
          <span className="price-active">
            {formatPKR(product.sale_price ?? product.price)}
          </span>
          {product.sale_price && (
            <span className="price-struck">{formatPKR(product.price)}</span>
          )}
        </div>
      </div>
    </div>
  );
};
