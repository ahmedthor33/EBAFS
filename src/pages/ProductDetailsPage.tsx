import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Truck, ShieldCheck, RefreshCw, ChevronDown, ChevronUp, Share2, Check } from 'lucide-react';
import { productService } from '../services/productService';
import { Product, ProductVariant } from '../types';
import { formatPKR } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { ProductCard } from '../components/product/ProductCard';
import './ProductDetailsPage.css';

export const ProductDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeAccordion, setActiveAccordion] = useState<string>('description');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const loadProduct = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const item = await productService.getProductBySlug(slug);
        if (item) {
          setProduct(item);
          const primaryObj = item.images?.find(i => i.is_primary);
          const firstObj = item.images?.[0];
          const initialImg = (primaryObj as any)?.url || (typeof primaryObj === 'string' ? primaryObj : null) ||
                             (firstObj as any)?.url || (typeof firstObj === 'string' ? firstObj : null) ||
                             (item as any).image_url || (item as any).primary_image ||
                             '/assets/logo/eba-logo.png';
          setSelectedImage(initialImg);
          if (item.variants && item.variants.length > 0) {
            setSelectedVariant(item.variants[0]);
          }

          // Fetch related
          const related = await productService.getRelatedProducts(item.id, item.category_id, 4);
          setRelatedProducts(related);

          // Save to recently viewed
          const viewed: string[] = JSON.parse(localStorage.getItem('eba_recently_viewed') || '[]');
          if (!viewed.includes(item.slug)) {
            viewed.unshift(item.slug);
            localStorage.setItem('eba_recently_viewed', JSON.stringify(viewed.slice(0, 6)));
          }
        }
      } catch (err) {
        console.error('Error loading product details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
    window.scrollTo(0, 0);
  }, [slug]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handleAddToCart = async () => {
    if (!product) return;
    await addToCart(product, quantity, selectedVariant);
  };

  const handleBuyNow = async () => {
    if (!product) return;
    await addToCart(product, quantity, selectedVariant);
    navigate('/checkout');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (loading) {
    return (
      <div className="container product-loading-state">
        <div className="skeleton skeleton-gallery" />
        <div className="skeleton-details">
          <div className="skeleton skeleton-text short" />
          <div className="skeleton skeleton-text title" />
          <div className="skeleton skeleton-text price" />
          <div className="skeleton skeleton-desc" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container empty-state">
        <div className="empty-state-icon">⚜️</div>
        <h3 className="empty-state-title">Ensemble Not Found</h3>
        <p className="empty-state-desc">The requested designer product could not be found or has been archived.</p>
        <Link to="/shop" className="btn btn-primary">Return to Collections</Link>
      </div>
    );
  }

  const isSaved = isInWishlist(product.id);
  const discountPercent = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : null;

  return (
    <div className="product-details-page">
      {/* Breadcrumbs */}
      <div className="container breadcrumb-container">
        <nav className="breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to={product.gender === 'MEN' ? '/men' : '/women'}>
            {product.gender === 'MEN' ? "Men's Collection" : "Women's Collection"}
          </Link>
          <span>/</span>
          {product.brand && (
            <>
              <Link to={`/brand/${product.brand.slug}`}>{product.brand.name}</Link>
              <span>/</span>
            </>
          )}
          <span className="current-crumb">{product.name}</span>
        </nav>
      </div>

      <div className="container product-view-container">
        {/* Left Side: Editorial Image Gallery */}
        <div className="product-gallery">
          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="gallery-thumbnails">
              {product.images.map((img) => {
                const imgUrl = (img as any)?.url || (typeof img === 'string' ? img : '');
                if (!imgUrl) return null;
                return (
                  <button
                    key={img.id || imgUrl}
                    className={`thumb-btn ${selectedImage === imgUrl ? 'active' : ''}`}
                    onClick={() => setSelectedImage(imgUrl)}
                  >
                    <img
                      src={imgUrl}
                      alt={img.alt_text || product.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes('eba-logo.png')) {
                          target.src = '/assets/logo/eba-logo.png';
                        }
                      }}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Display Image with Zoom Effect */}
          <div
            className="main-image-viewport"
            onMouseEnter={() => {
              if (typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                setIsZoomed(true);
              }
            }}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={(e) => {
              if (typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                handleMouseMove(e);
              }
            }}
          >
            <img
              src={selectedImage || '/assets/logo/eba-logo.png'}
              alt={product.name}
              className={`main-display-image ${isZoomed ? 'zoomed' : ''}`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('eba-logo.png')) {
                  target.src = '/assets/logo/eba-logo.png';
                }
              }}
              style={
                isZoomed
                  ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                  : undefined
              }
            />

            <div className="main-image-badges">
              {product.is_on_sale && discountPercent && (
                <span className="badge badge-sale">-{discountPercent}%</span>
              )}
              {product.is_new && <span className="badge badge-new">NEW LAUNCH</span>}
            </div>
          </div>
        </div>

        {/* Right Side: Product Information & Purchase */}
        <div className="product-essential-details">
          {/* Brand & Title */}
          {product.brand && (
            <Link to={`/brand/${product.brand.slug}`} className="details-brand-link">
              {product.brand.name}
            </Link>
          )}
          <h1 className="details-product-title">{product.name}</h1>

          {/* SKU & Availability */}
          <div className="sku-status-bar">
            {product.sku && <span className="product-sku">SKU: {product.sku}</span>}
            <span className={`stock-status-pill ${product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}`}>
              {product.stock_quantity > 0 ? 'In Stock (Ready to Dispatch)' : 'Sold Out'}
            </span>
          </div>

          {/* Price */}
          <div className="details-price-row">
            <span className="details-current-price">
              {formatPKR(product.sale_price ?? product.price)}
            </span>
            {product.sale_price && (
              <>
                <span className="details-original-price">{formatPKR(product.price)}</span>
                <span className="details-discount-badge">Save {discountPercent}%</span>
              </>
            )}
          </div>

          {/* Short Description */}
          {product.short_description && (
            <p className="details-short-desc">{product.short_description}</p>
          )}

          {/* Specification Highlights */}
          <div className="details-specs-grid">
            {product.fabric && (
              <div className="spec-pill">
                <span className="spec-label">Fabric:</span>
                <span className="spec-value">{product.fabric}</span>
              </div>
            )}
            {product.color && (
              <div className="spec-pill">
                <span className="spec-label">Color:</span>
                <span className="spec-value">{product.color}</span>
              </div>
            )}
            {product.season && (
              <div className="spec-pill">
                <span className="spec-label">Season:</span>
                <span className="spec-value">{product.season}</span>
              </div>
            )}
          </div>

          {/* Variant Selection (if available) */}
          {product.variants && product.variants.length > 0 && (
            <div className="variant-selection-group">
              <label className="variant-label">SELECT SPECIFICATION / SUIT LENGTH:</label>
              <div className="variants-chips">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    className={`variant-chip ${selectedVariant?.id === v.id ? 'active' : ''}`}
                    onClick={() => setSelectedVariant(v)}
                  >
                    {v.size || v.fabric || 'Standard Suit'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Modifier */}
          <div className="purchase-controls-row">
            <div className="quantity-selector">
              <button
                className="q-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="q-val">{quantity}</span>
              <button
                className="q-btn"
                onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <button
              className="details-wishlist-toggle"
              onClick={() => toggleWishlist(product)}
              aria-label={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
              <span>{isSaved ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div className="details-cta-group">
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleAddToCart}
              disabled={product.stock_quantity <= 0}
            >
              <ShoppingBag size={18} />
              <span>{product.stock_quantity > 0 ? 'Add to Shopping Bag' : 'Out of Stock'}</span>
            </button>

            <button
              className="btn btn-gold btn-full btn-lg"
              onClick={handleBuyNow}
              disabled={product.stock_quantity <= 0}
            >
              <span>Instant Buy Now</span>
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="details-trust-bar">
            <div className="trust-item">
              <Truck size={18} />
              <div>
                <strong>Express Courier</strong>
                <p>2-4 business days across Pakistan</p>
              </div>
            </div>
            <div className="trust-item">
              <ShieldCheck size={18} />
              <div>
                <strong>Original & Authentic</strong>
                <p>Official brand packaging & tags</p>
              </div>
            </div>
            <div className="trust-item">
              <RefreshCw size={18} />
              <div>
                <strong>7-Day Exchange</strong>
                <p>Hassle-free exchange policy</p>
              </div>
            </div>
          </div>

          {/* Accordion Tabs */}
          <div className="details-accordions">
            {/* Description */}
            <div className="accordion-tab">
              <button
                className="accordion-header"
                onClick={() => setActiveAccordion(activeAccordion === 'description' ? '' : 'description')}
              >
                <span>PRODUCT DESCRIPTION & CRAFT</span>
                {activeAccordion === 'description' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {activeAccordion === 'description' && (
                <div className="accordion-content">
                  <p>{product.description || 'Exclusive Pakistani unstitched designer ensemble.'}</p>
                </div>
              )}
            </div>

            {/* Fabric & Material Details */}
            <div className="accordion-tab">
              <button
                className="accordion-header"
                onClick={() => setActiveAccordion(activeAccordion === 'fabric' ? '' : 'fabric')}
              >
                <span>FABRIC SPECIFICATION & SUIT DETAILS</span>
                {activeAccordion === 'fabric' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {activeAccordion === 'fabric' && (
                <div className="accordion-content">
                  <ul className="fabric-details-list">
                    <li><strong>Fabric Composition:</strong> {product.fabric || 'Superfine Luxury Blend'}</li>
                    <li><strong>Color Palette:</strong> {product.color || 'Standard Designer Tone'}</li>
                    <li><strong>Suit Type:</strong> Unstitched Fabric (Allows custom bespoke tailoring)</li>
                    <li><strong>Standard Cut:</strong> 4.5 meters for Men's Kurta/Shalwar; 3-Piece Set for Women's Lawn/Formals</li>
                    <li><strong>Care Instructions:</strong> Dry clean recommended or gentle hand wash in lukewarm water.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Size & Unstitched Guide */}
            <div className="accordion-tab">
              <button
                className="accordion-header"
                onClick={() => setActiveAccordion(activeAccordion === 'guide' ? '' : 'guide')}
              >
                <span>UNSTITCHED FABRIC & TAILORING GUIDE</span>
                {activeAccordion === 'guide' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {activeAccordion === 'guide' && (
                <div className="accordion-content">
                  <p>
                    All EBA Fashion Studio ensembles are supplied as generous unstitched fabric cuts with complete embroidered patches, laces, and dupattas as designed by the couture house. Suitable for custom tailoring to any size (XS through XXL+).
                  </p>
                </div>
              )}
            </div>

            {/* Delivery & Returns */}
            <div className="accordion-tab">
              <button
                className="accordion-header"
                onClick={() => setActiveAccordion(activeAccordion === 'shipping' ? '' : 'shipping')}
              >
                <span>NATIONWIDE DELIVERY & RETURNS</span>
                {activeAccordion === 'shipping' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {activeAccordion === 'shipping' && (
                <div className="accordion-content">
                  <p>
                    Deliveries in Lahore, Karachi, and Islamabad take 2 to 3 working days. Other nationwide cities take 3 to 5 working days. Unstitched items in original packaging with intact brand tags are eligible for return or exchange within 7 days of delivery.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Share Link */}
          <div className="share-row">
            <button className="share-btn" onClick={handleShare}>
              {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
              <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Share This Ensemble'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="related-products-section">
          <div className="container">
            <div className="section-header">
              <span className="section-eyebrow">CURATED FOR YOU</span>
              <h2 className="section-title">You May Also Admire</h2>
            </div>
            <div className="products-grid">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
