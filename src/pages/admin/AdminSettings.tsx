import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Settings,
  Save,
  UploadCloud,
  Plus,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  X,
  ExternalLink,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { storageService } from '../../services/storageService';
import { SiteSettings } from '../../types';
import './AdminBrands.css';

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

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Form Fields
  const [storeName, setStoreName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [currency, setCurrency] = useState('PKR');

  // Hero Banners Slider State
  const [heroBanners, setHeroBanners] = useState<any[]>(defaultHeroSlides);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const slideFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // Editorial Promo Banner State
  const [promoBanner, setPromoBanner] = useState({
    eyebrow: 'ARTISANAL HERITAGE',
    title: 'The Essence of Pakistani Craftsmanship',
    paragraph: 'Every thread in our curated unstitched collections tells a story of centuries-old eastern textile mastery. From intricate tilla work to gossamer pure silk dupattas and hand-twisted merino wool shawls, EBA Fashion Studio celebrates uncompromised luxury.',
    image: '/assets/products/women/baroque-1.jpg',
    btnText: 'Discover Our Story',
    btnLink: '/about',
  });
  const [uploadingPromo, setUploadingPromo] = useState(false);
  const [promoDragOver, setPromoDragOver] = useState(false);
  const promoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Homepage Shop By Collection Cards (Men's Unstitched & Women's Luxury)
  const [collectionBanners, setCollectionBanners] = useState({
    men_image: '/assets/products/men/bin-faisal-1.jpg',
    women_image: '/assets/products/women/hussain-rehar-1.jpg',
  });
  const [uploadingColl, setUploadingColl] = useState<'men' | 'women' | null>(null);
  const [collDragOver, setCollDragOver] = useState<'men' | 'women' | null>(null);
  const collFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Category & Shop Page Banners State (Men, Women, Shop All, Brands Directory)
  const categoryTabs = [
    { key: 'men' as const, label: "Men's Wear", route: '/men', icon: '👔' },
    { key: 'women' as const, label: "Women's Wear", route: '/women', icon: '👗' },
    { key: 'all' as const, label: "Shop All Collections", route: '/shop', icon: '🛍️' },
    { key: 'brands' as const, label: "Brands Directory", route: '/brands', icon: '🏷️' },
  ];

  interface CategoryBannerItem {
    eyebrow?: string;
    title?: string;
    desc?: string;
    bgImage?: string;
  }

  interface CategoryBannersMap {
    men: CategoryBannerItem;
    women: CategoryBannerItem;
    all: CategoryBannerItem;
    brands: CategoryBannerItem;
  }

  const [categoryBanners, setCategoryBanners] = useState<CategoryBannersMap>({
    men: {
      eyebrow: "GENTLEMEN'S HERITAGE ARCHIVE",
      title: "Men's Unstitched & Heirloom Shawls",
      desc: "Superfine Egyptian Giza cotton, combed royal latha, and 100% pure Australian Merino wool shawls tailored for regal Pakistani grace.",
      bgImage: "/assets/products/men/j-shawl-1.jpg",
    },
    women: {
      eyebrow: "COUTURE & FESTIVE LAWN",
      title: "Women's Luxury Formals & Lawn",
      desc: "Bespoke 3-piece unstitched lawn with pure silk dupattas, intricate resham threadwork, hand-worked zardozi, and diaphanous festive chiffon.",
      bgImage: "/assets/products/women/maria-b-1.jpg",
    },
    all: {
      eyebrow: "THE CURATED REPOSITORY",
      title: "All Designer Collections",
      desc: "Explore Pakistan's most revered luxury couture houses — Hussain Rehar, Maria-B, Baroque, Iznik, J., and Bin Faisal.",
      bgImage: "/assets/banners/hero-1.png",
    },
    brands: {
      eyebrow: "COUTURE DIRECTORY",
      title: "Designer Fashion Houses",
      desc: "Explore Pakistan's most revered fashion brands, each distinguished by iconic aesthetics, traditional heritage, and master craftsmanship.",
      bgImage: "/assets/banners/hero-1.png",
    },
  });

  const [activeCategoryTab, setActiveCategoryTab] = useState<'men' | 'women' | 'all' | 'brands'>('men');
  const [uploadingCategoryBanner, setUploadingCategoryBanner] = useState<string | null>(null);
  const [catDragOver, setCatDragOver] = useState<string | null>(null);
  const catFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const s = await adminService.getSiteSettings();
        setSettings(s);
        setStoreName(s.store_name);
        setContactEmail(s.contact_email);
        setContactPhone(s.contact_phone);
        setWhatsappNumber(s.whatsapp_number);
        setAnnouncementText(s.announcement_text || '');
        setInstagramUrl(s.instagram_url || '');
        setFacebookUrl(s.facebook_url || '');
        setTiktokUrl(s.tiktok_url || '');
        setCurrency(s.currency);
        if (s.hero_banners && Array.isArray(s.hero_banners) && s.hero_banners.length > 0) {
          const cleanBanners = s.hero_banners.filter((b: any) =>
            !b.bgImage?.includes('hero-1.png') &&
            !b.title?.toLowerCase().includes('eba fashion studio')
          );
          setHeroBanners(cleanBanners.length >= 2 ? cleanBanners : defaultHeroSlides);
        }
        if (s.promo_banner) {
          setPromoBanner((prev) => ({ ...prev, ...s.promo_banner }));
        }
        if (s.collection_banners) {
          setCollectionBanners((prev) => ({ ...prev, ...s.collection_banners }));
        }
        if (s.category_banners) {
          setCategoryBanners((prev) => ({
            men: { ...prev.men, ...(s.category_banners?.men || {}) },
            women: { ...prev.women, ...(s.category_banners?.women || {}) },
            all: { ...prev.all, ...(s.category_banners?.all || {}) },
            brands: { ...prev.brands, ...(s.category_banners?.brands || {}) },
          }));
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSlideImageUpload = async (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingIndex(index);
    try {
      const res = await storageService.uploadProductImage(files[0], 'banners');
      if (res.url) {
        const updated = [...heroBanners];
        updated[index] = { ...updated[index], bgImage: res.url };
        setHeroBanners(updated);
        setActionMsg('Banner photography attached to slide.');
        setTimeout(() => setActionMsg(''), 4000);
      } else if (res.error) {
        setActionMsg(`Notice: ${res.error}`);
        setTimeout(() => setActionMsg(''), 5000);
      }
    } catch (err: any) {
      console.warn('Slide upload notice:', err);
      setActionMsg(`Notice: ${err?.message || 'Failed to upload banner image.'}`);
      setTimeout(() => setActionMsg(''), 5000);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleAddSlide = () => {
    setHeroBanners(prev => [
      ...prev,
      {
        id: Date.now(),
        eyebrow: 'NEW LUXURY SEASON',
        title: 'Seasonal Festive Edition',
        subtitle: 'Exclusive handcrafted Pakistani designer textiles.',
        btnMen: 'SHOP MEN',
        btnWomen: 'SHOP WOMEN',
        linkMen: '/men',
        linkWomen: '/women',
        bgImage: '/assets/banners/hero-1.png',
      },
    ]);
  };

  const handleRemoveSlide = (index: number) => {
    if (heroBanners.length <= 1) {
      setActionMsg('Notice: At least one hero banner slide is required.');
      setTimeout(() => setActionMsg(''), 4000);
      return;
    }
    setHeroBanners(prev => prev.filter((_, i) => i !== index));
  };

  const handleSlideChange = (index: number, field: string, value: string) => {
    const updated = [...heroBanners];
    updated[index] = { ...updated[index], [field]: value };
    setHeroBanners(updated);
  };

  const handlePromoImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingPromo(true);
    try {
      const res = await storageService.uploadProductImage(files[0], 'banners');
      if (res.url) {
        setPromoBanner(prev => ({ ...prev, image: res.url }));
        setActionMsg('Story banner photography attached.');
        setTimeout(() => setActionMsg(''), 4000);
      } else if (res.error) {
        setActionMsg(`Notice: ${res.error}`);
        setTimeout(() => setActionMsg(''), 5000);
      }
    } catch (err: any) {
      console.warn('Promo banner upload notice:', err);
      setActionMsg(`Notice: ${err?.message || 'Failed to upload promotional banner.'}`);
      setTimeout(() => setActionMsg(''), 5000);
    } finally {
      setUploadingPromo(false);
    }
  };

  const handleCollectionImageUpload = async (key: 'men' | 'women', files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingColl(key);
    try {
      const res = await storageService.uploadProductImage(files[0], 'banners');
      if (res?.url) {
        setCollectionBanners(prev => ({
          ...prev,
          [`${key}_image`]: res.url,
        }));
        setActionMsg(`${key === 'men' ? "Men's" : "Women's"} collection card image updated.`);
        setTimeout(() => setActionMsg(''), 4000);
      } else if (res.error) {
        setActionMsg(`Notice: ${res.error}`);
        setTimeout(() => setActionMsg(''), 5000);
      }
    } catch (err: any) {
      console.warn('Collection image upload notice:', err);
      setActionMsg(`Notice: ${err?.message || 'Failed to upload image.'}`);
      setTimeout(() => setActionMsg(''), 5000);
    } finally {
      setUploadingColl(null);
    }
  };

  const handleCategoryBannerUpload = async (catKey: 'men' | 'women' | 'all' | 'brands', files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingCategoryBanner(catKey);
    try {
      const res = await storageService.uploadProductImage(files[0], 'banners');
      if (res.url) {
        setCategoryBanners(prev => ({
          ...prev,
          [catKey]: {
            ...prev[catKey],
            bgImage: res.url,
          }
        }));
        setActionMsg(`${catKey.toUpperCase()} banner photography attached.`);
        setTimeout(() => setActionMsg(''), 4000);
      } else if (res.error) {
        setActionMsg(`Notice: ${res.error}`);
        setTimeout(() => setActionMsg(''), 5000);
      }
    } catch (err: any) {
      console.warn('Category banner upload notice:', err);
      setActionMsg(`Notice: ${err?.message || 'Failed to upload banner image.'}`);
      setTimeout(() => setActionMsg(''), 5000);
    } finally {
      setUploadingCategoryBanner(null);
    }
  };

  const handleCategoryFieldChange = (catKey: 'men' | 'women' | 'all' | 'brands', field: string, value: string) => {
    setCategoryBanners(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        [field]: value,
      }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await adminService.updateSiteSettings({
        store_name: storeName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        whatsapp_number: whatsappNumber.trim(),
        announcement_text: announcementText.trim(),
        instagram_url: instagramUrl.trim(),
        facebook_url: facebookUrl.trim(),
        tiktok_url: tiktokUrl.trim(),
        hero_banners: heroBanners,
        promo_banner: promoBanner,
        collection_banners: collectionBanners,
        category_banners: categoryBanners,
        currency,
      });

      setActionMsg('Website settings & Page banners deployed successfully.');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setActionMsg(`Notice: ${err.message || 'Settings saved locally.'}`);
      setTimeout(() => setActionMsg(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '40px' }}>Loading studio configuration...</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-heading">Store Configuration & Content</h1>
          <p className="admin-page-sub">
            Customize announcements, WhatsApp concierge, corporate contact details, and homepage hero banners.
          </p>
        </div>
      </div>

      {actionMsg && (
        <div className="admin-action-alert success">
          <CheckCircle2 size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="admin-settings-form" style={{ maxWidth: '840px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Brand & Store Identity */}
        <div className="admin-form-section" style={{ margin: 0 }}>
          <h3 className="section-title">Brand Identity</h3>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Store Brand Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Operating Currency</label>
              <input
                type="text"
                value={currency}
                disabled
                className="form-input disabled"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Header Announcement Banner Text</label>
            <textarea
              rows={2}
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              className="form-textarea"
            />
          </div>
        </div>

        {/* Homepage Hero Banner Slider Section */}
        <div className="admin-form-section" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--color-gold-dark)" />
                Homepage Hero Banner Slider
              </h3>
              <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
                Drag and drop high-resolution editorial photography, customize headlines, subtext, and call-to-action buttons.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddSlide}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> Add Slide
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {heroBanners.map((slide, idx) => (
              <div
                key={slide.id || idx}
                style={{
                  border: '1px solid #e5e0d8',
                  borderRadius: '8px',
                  background: '#faf9f6',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Slide Top Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-black-deep)' }}>
                    Slide #{idx + 1}: {slide.title || 'Untitled Banner'}
                  </span>

                  {heroBanners.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlide(idx)}
                      className="brand-image-remove-btn"
                      title="Remove this slide"
                    >
                      <Trash2 size={13} /> Remove Slide
                    </button>
                  )}
                </div>

                {/* Drag and Drop Background Image Area */}
                <div>
                  <label className="form-label">Hero Background Image (Photography)</label>

                  {slide.bgImage ? (
                    <div className="brand-image-preview-card" style={{ background: '#fff' }}>
                      <img
                        src={slide.bgImage}
                        alt={`Slide ${idx + 1} Background`}
                        className="brand-image-preview-thumb"
                        style={{ width: '110px', height: '65px' }}
                      />
                      <div className="brand-image-preview-meta">
                        <div className="brand-image-preview-title">Background Image Active</div>
                        <div className="brand-image-preview-sub">{slide.bgImage}</div>
                      </div>
                      <button
                        type="button"
                        className="brand-image-remove-btn"
                        onClick={() => handleSlideChange(idx, 'bgImage', '')}
                      >
                        <X size={14} /> Change Image
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`brand-dropzone ${dragOverIndex === idx ? 'drag-over' : ''} ${uploadingIndex === idx ? 'uploading' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIndex(idx);
                      }}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverIndex(null);
                        handleSlideImageUpload(idx, e.dataTransfer.files);
                      }}
                      onClick={() => slideFileInputRefs.current[idx]?.click()}
                      style={{ padding: '24px 16px' }}
                    >
                      <input
                        ref={(el) => { slideFileInputRefs.current[idx] = el; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        style={{ display: 'none' }}
                        onChange={(e) => handleSlideImageUpload(idx, e.target.files)}
                      />

                      {uploadingIndex === idx ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-gold-dark)' }} />
                          <h4>Uploading Banner to Storage...</h4>
                        </div>
                      ) : (
                        <>
                          <UploadCloud size={30} className="brand-dropzone-icon" />
                          <h4>Drag & Drop Hero Photography here</h4>
                          <p>or click to browse from computer (JPEG, PNG, WebP up to 5MB)</p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Manual URL fallback */}
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="Or enter image URL (/assets/banners/hero-1.png or https://...)"
                      value={slide.bgImage || ''}
                      onChange={(e) => handleSlideChange(idx, 'bgImage', e.target.value)}
                      className="form-input"
                      style={{ fontSize: '11px', padding: '6px 10px' }}
                    />
                  </div>
                </div>

                {/* Slide Text Content Fields */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Eyebrow (Small Tagline)</label>
                    <input
                      type="text"
                      value={slide.eyebrow || ''}
                      onChange={(e) => handleSlideChange(idx, 'eyebrow', e.target.value)}
                      placeholder="e.g. THE ART OF PAKISTANI FASHION"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Slide Main Title</label>
                    <input
                      type="text"
                      value={slide.title || ''}
                      onChange={(e) => handleSlideChange(idx, 'title', e.target.value)}
                      placeholder="e.g. EBA Fashion Studio"
                      required
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Subtitle Description</label>
                  <textarea
                    rows={2}
                    value={slide.subtitle || ''}
                    onChange={(e) => handleSlideChange(idx, 'subtitle', e.target.value)}
                    placeholder="Short description displayed under the headline"
                    className="form-textarea"
                  />
                </div>

                {/* Call-to-Action Buttons */}
                <div className="form-grid-2" style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #eee' }}>
                  <div className="form-group">
                    <label className="form-label">Primary Button Text & Link</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={slide.btnMen || 'SHOP MEN'}
                        onChange={(e) => handleSlideChange(idx, 'btnMen', e.target.value)}
                        placeholder="Button Label"
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      <input
                        type="text"
                        value={slide.linkMen || '/men'}
                        onChange={(e) => handleSlideChange(idx, 'linkMen', e.target.value)}
                        placeholder="URL (/men)"
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Secondary Button Text & Link</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={slide.btnWomen || 'SHOP WOMEN'}
                        onChange={(e) => handleSlideChange(idx, 'btnWomen', e.target.value)}
                        placeholder="Button Label"
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      <input
                        type="text"
                        value={slide.linkWomen || '/women'}
                        onChange={(e) => handleSlideChange(idx, 'linkWomen', e.target.value)}
                        placeholder="URL (/women)"
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Homepage Editorial Story Banner */}
        <div className="admin-form-section" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <h3 className="section-title" style={{ margin: 0 }}>Homepage Editorial Story Banner</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-neutral-muted)' }}>
                Curate the full-width storytelling banner located midway down the homepage (text & photography).
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 360px) 1fr',
              gap: '24px',
              padding: '20px',
              background: 'var(--color-neutral-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              marginTop: '16px'
            }}
          >
            {/* Promo Image Drag & Drop */}
            <div>
              <label className="form-label" style={{ fontWeight: 600 }}>Story Banner Image</label>
              {promoBanner.image ? (
                <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--color-border)', marginBottom: '10px' }}>
                  <img
                    src={promoBanner.image}
                    alt="Promo preview"
                    style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/products/women/baroque-1.jpg';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setPromoBanner(prev => ({ ...prev, image: '' }))}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Remove Image"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : null}

              <div
                className={`brand-dropzone ${promoDragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setPromoDragOver(true); }}
                onDragLeave={() => setPromoDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setPromoDragOver(false);
                  handlePromoImageUpload(e.dataTransfer.files);
                }}
                onClick={() => promoFileInputRef.current?.click()}
                style={{ padding: '24px 16px' }}
              >
                <input
                  ref={promoFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  style={{ display: 'none' }}
                  onChange={(e) => handlePromoImageUpload(e.target.files)}
                />
                {uploadingPromo ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-gold-dark)' }} />
                    <h4>Uploading Banner to Storage...</h4>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={30} className="brand-dropzone-icon" />
                    <h4>Drag & Drop Story Image</h4>
                    <p>or click to browse from device</p>
                  </>
                )}
              </div>

              <div style={{ marginTop: '10px' }}>
                <input
                  type="text"
                  value={promoBanner.image || ''}
                  onChange={(e) => setPromoBanner(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="Or enter image URL (/assets/... or https://...)"
                  className="form-input"
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            {/* Promo Text Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Eyebrow Headline</label>
                <input
                  type="text"
                  value={promoBanner.eyebrow}
                  onChange={(e) => setPromoBanner(prev => ({ ...prev, eyebrow: e.target.value }))}
                  className="form-input"
                  placeholder="e.g. ARTISANAL HERITAGE"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Main Heading</label>
                <input
                  type="text"
                  value={promoBanner.title}
                  onChange={(e) => setPromoBanner(prev => ({ ...prev, title: e.target.value }))}
                  className="form-input"
                  placeholder="e.g. The Essence of Pakistani Craftsmanship"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Story Narrative / Description</label>
                <textarea
                  rows={4}
                  value={promoBanner.paragraph}
                  onChange={(e) => setPromoBanner(prev => ({ ...prev, paragraph: e.target.value }))}
                  className="form-input"
                  placeholder="Describe your heritage, fabric craft, and luxury styling..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Button Text</label>
                  <input
                    type="text"
                    value={promoBanner.btnText}
                    onChange={(e) => setPromoBanner(prev => ({ ...prev, btnText: e.target.value }))}
                    className="form-input"
                    placeholder="e.g. Discover Our Story"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Button Link</label>
                  <input
                    type="text"
                    value={promoBanner.btnLink}
                    onChange={(e) => setPromoBanner(prev => ({ ...prev, btnLink: e.target.value }))}
                    className="form-input"
                    placeholder="e.g. /about or /shop"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Homepage Shop By Collection Cards */}
        <div className="admin-form-section" style={{ margin: 0 }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Homepage "Shop By Collection" Cards</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-neutral-muted)' }}>
              Customize the portrait editorial photography displayed on the Home Page for GENTLEMEN'S WARDROBE (Men's Unstitched) and COUTURE & LAWN (Women's Luxury).
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Men's Card */}
            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>👔 Men's Unstitched Card</span>
                <span style={{ fontSize: '11px', color: '#888' }}>Home Page Editorial</span>
              </div>

              {collectionBanners.men_image ? (
                <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd', marginBottom: '10px' }}>
                  <img
                    src={collectionBanners.men_image}
                    alt="Men's Collection Card"
                    style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/products/men/bin-faisal-1.jpg';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setCollectionBanners(prev => ({ ...prev, men_image: '' }))}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Remove Image"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : null}

              <div
                className={`brand-dropzone ${collDragOver === 'men' ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setCollDragOver('men'); }}
                onDragLeave={() => setCollDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setCollDragOver(null);
                  handleCollectionImageUpload('men', e.dataTransfer.files);
                }}
                onClick={() => collFileInputRefs.current['men']?.click()}
                style={{ padding: '20px 14px' }}
              >
                <input
                  type="file"
                  ref={(el) => { collFileInputRefs.current['men'] = el; }}
                  onChange={(e) => handleCollectionImageUpload('men', e.target.files)}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                {uploadingColl === 'men' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-gold-dark)' }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>Uploading Men's Card...</p>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={26} className="brand-dropzone-icon" />
                    <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '13px' }}>Drag & Drop Men's Image</p>
                    <span style={{ fontSize: '11px', color: '#888' }}>or click to browse</span>
                  </>
                )}
              </div>

              <div style={{ marginTop: '10px' }}>
                <input
                  type="text"
                  value={collectionBanners.men_image || ''}
                  onChange={(e) => setCollectionBanners(prev => ({ ...prev, men_image: e.target.value }))}
                  placeholder="Or enter image URL (/assets/... or https://...)"
                  className="form-input"
                  style={{ fontSize: '12px', padding: '7px 10px' }}
                />
              </div>
            </div>

            {/* Women's Card */}
            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>👗 Women's Luxury Card</span>
                <span style={{ fontSize: '11px', color: '#888' }}>Home Page Editorial</span>
              </div>

              {collectionBanners.women_image ? (
                <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd', marginBottom: '10px' }}>
                  <img
                    src={collectionBanners.women_image}
                    alt="Women's Collection Card"
                    style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/products/women/hussain-rehar-1.jpg';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setCollectionBanners(prev => ({ ...prev, women_image: '' }))}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Remove Image"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : null}

              <div
                className={`brand-dropzone ${collDragOver === 'women' ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setCollDragOver('women'); }}
                onDragLeave={() => setCollDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setCollDragOver(null);
                  handleCollectionImageUpload('women', e.dataTransfer.files);
                }}
                onClick={() => collFileInputRefs.current['women']?.click()}
                style={{ padding: '20px 14px' }}
              >
                <input
                  type="file"
                  ref={(el) => { collFileInputRefs.current['women'] = el; }}
                  onChange={(e) => handleCollectionImageUpload('women', e.target.files)}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                {uploadingColl === 'women' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-gold-dark)' }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>Uploading Women's Card...</p>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={26} className="brand-dropzone-icon" />
                    <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '13px' }}>Drag & Drop Women's Image</p>
                    <span style={{ fontSize: '11px', color: '#888' }}>or click to browse</span>
                  </>
                )}
              </div>

              <div style={{ marginTop: '10px' }}>
                <input
                  type="text"
                  value={collectionBanners.women_image || ''}
                  onChange={(e) => setCollectionBanners(prev => ({ ...prev, women_image: e.target.value }))}
                  placeholder="Or enter image URL (/assets/... or https://...)"
                  className="form-input"
                  style={{ fontSize: '12px', padding: '7px 10px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category & Shop Page Banners (Men, Women, Shop All, Brands Directory) */}
        <div className="admin-form-section" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <h3 className="section-title" style={{ margin: 0 }}>Shop & Category Page Banners</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-neutral-muted)' }}>
                Customize the top hero banners, background photography, headlines, and descriptions for Men's Wear, Women's Wear, Shop All, and the Brands Directory.
              </p>
            </div>
          </div>

          {/* Tab Selector Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
            {categoryTabs.map(tab => {
              const isActive = activeCategoryTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveCategoryTab(tab.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    border: isActive ? '1px solid var(--color-gold)' : '1px solid var(--color-border)',
                    background: isActive ? '#0C0C0C' : '#FFFFFF',
                    color: isActive ? 'var(--color-gold)' : 'var(--color-neutral-dark)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isActive ? 'rgba(197, 160, 89, 0.2)' : 'rgba(0,0,0,0.05)',
                    color: isActive ? 'var(--color-gold)' : '#777'
                  }}>
                    {tab.route}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Banner Editor Card */}
          {(() => {
            const currentTabConfig = categoryTabs.find(t => t.key === activeCategoryTab)!;
            const currentData = (categoryBanners as any)[activeCategoryTab] || {};
            const isUploading = uploadingCategoryBanner === activeCategoryTab;
            const isDragging = catDragOver === activeCategoryTab;

            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(280px, 360px) 1fr',
                  gap: '24px',
                  padding: '20px',
                  background: 'var(--color-neutral-subtle)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  marginTop: '16px'
                }}
              >
                {/* Left: Drag & Drop Dropzone & Image Preview */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>Banner Photography</label>
                    <a
                      href={currentTabConfig.route}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: 'var(--color-gold)',
                        textDecoration: 'none',
                      }}
                      title="Open page in new tab"
                    >
                      <span>Preview page</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {currentData.bgImage ? (
                    <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--color-border)', marginBottom: '10px' }}>
                      <img
                        src={currentData.bgImage}
                        alt={`${currentTabConfig.label} banner preview`}
                        style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/assets/banners/hero-1.png';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleCategoryFieldChange(activeCategoryTab, 'bgImage', '')}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Remove Image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : null}

                  {/* Dropzone */}
                  <div
                    className={`brand-dropzone ${isDragging ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setCatDragOver(activeCategoryTab); }}
                    onDragLeave={() => setCatDragOver(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setCatDragOver(null);
                      handleCategoryBannerUpload(activeCategoryTab, e.dataTransfer.files);
                    }}
                    onClick={() => catFileInputRefs.current[activeCategoryTab]?.click()}
                    style={{ padding: '24px 16px' }}
                  >
                    <input
                      ref={(el) => { catFileInputRefs.current[activeCategoryTab] = el; }}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleCategoryBannerUpload(activeCategoryTab, e.target.files)}
                    />

                    {isUploading ? (
                      <div className="brand-dropzone-loading">
                        <Loader2 size={24} className="spin-animate" />
                        <span>Attaching banner photography...</span>
                      </div>
                    ) : (
                      <div className="brand-dropzone-content">
                        <UploadCloud size={28} className="dropzone-icon" />
                        <span className="dropzone-title">Drag & drop banner here</span>
                        <span className="dropzone-hint">or click to browse from device (JPG, PNG, WebP)</span>
                      </div>
                    )}
                  </div>

                  {/* Direct URL input fallback */}
                  <div style={{ marginTop: '12px' }}>
                    <label className="form-label" style={{ fontSize: '12px', color: 'var(--color-neutral-muted)' }}>
                      Or Image URL path:
                    </label>
                    <input
                      type="text"
                      value={currentData.bgImage || ''}
                      onChange={(e) => handleCategoryFieldChange(activeCategoryTab, 'bgImage', e.target.value)}
                      placeholder="/assets/banners/hero-1.png or https://..."
                      className="form-input"
                      style={{ fontSize: '12px', padding: '8px 12px' }}
                    />
                  </div>
                </div>

                {/* Right: Text Information */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Eyebrow Headline</label>
                    <input
                      type="text"
                      value={currentData.eyebrow || ''}
                      onChange={(e) => handleCategoryFieldChange(activeCategoryTab, 'eyebrow', e.target.value)}
                      className="form-input"
                      placeholder="e.g. GENTLEMEN'S HERITAGE ARCHIVE"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Main Heading / Title</label>
                    <input
                      type="text"
                      value={currentData.title || ''}
                      onChange={(e) => handleCategoryFieldChange(activeCategoryTab, 'title', e.target.value)}
                      className="form-input"
                      placeholder="e.g. Men's Unstitched & Heirloom Shawls"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description / Subtitle</label>
                    <textarea
                      rows={4}
                      value={currentData.desc || ''}
                      onChange={(e) => handleCategoryFieldChange(activeCategoryTab, 'desc', e.target.value)}
                      className="form-input"
                      placeholder="Describe the collection, fabric quality, and heritage..."
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ padding: '12px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '12px', color: 'var(--color-neutral-dark)' }}>
                    💡 <strong>Tip:</strong> Changes save directly to the database and will update live on <code>{currentTabConfig.route}</code> as soon as you click <strong>Save Settings</strong> below.
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quick Notice about Brand Banners */}
          <div style={{ marginTop: '16px', padding: '14px 18px', background: 'rgba(197, 160, 89, 0.08)', borderRadius: '6px', border: '1px solid rgba(197, 160, 89, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-black-deep)' }}>
                Want to change banners for individual designer brands (e.g. Maria-B, Baroque, Hussain Rehar)?
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-neutral-muted)', marginTop: '2px' }}>
                Each brand has its own dedicated Hero Banner & Logo uploader under Brand Management.
              </div>
            </div>
            <a
              href="/admin/brands"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: 'var(--color-black-deep)',
                color: '#FFFFFF',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <span>Manage Brands</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Customer Care & WhatsApp Concierge */}
        <div className="admin-form-section" style={{ margin: 0 }}>
          <h3 className="section-title">Contact & Style Concierge</h3>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Customer Support Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Support Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Official WhatsApp Concierge</label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="admin-form-section" style={{ margin: 0 }}>
          <h3 className="section-title">Social Media Presence</h3>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Instagram Profile URL</label>
              <input
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Facebook Page URL</label>
              <input
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">TikTok Profile URL</label>
              <input
                type="url"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }} disabled={isSaving}>
          <Save size={16} />
          <span>{isSaving ? 'Updating...' : 'Save Configuration Changes'}</span>
        </button>
      </form>
    </div>
  );
};
