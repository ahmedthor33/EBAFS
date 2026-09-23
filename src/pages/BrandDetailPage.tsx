import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { brandService } from '../services/brandService';
import { productService } from '../services/productService';
import { Brand, Product } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import './BrandsPage.css';

export const BrandDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrandData = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const found = await brandService.getBrandBySlug(slug);
        setBrand(found);

        if (found) {
          const { products: prods } = await productService.getProducts({ brandSlug: found.slug, limit: 30 });
          setProducts(prods);
        }
      } catch (err) {
        console.error('Brand detail error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrandData();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '60px 0' }}>
        <div className="skeleton" style={{ height: '280px', marginBottom: '40px' }} />
        <div className="skeleton" style={{ height: '30px', width: '200px', marginBottom: '20px' }} />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="container empty-state">
        <h3 className="empty-state-title">Brand Not Found</h3>
        <p className="empty-state-desc">The requested designer brand could not be located.</p>
        <Link to="/brands" className="btn btn-primary">Return to Brands</Link>
      </div>
    );
  }

  return (
    <div className="brand-detail-page">
      {/* Brand Hero Banner */}
      <section
        className="brand-hero-banner"
        style={{
          backgroundImage: `url(${brand.banner_url || '/assets/banners/hero-1.png'})`,
        }}
      >
        <div className="brand-hero-overlay" />
        <div className="container brand-hero-content">
          <span className="brand-hero-eyebrow">COUTURE SPOTLIGHT</span>
          <h1 className="brand-hero-title">{brand.name}</h1>
          <p className="brand-hero-bio">{brand.description}</p>
        </div>
      </section>

      {/* Brand Catalog */}
      <div className="container brand-catalog-container">
        <div className="brand-catalog-header">
          <h2>The {brand.name} Collection ({products.length})</h2>
          <p>Unstitched luxury creations by {brand.name}.</p>
        </div>

        {products.length > 0 ? (
          <div className="shop-products-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h4 className="empty-state-title">No Ensembles Listed Yet</h4>
            <p className="empty-state-desc">New seasonal collections from {brand.name} will arrive shortly.</p>
            <Link to="/shop" className="btn btn-primary">Browse All Collections</Link>
          </div>
        )}
      </div>
    </div>
  );
};
