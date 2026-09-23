import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { X, SlidersHorizontal, RotateCcw, ChevronRight, Check } from 'lucide-react';
import { ProductCard } from '../components/product/ProductCard';
import { productService, ProductFilters } from '../services/productService';
import { brandService } from '../services/brandService';
import { categoryService } from '../services/categoryService';
import { adminService } from '../services/adminService';
import { Product, Brand, Category } from '../types';
import './ShopPage.css';

interface ShopPageProps {
  initialGender?: 'MEN' | 'WOMEN';
}

export const ShopPage: React.FC<ShopPageProps> = ({ initialGender }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Dynamic Page Banners State
  const [categoryBanners, setCategoryBanners] = useState<any>(null);

  // Filters State
  const [selectedGender, setSelectedGender] = useState<'MEN' | 'WOMEN' | 'ALL'>(
    initialGender || (searchParams.get('gender') as any) || 'ALL'
  );
  const [selectedBrandSlug, setSelectedBrandSlug] = useState<string>(searchParams.get('brand') || '');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>(searchParams.get('category') || '');
  const [selectedFabric, setSelectedFabric] = useState<string>(searchParams.get('fabric') || '');
  const [selectedColor, setSelectedColor] = useState<string>(searchParams.get('color') || '');
  const [onlySale, setOnlySale] = useState<boolean>(searchParams.get('sale') === 'true');
  const [onlyNew, setOnlyNew] = useState<boolean>(searchParams.get('new') === 'true');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [priceRange, setPriceRange] = useState<number>(35000);
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'price-low' | 'price-high' | 'bestselling'>('featured');

  // Data & UI State
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Sync state whenever URL or initialGender props change
  useEffect(() => {
    if (initialGender) {
      setSelectedGender(initialGender);
    } else {
      const g = searchParams.get('gender') as any;
      setSelectedGender(g || 'ALL');
    }
    setSelectedBrandSlug(searchParams.get('brand') || '');
    setSelectedCategorySlug(searchParams.get('category') || '');
    setSelectedFabric(searchParams.get('fabric') || '');
    if (searchParams.get('sale') === 'true') setOnlySale(true);
    if (searchParams.get('new') === 'true') setOnlyNew(true);
  }, [initialGender, searchParams]);

  // Load Dynamic Page Banners from Site Settings
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const s = await adminService.getSiteSettings();
        if (s?.category_banners) {
          setCategoryBanners(s.category_banners);
        }
      } catch (e) {
        console.warn('Could not load category banners:', e);
      }
    };
    loadBanners();

    const handleUpdate = (e: any) => {
      if (e.detail?.category_banners) {
        setCategoryBanners(e.detail.category_banners);
      }
    };
    window.addEventListener('eba_settings_updated', handleUpdate);
    return () => window.removeEventListener('eba_settings_updated', handleUpdate);
  }, []);

  // Load Brands and Categories
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [bList, cList] = await Promise.all([
          brandService.getBrands(true),
          categoryService.getCategories(selectedGender === 'ALL' ? undefined : selectedGender),
        ]);
        setBrands(bList);
        setCategories(cList);
      } catch (err) {
        console.error('Metadata load error:', err);
      }
    };
    loadMetadata();
  }, [selectedGender]);

  // Load Products based on filters
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const filters: ProductFilters = {
          gender: selectedGender === 'ALL' ? undefined : selectedGender,
          brandSlug: selectedBrandSlug || undefined,
          categorySlug: selectedCategorySlug || undefined,
          fabric: selectedFabric || undefined,
          color: selectedColor || undefined,
          onSale: onlySale || undefined,
          isNew: onlyNew || undefined,
          inStock: inStockOnly || undefined,
          search: searchQuery || undefined,
          maxPrice: priceRange < 35000 ? priceRange : undefined,
          sortBy,
        };

        const { products: fetched } = await productService.getProducts(filters);
        setProducts(fetched);
      } catch (err) {
        console.error('Products fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [
    selectedGender,
    selectedBrandSlug,
    selectedCategorySlug,
    selectedFabric,
    selectedColor,
    onlySale,
    onlyNew,
    inStockOnly,
    searchQuery,
    priceRange,
    sortBy,
  ]);

  const fabrics = ['Lawn', 'Cotton', 'Chiffon', 'Silk', 'Wool', 'Velvet', 'Swiss Voile', 'Latha', 'Organza'];

  const resetFilters = () => {
    if (!initialGender) setSelectedGender('ALL');
    setSelectedBrandSlug('');
    setSelectedCategorySlug('');
    setSelectedFabric('');
    setSelectedColor('');
    setOnlySale(false);
    setOnlyNew(false);
    setInStockOnly(false);
    setSearchQuery('');
    setPriceRange(35000);
    setSortBy('featured');
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    (selectedGender !== 'ALL' && !initialGender) ||
    selectedBrandSlug ||
    selectedCategorySlug ||
    selectedFabric ||
    selectedColor ||
    onlySale ||
    onlyNew ||
    inStockOnly ||
    searchQuery ||
    priceRange < 35000
  );

  // Editorial banner configuration based on page context (with dynamic Site Settings overrides)
  const genderKey = initialGender || 'ALL';
  const customBanner = categoryBanners?.[genderKey.toLowerCase()];

  const defaultBanners = {
    MEN: {
      eyebrow: "GENTLEMEN'S HERITAGE ARCHIVE",
      title: "Men's Unstitched & Heirloom Shawls",
      desc: "Superfine Egyptian Giza cotton, combed royal latha, and 100% pure Australian Merino wool shawls tailored for regal Pakistani grace.",
      bgImage: "/assets/products/men/j-shawl-1.jpg",
      quickPills: [
        { label: "All Men's Wear", categorySlug: "" },
        { label: "Egyptian Cotton", categorySlug: "mens-unstitched" },
        { label: "Merino Wool Shawls", categorySlug: "mens-shawls" },
        { label: "Traditional Latha", categorySlug: "mens-unstitched" },
      ]
    },
    WOMEN: {
      eyebrow: "COUTURE & FESTIVE LAWN",
      title: "Women's Luxury Formals & Lawn",
      desc: "Bespoke 3-piece unstitched lawn with pure silk dupattas, intricate resham threadwork, hand-worked zardozi, and diaphanous festive chiffon.",
      bgImage: "/assets/products/women/maria-b-1.jpg",
      quickPills: [
        { label: "All Women's Wear", categorySlug: "" },
        { label: "Luxury Lawn Edition", categorySlug: "womens-luxury-lawn" },
        { label: "Chiffon Formals", categorySlug: "womens-festive" },
        { label: "Velvet & Winter", categorySlug: "womens-velvet" },
      ]
    },
    ALL: {
      eyebrow: "THE CURATED REPOSITORY",
      title: "All Designer Collections",
      desc: "Explore Pakistan's most revered luxury couture houses — Hussain Rehar, Maria-B, Baroque, Iznik, J., and Bin Faisal.",
      bgImage: "/assets/banners/hero-1.png",
      quickPills: [
        { label: "All Collections", categorySlug: "" },
        { label: "Women's Luxury Lawn", categorySlug: "womens-luxury-lawn" },
        { label: "Chiffon Formals", categorySlug: "womens-festive" },
        { label: "Men's Unstitched", categorySlug: "mens-unstitched" },
        { label: "Men's Shawls", categorySlug: "mens-shawls" },
      ]
    }
  };

  const currentDefault = defaultBanners[genderKey] || defaultBanners.ALL;
  const bannerConfig = {
    eyebrow: customBanner?.eyebrow || currentDefault.eyebrow,
    title: customBanner?.title || currentDefault.title,
    desc: customBanner?.desc || currentDefault.desc,
    bgImage: customBanner?.bgImage || currentDefault.bgImage,
    quickPills: currentDefault.quickPills,
  };

  return (
    <div className="shop-page">
      {/* 1. LUXURY EDITORIAL HERO BANNER */}
      <section
        className="shop-hero-banner"
        style={{ backgroundImage: `url(${bannerConfig.bgImage})` }}
      >
        <div className="shop-hero-overlay" />
        <div className="container shop-hero-container">
          <div className="shop-hero-breadcrumbs">
            <Link to="/">Home</Link>
            <ChevronRight size={12} />
            <span>Collections</span>
            <ChevronRight size={12} />
            <span className="current-crumb">
              {initialGender === 'MEN' ? "Men's Wear" : initialGender === 'WOMEN' ? "Women's Wear" : "Shop All"}
            </span>
          </div>

          <span className="shop-hero-eyebrow">{bannerConfig.eyebrow}</span>
          <h1 className="shop-hero-title">{bannerConfig.title}</h1>
          <p className="shop-hero-desc">{bannerConfig.desc}</p>
        </div>
      </section>

      {/* 2. SUB-NAVIGATION QUICK PILLS */}
      <div className="shop-pills-bar">
        <div className="container pills-container">
          <span className="pills-label">CURATED EDITIONS:</span>
          <div className="pills-scroll-track">
            {bannerConfig.quickPills.map((pill, idx) => {
              const isActive = selectedCategorySlug === pill.categorySlug;
              return (
                <button
                  key={idx}
                  className={`quick-pill-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedCategorySlug(pill.categorySlug)}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. MAIN SHOP LAYOUT */}
      <div className="container shop-body-container">
        {/* Mobile Filter Trigger Bar (Hidden on Desktop) */}
        <div className="shop-mobile-bar">
          <button
            className="mobile-filter-trigger"
            onClick={() => setMobileFilterOpen(true)}
          >
            <SlidersHorizontal size={16} />
            <span>Refine & Filter {hasActiveFilters && `(Active)`}</span>
          </button>

          <div className="mobile-sort-wrap">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="shop-select-native"
            >
              <option value="featured">Sort: Featured</option>
              <option value="newest">Sort: Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* 2-Column Desktop Grid Layout */}
        <div className="shop-content-layout">
          {/* Mobile Drawer Backdrop */}
          {mobileFilterOpen && (
            <div
              className="shop-drawer-backdrop"
              onClick={() => setMobileFilterOpen(false)}
            />
          )}

          {/* Left Sidebar Filter */}
          <aside className={`shop-sidebar ${mobileFilterOpen ? 'drawer-active' : ''}`}>
            <div className="sidebar-drawer-header">
              <span className="drawer-title">FILTERS & SPECIFICATIONS</span>
              <button
                className="drawer-close-btn"
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div className="active-filters-panel">
                <div className="active-filters-header">
                  <span>ACTIVE FILTERS</span>
                  <button onClick={resetFilters} className="reset-link-btn">
                    <RotateCcw size={11} /> Reset All
                  </button>
                </div>
                <div className="chips-flex">
                  {selectedBrandSlug && (
                    <span className="active-chip">
                      Brand: {brands.find(b => b.slug === selectedBrandSlug)?.name || selectedBrandSlug}
                      <X size={12} onClick={() => setSelectedBrandSlug('')} />
                    </span>
                  )}
                  {selectedCategorySlug && (
                    <span className="active-chip">
                      {categories.find(c => c.slug === selectedCategorySlug)?.name || selectedCategorySlug}
                      <X size={12} onClick={() => setSelectedCategorySlug('')} />
                    </span>
                  )}
                  {selectedFabric && (
                    <span className="active-chip">
                      Fabric: {selectedFabric}
                      <X size={12} onClick={() => setSelectedFabric('')} />
                    </span>
                  )}
                  {onlySale && (
                    <span className="active-chip">
                      Sale Only <X size={12} onClick={() => setOnlySale(false)} />
                    </span>
                  )}
                  {onlyNew && (
                    <span className="active-chip">
                      New Arrivals <X size={12} onClick={() => setOnlyNew(false)} />
                    </span>
                  )}
                  {inStockOnly && (
                    <span className="active-chip">
                      In Stock <X size={12} onClick={() => setInStockOnly(false)} />
                    </span>
                  )}
                  {priceRange < 35000 && (
                    <span className="active-chip">
                      Under PKR {priceRange.toLocaleString()} <X size={12} onClick={() => setPriceRange(35000)} />
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Gender / Collection Switcher (Only on Shop All page) */}
            {!initialGender && (
              <div className="filter-block">
                <h4 className="filter-title">COLLECTION</h4>
                <div className="filter-radios-list">
                  {[
                    { label: 'All Designer Ensembles', val: 'ALL' },
                    { label: "Men's Collection", val: 'MEN' },
                    { label: "Women's Collection", val: 'WOMEN' },
                  ].map((g) => (
                    <label key={g.val} className="radio-label-row">
                      <input
                        type="radio"
                        name="collection-gender"
                        checked={selectedGender === g.val}
                        onChange={() => setSelectedGender(g.val as any)}
                      />
                      <span className="radio-custom" />
                      <span className="radio-text">{g.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="filter-block">
                <h4 className="filter-title">CATEGORY</h4>
                <div className="filter-link-list">
                  <button
                    className={`filter-link-btn ${selectedCategorySlug === '' ? 'is-active' : ''}`}
                    onClick={() => setSelectedCategorySlug('')}
                  >
                    <span>All Categories</span>
                    {selectedCategorySlug === '' && <Check size={14} className="gold-check" />}
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      className={`filter-link-btn ${selectedCategorySlug === c.slug ? 'is-active' : ''}`}
                      onClick={() => setSelectedCategorySlug(c.slug)}
                    >
                      <span>{c.name}</span>
                      {selectedCategorySlug === c.slug && <Check size={14} className="gold-check" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Designer Brand Filter */}
            <div className="filter-block">
              <h4 className="filter-title">DESIGNER COUTURE HOUSE</h4>
              <div className="filter-link-list scrollable">
                <button
                  className={`filter-link-btn ${selectedBrandSlug === '' ? 'is-active' : ''}`}
                  onClick={() => setSelectedBrandSlug('')}
                >
                  <span>All Designer Brands</span>
                  {selectedBrandSlug === '' && <Check size={14} className="gold-check" />}
                </button>
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    className={`filter-link-btn ${selectedBrandSlug === brand.slug ? 'is-active' : ''}`}
                    onClick={() => setSelectedBrandSlug(brand.slug)}
                  >
                    <span>{brand.name}</span>
                    {selectedBrandSlug === brand.slug && <Check size={14} className="gold-check" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Fabric Composition Filter */}
            <div className="filter-block">
              <h4 className="filter-title">FABRIC COMPOSITION</h4>
              <div className="fabric-chips-grid">
                {fabrics.map((fabric) => {
                  const isSelected = selectedFabric.toLowerCase() === fabric.toLowerCase();
                  return (
                    <button
                      key={fabric}
                      className={`fabric-chip-btn ${isSelected ? 'is-active' : ''}`}
                      onClick={() => setSelectedFabric(isSelected ? '' : fabric)}
                    >
                      {fabric}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Filter */}
            <div className="filter-block">
              <div className="price-label-row">
                <h4 className="filter-title">PRICE CAP (PKR)</h4>
                <span className="price-current">₨ {priceRange.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="5000"
                max="35000"
                step="1000"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="luxury-slider"
              />
              <div className="price-minmax">
                <span>PKR 5,000</span>
                <span>PKR 35,000</span>
              </div>
            </div>

            {/* Special Edition Toggles */}
            <div className="filter-block">
              <h4 className="filter-title">SPECIAL PREFERENCES</h4>
              <div className="checkboxes-stack">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={onlySale}
                    onChange={(e) => setOnlySale(e.target.checked)}
                  />
                  <span>Curated Sale Editions</span>
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={onlyNew}
                    onChange={(e) => setOnlyNew(e.target.checked)}
                  />
                  <span>New Seasonal Launches</span>
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                  />
                  <span>In Stock Only</span>
                </label>
              </div>
            </div>

            {/* Mobile Apply Footer */}
            <div className="drawer-footer-mobile">
              <button
                className="btn btn-primary btn-full"
                onClick={() => setMobileFilterOpen(false)}
              >
                View {products.length} Ensembles
              </button>
            </div>
          </aside>

          {/* Right Product Grid Area */}
          <main className="shop-products-main">
            {/* Desktop Toolbar */}
            <div className="shop-desktop-toolbar">
              <div className="toolbar-count">
                Showing <span className="count-number">{products.length}</span> Designer Ensembles
              </div>

              <div className="toolbar-sort">
                <span className="sort-title">SORT BY:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="luxury-sort-select"
                >
                  <option value="featured">Featured Curations</option>
                  <option value="newest">Newest Seasonal Arrivals</option>
                  <option value="bestselling">Bestselling Classics</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Grid or Skeleton or Empty State */}
            {loading ? (
              <div className="shop-cards-grid">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="luxury-skeleton-card">
                    <div className="skeleton-box img" />
                    <div className="skeleton-box line short" />
                    <div className="skeleton-box line title" />
                    <div className="skeleton-box line price" />
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="shop-cards-grid">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="shop-empty-state">
                <div className="empty-ornament">⚜</div>
                <h3 className="empty-heading">No Designer Ensembles Found</h3>
                <p className="empty-sub">
                  No products matched your exact filter combination. Clear your filters or explore other luxury categories.
                </p>
                <button onClick={resetFilters} className="btn btn-primary">
                  Clear All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
