import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SiteSettings, AdminActivityLog, Role } from '../types';
import { orderService } from './orderService';
import { productService } from './productService';
import { brandService } from './brandService';

export interface DashboardMetrics {
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  activeBrands: number;
}

export const defaultHeroSlides = [
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

export const filterHeroBanners = (banners: any[]): any[] => {
  if (!Array.isArray(banners)) return [];
  return banners.filter((b: any) =>
    b &&
    !b.bgImage?.includes('hero-1.png') &&
    !b.title?.toLowerCase().includes('eba fashion studio')
  );
};

export const adminService = {
  // Compute live dashboard metrics
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const orders = await orderService.getAllOrdersAdmin();
    const { products } = await productService.getProducts({ limit: 1000 });
    const brands = await brandService.getBrands(true);

    const totalSales = orders
      .filter(o => o.payment_status === 'PAID' || o.order_status === 'DELIVERED')
      .reduce((sum, o) => sum + Number(o.total_amount), 0);

    const pendingOrders = orders.filter(o => o.order_status === 'PENDING').length;
    const processingOrders = orders.filter(o => o.order_status === 'PROCESSING' || o.order_status === 'CONFIRMED').length;
    const deliveredOrders = orders.filter(o => o.order_status === 'DELIVERED').length;

    const lowStockCount = products.filter(p => p.stock_quantity <= p.low_stock_threshold).length;

    // Unique customer count
    const uniqueEmails = new Set(orders.map(o => o.customer_email.toLowerCase()));

    return {
      totalSales,
      totalOrders: orders.length,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      totalProducts: products.length,
      lowStockProducts: lowStockCount,
      totalCustomers: Math.max(uniqueEmails.size, 1),
      activeBrands: brands.length,
    };
  },

  // Record an admin audit action
  async logActivity(action: string, entity: string, entityId?: string, metadata: Record<string, any> = {}): Promise<void> {
    const logItem = {
      action,
      entity,
      entity_id: entityId || '',
      metadata,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('admin_activity_logs').insert([{
          action,
          entity_type: entity,
          entity: entity,
          entity_id: entityId || '',
          details: metadata,
          metadata: metadata,
          user_id: user?.id || null,
          admin_user_id: user?.id || null,
          admin_email: user?.email || 'admin@ebafashionstudio.com',
        }]);
      } catch (err) {
        console.warn('Activity log error:', err);
      }
    }

    // Local storage persistence
    const localLogs = JSON.parse(localStorage.getItem('eba_admin_logs') || '[]');
    localLogs.unshift({
      id: `log_${Date.now()}`,
      admin_email: 'Owner / Admin',
      ...logItem,
    });
    localStorage.setItem('eba_admin_logs', JSON.stringify(localLogs.slice(0, 100)));
  },

  // Fetch audit logs
  async getActivityLogs(): Promise<AdminActivityLog[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('admin_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && data && data.length > 0) return data as AdminActivityLog[];
      } catch (err) {
        console.warn('getActivityLogs fallback:', err);
      }
    }

    const localLogs = JSON.parse(localStorage.getItem('eba_admin_logs') || '[]');
    return localLogs;
  },

  // Fetch site settings
  async getSiteSettings(): Promise<SiteSettings> {
    const defaultSettings: SiteSettings = {
      id: 'general',
      store_name: 'EBA Fashion Studio',
      contact_email: 'contact@ebafashionstudio.com',
      contact_phone: '+92 300 1234567',
      whatsapp_number: '+92 300 1234567',
      instagram_url: 'https://instagram.com/ebafashionstudio',
      facebook_url: 'https://facebook.com/ebafashionstudio',
      tiktok_url: 'https://tiktok.com/@ebafashionstudio',
      announcement_text: 'Complimentary Nationwide Delivery on Orders Above PKR 5,000 | Luxury Unstitched Collections',
      hero_banners: defaultHeroSlides,
      promo_banner: {
        eyebrow: 'ARTISANAL HERITAGE',
        title: 'The Essence of Pakistani Craftsmanship',
        paragraph: 'Every thread in our curated unstitched collections tells a story of centuries-old eastern textile mastery. From intricate tilla work to gossamer pure silk dupattas and hand-twisted merino wool shawls, EBA Fashion Studio celebrates uncompromised luxury.',
        image: '/assets/products/women/baroque-1.jpg',
        btnText: 'Discover Our Story',
        btnLink: '/about',
      },
      currency: 'PKR',
      category_banners: {
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
      },
      collection_banners: {
        men_image: '/assets/products/men/bin-faisal-1.jpg',
        women_image: '/assets/products/women/hussain-rehar-1.jpg',
      },
    };

    let result = { ...defaultSettings };
    const local = localStorage.getItem('eba_site_settings');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.hero_banners && Array.isArray(parsed.hero_banners)) {
          parsed.hero_banners = filterHeroBanners(parsed.hero_banners);
        }
        result = { ...result, ...parsed };
      } catch (e) {
        // ignore
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('site_settings').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          // Check for flat row (id = 'general' or row containing store_name)
          const generalRow = data.find((r: any) => r.id === 'general' || r.key === 'general' || r.store_name);
          if (generalRow) {
            result = {
              ...result,
              ...(generalRow.store_name ? { store_name: generalRow.store_name } : {}),
              ...(generalRow.contact_email ? { contact_email: generalRow.contact_email } : {}),
              ...(generalRow.contact_phone ? { contact_phone: generalRow.contact_phone } : {}),
              ...(generalRow.whatsapp_number ? { whatsapp_number: generalRow.whatsapp_number } : {}),
              ...(generalRow.instagram_url ? { instagram_url: generalRow.instagram_url } : {}),
              ...(generalRow.facebook_url ? { facebook_url: generalRow.facebook_url } : {}),
              ...(generalRow.tiktok_url ? { tiktok_url: generalRow.tiktok_url } : {}),
              ...(generalRow.announcement_text ? { announcement_text: generalRow.announcement_text } : {}),
              ...(generalRow.currency ? { currency: generalRow.currency } : {}),
            };

            if (generalRow.hero_banners && Array.isArray(generalRow.hero_banners)) {
              const clean = filterHeroBanners(generalRow.hero_banners);
              if (clean.length > 0) result.hero_banners = clean;
            }
          }

          // Check for key-value rows
          const heroBannersRow = data.find((r: any) => r.key === 'hero_banners');
          if (heroBannersRow?.value && Array.isArray(heroBannersRow.value)) {
            const clean = filterHeroBanners(heroBannersRow.value);
            if (clean.length > 0) result.hero_banners = clean;
          }

          const promoBannerRow = data.find((r: any) => r.key === 'promo_banner');
          if (promoBannerRow?.value) {
            result.promo_banner = promoBannerRow.value;
          }

          const categoryBannersRow = data.find((r: any) => r.key === 'category_banners');
          if (categoryBannersRow?.value) {
            result.category_banners = {
              ...result.category_banners,
              ...categoryBannersRow.value,
            };
          }

          const collectionBannersRow = data.find((r: any) => r.key === 'collection_banners');
          if (collectionBannersRow?.value) {
            result.collection_banners = {
              ...result.collection_banners,
              ...collectionBannersRow.value,
            };
          }

          const storeInfo = data.find((r: any) => r.key === 'store_info');
          if (storeInfo?.value) {
            const v = storeInfo.value;
            if (v.name) result.store_name = v.name;
            if (v.email) result.contact_email = v.email;
            if (v.phone) result.contact_phone = v.phone;
            if (v.whatsapp || v.phone) result.whatsapp_number = v.whatsapp || v.phone;
            if (v.currency) result.currency = v.currency;
          }

          const announcements = data.find((r: any) => r.key === 'announcements');
          if (announcements?.value?.text) {
            result.announcement_text = announcements.value.text;
          }

          const socialLinks = data.find((r: any) => r.key === 'social_links');
          if (socialLinks?.value) {
            const s = socialLinks.value;
            if (s.instagram) result.instagram_url = s.instagram;
            if (s.facebook) result.facebook_url = s.facebook;
            if (s.tiktok) result.tiktok_url = s.tiktok;
          }
        }
      } catch (err) {
        console.warn('getSiteSettings fallback:', err);
      }
    }

    if (!result.hero_banners || !Array.isArray(result.hero_banners) || result.hero_banners.length < 2) {
      result.hero_banners = defaultHeroSlides;
    } else {
      const clean = filterHeroBanners(result.hero_banners);
      result.hero_banners = clean.length >= 2 ? clean : defaultHeroSlides;
    }

    return result;
  },

  // Update site settings
  async updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
    const current = await this.getSiteSettings();
    const merged = { ...current, ...settings };

    // 1. Immediately sync to local storage so UI updates instantly
    localStorage.setItem('eba_site_settings', JSON.stringify(merged));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eba_settings_updated', { detail: merged }));
    }

    // 2. Persist to Supabase with dual schema resilience
    if (isSupabaseConfigured()) {
      let savedFlat = false;
      try {
        // Try flat column upsert
        const { error } = await supabase
          .from('site_settings')
          .upsert({
            key: 'general',
            id: 'general',
            store_name: merged.store_name,
            contact_email: merged.contact_email,
            contact_phone: merged.contact_phone,
            whatsapp_number: merged.whatsapp_number,
            instagram_url: merged.instagram_url,
            facebook_url: merged.facebook_url,
            tiktok_url: merged.tiktok_url,
            announcement_text: merged.announcement_text,
            hero_banners: merged.hero_banners || [],
            currency: merged.currency,
            updated_at: new Date().toISOString()
          });

        if (!error) {
          savedFlat = true;
        } else {
          console.warn('Flat site_settings upsert note:', error.message);
        }
      } catch (flatErr) {
        console.warn('Flat site_settings note:', flatErr);
      }

      // Sync key-value rows so both schemas are always up-to-date
      try {
        await supabase.from('site_settings').upsert([
          {
            key: 'hero_banners',
            value: merged.hero_banners || [],
            description: 'Homepage Hero Banner Slider slides and configurations',
            updated_at: new Date().toISOString(),
          },
          {
            key: 'promo_banner',
            value: merged.promo_banner || null,
            description: 'Homepage Editorial Promotional Banner content and image',
            updated_at: new Date().toISOString(),
          },
          {
            key: 'collection_banners',
            value: merged.collection_banners || null,
            description: 'Homepage Shop By Collection Cards images for Men and Women',
            updated_at: new Date().toISOString(),
          },
          {
            key: 'store_info',
            value: {
              name: merged.store_name,
              email: merged.contact_email,
              phone: merged.contact_phone,
              whatsapp: merged.whatsapp_number,
              currency: merged.currency,
              currency_symbol: merged.currency === 'PKR' ? '₨' : '$',
            },
            description: 'General store contact and brand identity info',
            updated_at: new Date().toISOString(),
          },
          {
            key: 'announcements',
            value: {
              text: merged.announcement_text,
              active: true,
              link: '/shop',
            },
            description: 'Top header announcement message',
            updated_at: new Date().toISOString(),
          },
          {
            key: 'social_links',
            value: {
              instagram: merged.instagram_url,
              facebook: merged.facebook_url,
              tiktok: merged.tiktok_url,
            },
            description: 'Social media profile handles and links',
            updated_at: new Date().toISOString(),
          },
          {
            key: 'category_banners',
            value: merged.category_banners || null,
            description: 'Page banners for Men, Women, Shop All, and Brands directory',
            updated_at: new Date().toISOString(),
          }
        ]);
      } catch (kvErr) {
        console.warn('Key-value site_settings upsert error:', kvErr);
      }
    }

    await this.logActivity('Updated site settings', 'Settings', 'general');
  },

  // Customer Management
  async getCustomersList(): Promise<Array<{
    email: string;
    name: string;
    phone: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string;
  }>> {
    const orders = await orderService.getAllOrdersAdmin();
    const map = new Map<string, {
      email: string;
      name: string;
      phone: string;
      totalOrders: number;
      totalSpent: number;
      lastOrderDate: string;
    }>();

    for (const o of orders) {
      const key = o.customer_email.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpent += Number(o.total_amount);
        if (new Date(o.created_at) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = o.created_at;
        }
      } else {
        map.set(key, {
          email: o.customer_email,
          name: o.customer_name,
          phone: o.customer_phone,
          totalOrders: 1,
          totalSpent: Number(o.total_amount),
          lastOrderDate: o.created_at,
        });
      }
    }

    return Array.from(map.values());
  },

  // Admin users list (with roles)
  async getAdminUsers(): Promise<Array<{
    id: string;
    email: string;
    role: Role;
    created_at: string;
  }>> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('*, profiles(*)');
        if (!error && data) {
          return data.map((r: any) => ({
            id: r.user_id,
            email: r.profiles?.full_name || 'Admin User',
            role: r.role as Role,
            created_at: r.created_at,
          }));
        }
      } catch (err) {
        console.warn('getAdminUsers fallback:', err);
      }
    }

    return [
      { id: 'admin-owner', email: 'owner@ebafashionstudio.com', role: 'OWNER', created_at: new Date().toISOString() },
    ];
  },
};
