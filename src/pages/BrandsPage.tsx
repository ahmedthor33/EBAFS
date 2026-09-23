import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { brandService } from '../services/brandService';
import { adminService } from '../services/adminService';
import { Brand } from '../types';
import './BrandsPage.css';

export const BrandsPage: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandsBanner, setBrandsBanner] = useState<{
    eyebrow?: string;
    title?: string;
    desc?: string;
    bgImage?: string;
  }>({
    eyebrow: 'COUTURE DIRECTORY',
    title: 'Designer Fashion Houses',
    desc: "Explore Pakistan's most revered fashion brands, each distinguished by iconic aesthetics, traditional heritage, and master craftsmanship.",
    bgImage: '',
  });

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const list = await brandService.getBrands(true);
        setBrands(list);
      } catch (err) {
        console.error('Brands fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();

    const loadBanner = async () => {
      try {
        const s = await adminService.getSiteSettings();
        if (s?.category_banners?.brands) {
          setBrandsBanner(prev => ({ ...prev, ...s.category_banners?.brands }));
        }
      } catch (e) {}
    };
    loadBanner();

    const handleUpdate = (e: any) => {
      if (e.detail?.category_banners?.brands) {
        setBrandsBanner(prev => ({ ...prev, ...e.detail.category_banners.brands }));
      }
    };
    window.addEventListener('eba_settings_updated', handleUpdate);
    return () => window.removeEventListener('eba_settings_updated', handleUpdate);
  }, []);

  return (
    <div className="brands-page">
      <section
        className="brands-header-banner"
        style={brandsBanner.bgImage ? { backgroundImage: `url(${brandsBanner.bgImage})` } : undefined}
      >
        {brandsBanner.bgImage && <div className="brands-header-overlay" />}
        <div className="container brands-header-content">
          <span className="brands-eyebrow">{brandsBanner.eyebrow || 'COUTURE DIRECTORY'}</span>
          <h1 className="brands-title">{brandsBanner.title || 'Designer Fashion Houses'}</h1>
          <p className="brands-desc">
            {brandsBanner.desc || "Explore Pakistan's most revered fashion brands, each distinguished by iconic aesthetics, traditional heritage, and master craftsmanship."}
          </p>
        </div>
      </section>

      <div className="container brands-container">
        {loading ? (
          <div className="brands-loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton skeleton-brand-card" />
            ))}
          </div>
        ) : (
          <div className="all-brands-grid">
            {brands.map((brand) => (
              <Link to={`/brand/${brand.slug}`} key={brand.id} className="brand-directory-card">
                <div className="brand-banner-wrap">
                  <img
                    src={brand.banner_url || '/assets/products/women/maria-b-1.jpg'}
                    alt={brand.name}
                    className="brand-banner-img"
                  />
                  <div className="brand-banner-overlay" />
                  {brand.is_featured && (
                    <span className="brand-featured-tag">
                      <Sparkles size={11} /> Featured House
                    </span>
                  )}
                </div>

                <div className="brand-card-content">
                  <h3 className="brand-title">{brand.name}</h3>
                  <p className="brand-summary">
                    {brand.description || 'Iconic luxury Pakistani fashion brand specializing in refined unstitched collections.'}
                  </p>
                  <span className="brand-explore-link">
                    Explore Collection <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
