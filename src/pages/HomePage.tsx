import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import { ProductCard } from '../components/product/ProductCard';
import { productService } from '../services/productService';
import { adminService } from '../services/adminService';
import { Product } from '../types';
import './HomePage.css';

const defaultHeroSlides = [
  {
    id: 1,
    eyebrow: 'COUTURE FORMALS & LAWN',
    title: 'Women’s Luxury Festive',
    subtitle: 'Intricate resham embroideries, pure silk dupattas, and handcrafted embellishments.',
    btnMen: 'VIEW SALE',
    btnWomen: 'SHOP WOMEN',
    linkMen: '/shop?sale=true',
    linkWomen: '/women',
    bgImage: 'https://pybegueviocyeptgaxyk.supabase.co/storage/v1/object/public/product-images/banners/1790158251618_f0h8c7_change_dimenssion_2k_20260922225213.jpeg',
  },
  {
    id: 2,
    eyebrow: 'ARISTOCRATIC HERITAGE',
    title: 'Men’s Premium Quality Winter Shawls',
    subtitle: 'Superfine Egyptian cotton, royal latha, and 100% Australian Merino wool shawls.',
    btnMen: 'EXPLORE MEN',
    btnWomen: 'VIEW ALL BRANDS',
    linkMen: '/men',
    linkWomen: '/brands',
    bgImage: '/assets/products/men/j-shawl-1.jpg',
  },
];

const defaultPromoBanner = {
  eyebrow: 'ARTISANAL HERITAGE',
  title: 'The Essence of Pakistani Craftsmanship',
  paragraph: 'Every thread in our curated unstitched collections tells a story of centuries-old eastern textile mastery. From intricate tilla work to gossamer pure silk dupattas and hand-twisted merino wool shawls, EBA Fashion Studio celebrates uncompromised luxury.',
  image: '/assets/products/women/baroque-1.jpg',
  btnText: 'Discover Our Story',
  btnLink: '/about',
};

const defaultCollectionBanners = {
  men_image: '/assets/products/men/bin-faisal-1.jpg',
  women_image: '/assets/products/women/hussain-rehar-1.jpg',
};

export const HomePage: React.FC = () => {
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState(defaultHeroSlides);
  const [promoBanner, setPromoBanner] = useState(defaultPromoBanner);
  const [collectionBanners, setCollectionBanners] = useState(defaultCollectionBanners);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [menProducts, setMenProducts] = useState<Product[]>([]);
  const [womenProducts, setWomenProducts] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Load dynamic hero banners & promo banner from settings
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const s = await adminService.getSiteSettings();
        if (s?.hero_banners && Array.isArray(s.hero_banners) && s.hero_banners.length > 0) {
          const cleanBanners = s.hero_banners.filter((b: any) =>
            !b.bgImage?.includes('hero-1.png') &&
            !b.title?.toLowerCase().includes('eba fashion studio')
          );
          setHeroSlides(cleanBanners.length >= 2 ? (cleanBanners as any) : defaultHeroSlides);
        } else {
          setHeroSlides(defaultHeroSlides);
        }
        if (s?.promo_banner) {
          setPromoBanner({ ...defaultPromoBanner, ...s.promo_banner });
        }
        if (s?.collection_banners) {
          setCollectionBanners({ ...defaultCollectionBanners, ...s.collection_banners });
        }
      } catch (err) {
        console.warn('Hero banners dynamic load fallback:', err);
      }
    };
    loadBanners();

    const handleUpdate = (e: any) => {
      if (e.detail?.hero_banners && Array.isArray(e.detail.hero_banners) && e.detail.hero_banners.length > 0) {
        const cleanBanners = e.detail.hero_banners.filter((b: any) =>
          !b.bgImage?.includes('hero-1.png') &&
          !b.title?.toLowerCase().includes('eba fashion studio')
        );
        setHeroSlides(cleanBanners.length >= 2 ? cleanBanners : defaultHeroSlides);
      }
      if (e.detail?.promo_banner) {
        setPromoBanner({ ...defaultPromoBanner, ...e.detail.promo_banner });
      }
      if (e.detail?.collection_banners) {
        setCollectionBanners({ ...defaultCollectionBanners, ...e.detail.collection_banners });
      }
    };
    window.addEventListener('eba_settings_updated', handleUpdate);
    return () => window.removeEventListener('eba_settings_updated', handleUpdate);
  }, []);

  // Auto-advance hero slides
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [arrivals, men, women, best, sale] = await Promise.all([
          productService.getNewArrivals(4),
          productService.getProducts({ gender: 'MEN', limit: 4 }),
          productService.getProducts({ gender: 'WOMEN', limit: 4 }),
          productService.getBestsellers(4),
          productService.getSaleProducts(4),
        ]);

        setNewArrivals(arrivals);
        setMenProducts(men.products);
        setWomenProducts(women.products);
        setBestsellers(best);
        setSaleProducts(sale);
      } catch (err) {
        console.error('Home data load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  return (
    <div className="home-page">
      {/* 1. EDITORIAL HERO SLIDER */}
      <section className="hero-slider-section">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`hero-slide ${index === heroSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.bgImage})` }}
          >
            <div className="hero-overlay" />
            <div className="container hero-container">
              <div className="hero-content">
                <span className="hero-eyebrow">{slide.eyebrow}</span>
                <h1 className="hero-title">{slide.title}</h1>
                <p className="hero-subtitle">{slide.subtitle}</p>
                <div className="hero-button-group">
                  <Link to={slide.linkMen} className="btn btn-gold btn-lg">
                    {slide.btnMen}
                  </Link>
                  <Link to={slide.linkWomen} className="btn btn-secondary hero-btn-secondary btn-lg">
                    {slide.btnWomen}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Hero Slide Navigation Controls */}
        <div className="hero-nav-controls">
          <button
            className="hero-arrow-btn"
            onClick={() => setHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="hero-dots">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                className={`hero-dot ${i === heroSlide ? 'active' : ''}`}
                onClick={() => setHeroSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            className="hero-arrow-btn"
            onClick={() => setHeroSlide((prev) => (prev + 1) % heroSlides.length)}
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* 2. SHOP BY COLLECTION: MEN & WOMEN */}
      <section className="collections-split-section">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">CURATED EDITORIALS</span>
            <h2 className="section-title">Shop By Collection</h2>
            <p className="section-subtitle">
              Distinguished Pakistani fashion tailored for modern sophistication.
            </p>
          </div>

          <div className="collections-grid">
            {/* Men's Card */}
            <div className="collection-card">
              <div className="collection-image-wrap">
                <img
                  src={collectionBanners.men_image || "/assets/products/men/bin-faisal-1.jpg"}
                  alt="Men's Unstitched Collection"
                  className="collection-img"
                />
                <div className="collection-overlay" />
              </div>
              <div className="collection-info">
                <span className="collection-tag">GENTLEMEN'S WARDROBE</span>
                <h3 className="collection-heading">MEN'S UNSTITCHED</h3>
                <p className="collection-desc">
                  Superfine Giza cotton, traditional royal latha, and handcrafted 100% pure Australian Merino wool shawls.
                </p>
                <Link to="/men" className="btn btn-primary">
                  <span>Explore Men</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Women's Card */}
            <div className="collection-card">
              <div className="collection-image-wrap">
                <img
                  src={collectionBanners.women_image || "/assets/products/women/hussain-rehar-1.jpg"}
                  alt="Women's Luxury Collection"
                  className="collection-img"
                />
                <div className="collection-overlay" />
              </div>
              <div className="collection-info">
                <span className="collection-tag">COUTURE & LAWN</span>
                <h3 className="collection-heading">WOMEN'S LUXURY</h3>
                <p className="collection-desc">
                  Designer unstitched lawn, festive organza, crinkle chiffon formals, and bridal couture ensembles.
                </p>
                <Link to="/women" className="btn btn-primary">
                  <span>Explore Women</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. NEW ARRIVALS */}
      <section className="product-showcase-section">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">JUST ARRIVED</span>
            <h2 className="section-title">New Arrivals</h2>
            <p className="section-subtitle">
              The latest seasonal releases from premier Pakistani fashion houses.
            </p>
          </div>

          <div className="products-grid">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="showcase-cta-wrap">
            <Link to="/shop?new=true" className="btn btn-secondary">
              View All New Arrivals
            </Link>
          </div>
        </div>
      </section>

      {/* 5. EDITORIAL PROMOTIONAL BANNER */}
      <section className="editorial-promo-section">
        <div className="container promo-inner">
          <div className="promo-text-column">
            <span className="promo-eyebrow">{promoBanner.eyebrow}</span>
            <h2 className="promo-title">{promoBanner.title}</h2>
            <p className="promo-paragraph">
              {promoBanner.paragraph}
            </p>
            <div className="promo-stats-row">
              <div className="promo-stat">
                <span className="stat-number">100%</span>
                <span className="stat-label">Authentic Original Brands</span>
              </div>
              <div className="promo-stat">
                <span className="stat-number">Nationwide</span>
                <span className="stat-label">Express Delivery</span>
              </div>
              <div className="promo-stat">
                <span className="stat-number">Bespoke</span>
                <span className="stat-label">Unstitched Fabrics</span>
              </div>
            </div>
            <Link to={promoBanner.btnLink || '/about'} className="btn btn-gold">
              {promoBanner.btnText || 'Discover Our Story'}
            </Link>
          </div>
          <div className="promo-image-column">
            <img
              src={promoBanner.image || '/assets/products/women/baroque-1.jpg'}
              alt={promoBanner.title || 'Artisanal Pakistani Fashion'}
              className="promo-image"
            />
          </div>
        </div>
      </section>

      {/* 6. MEN'S COLLECTION SPOTLIGHT */}
      {menProducts.length > 0 && (
        <section className="product-showcase-section bg-warm">
          <div className="container">
            <div className="section-header">
              <span className="section-eyebrow">FOR GENTLEMEN</span>
              <h2 className="section-title">Men's Unstitched & Shawls</h2>
              <p className="section-subtitle">
                Pure Giza cotton fabrics and heirloom Australian wool shawls.
              </p>
            </div>

            <div className="products-grid">
              {menProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="showcase-cta-wrap">
              <Link to="/men" className="btn btn-primary">
                Browse Men's Collection
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 7. WOMEN'S COLLECTION SPOTLIGHT */}
      <section className="product-showcase-section">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">FOR WOMEN</span>
            <h2 className="section-title">Women's Designer Ensembles</h2>
            <p className="section-subtitle">
              Bespoke luxury lawn, chiffons, and formal wedding wear.
            </p>
          </div>

          <div className="products-grid">
            {womenProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="showcase-cta-wrap">
            <Link to="/women" className="btn btn-primary">
              Browse Women's Collection
            </Link>
          </div>
        </div>
      </section>

      {/* 8. BEST SELLERS */}
      {bestsellers.length > 0 && (
        <section className="product-showcase-section bg-warm">
          <div className="container">
            <div className="section-header">
              <span className="section-eyebrow">MOST COVETED</span>
              <h2 className="section-title">Best Sellers</h2>
              <p className="section-subtitle">
                The most sought-after designer pieces of the season.
              </p>
            </div>

            <div className="products-grid">
              {bestsellers.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 9. SALE COLLECTION */}
      {saleProducts.length > 0 && (
        <section className="product-showcase-section">
          <div className="container">
            <div className="section-header">
              <span className="section-eyebrow">SPECIAL PRIVILEGES</span>
              <h2 className="section-title">Curated Sale</h2>
              <p className="section-subtitle">
                Limited-edition designer pieces at exclusive promotional pricing.
              </p>
            </div>

            <div className="products-grid">
              {saleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="showcase-cta-wrap">
              <Link to="/shop?sale=true" className="btn btn-primary">
                Explore All Sale Pieces
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 10. WHY EBA FASHION STUDIO */}
      <section className="why-eba-section">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">THE EBA STANDARD</span>
            <h2 className="section-title">Why EBA Fashion Studio</h2>
            <p className="section-subtitle">
              Redefining luxury shopping with transparency, trust, and distinction.
            </p>
          </div>

          <div className="why-grid">
            <div className="why-card">
              <div className="why-icon-wrap">
                <Sparkles size={24} />
              </div>
              <h4 className="why-title">100% Authentic Originals</h4>
              <p className="why-desc">
                We source directly from Pakistani designers. Guaranteed authentic fabrics, collars, motifs, and brand tags.
              </p>
            </div>

            <div className="why-card">
              <div className="why-icon-wrap">
                <ShieldCheck size={24} />
              </div>
              <h4 className="why-title">Curated Designer Brands</h4>
              <p className="why-desc">
                Carefully selected collections from Hussain Rehar, Maria-B, Baroque, Iznik, J., and Bin Faisal.
              </p>
            </div>

            <div className="why-card">
              <div className="why-icon-wrap">
                <Truck size={24} />
              </div>
              <h4 className="why-title">Reliable Tracked Delivery</h4>
              <p className="why-desc">
                Fast nationwide dispatch with real-time tracking across Punjab, Sindh, KPK, Balochistan, and Islamabad.
              </p>
            </div>

            <div className="why-card">
              <div className="why-icon-wrap">
                <RefreshCw size={24} />
              </div>
              <h4 className="why-title">Premium Customer Care</h4>
              <p className="why-desc">
                Personalized WhatsApp concierge assistance for fabric queries, unstitched suit lengths, and orders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. SOCIAL MEDIA GALLERY */}
      <section className="social-showcase-section">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">@EBAFASHIONSTUDIO</span>
            <h2 className="section-title">Follow The Studio</h2>
            <p className="section-subtitle">
              Join our community of discerning fashion patrons on Instagram.
            </p>
          </div>

          <div className="social-grid">
            <a href="https://instagram.com/ebafashionstudio" target="_blank" rel="noreferrer" className="social-item">
              <img src="/assets/products/women/hussain-rehar-1.jpg" alt="Instagram 1" />
              <div className="social-hover">
                <span>View on Instagram</span>
              </div>
            </a>
            <a href="https://instagram.com/ebafashionstudio" target="_blank" rel="noreferrer" className="social-item">
              <img src="/assets/products/men/j-shawl-1.jpg" alt="Instagram 2" />
              <div className="social-hover">
                <span>View on Instagram</span>
              </div>
            </a>
            <a href="https://instagram.com/ebafashionstudio" target="_blank" rel="noreferrer" className="social-item">
              <img src="/assets/products/women/maria-b-1.jpg" alt="Instagram 3" />
              <div className="social-hover">
                <span>View on Instagram</span>
              </div>
            </a>
            <a href="https://instagram.com/ebafashionstudio" target="_blank" rel="noreferrer" className="social-item">
              <img src="/assets/products/men/bin-faisal-1.jpg" alt="Instagram 4" />
              <div className="social-hover">
                <span>View on Instagram</span>
              </div>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
