import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Product, ProductImage, ProductVariant } from '../types';
import { initialProducts } from '../data/initialData';

export interface ProductFilters {
  gender?: 'MEN' | 'WOMEN' | 'UNISEX';
  brandSlug?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  fabric?: string;
  color?: string;
  search?: string;
  sortBy?: 'featured' | 'newest' | 'price-low' | 'price-high' | 'bestselling';
  page?: number;
  limit?: number;
}

// Helpers for persistent deletion, local products, and status overrides across refreshes
const getDeletedProductIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('eba_deleted_product_ids');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {
    // ignore
  }
  return new Set();
};

const addDeletedProductIds = (ids: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedProductIds();
    ids.forEach(id => set.add(id));
    localStorage.setItem('eba_deleted_product_ids', JSON.stringify(Array.from(set)));

    // Also remove from local products
    const local = getLocalProducts().filter(p => !set.has(p.id));
    saveLocalProducts(local);

    window.dispatchEvent(new CustomEvent('eba_products_updated'));
  } catch (e) {
    // ignore
  }
};

const getLocalProducts = (): Product[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('eba_local_products');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) {
    // ignore
  }
  return [];
};

const saveLocalProducts = (products: Product[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('eba_local_products', JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('eba_products_updated'));
  } catch (e) {
    // ignore
  }
};

const getStatusOverrides = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('eba_product_status_overrides');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return {};
};

const saveStatusOverrides = (overrides: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('eba_product_status_overrides', JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent('eba_products_updated'));
  } catch (e) {
    // ignore
  }
};

// Helper to ensure all products in a list have their images populated from Supabase
const hydrateProductImages = async (products: Product[]): Promise<Product[]> => {
  if (!isSupabaseConfigured() || products.length === 0) return products;

  // Identify products missing images or with empty images array
  const missingImgProducts = products.filter(p => !p.images || p.images.length === 0);
  if (missingImgProducts.length === 0) return products;

  const missingIds = missingImgProducts.map(p => p.id);
  try {
    const { data: dbImages, error } = await supabase
      .from('product_images')
      .select('*')
      .in('product_id', missingIds)
      .order('display_order', { ascending: true });

    if (!error && dbImages && dbImages.length > 0) {
      const imgMap: Record<string, ProductImage[]> = {};
      for (const img of dbImages) {
        if (!imgMap[img.product_id]) imgMap[img.product_id] = [];
        imgMap[img.product_id].push(img as ProductImage);
      }

      // Update in-memory products
      for (const p of products) {
        if ((!p.images || p.images.length === 0) && imgMap[p.id]) {
          p.images = imgMap[p.id];
        }
      }

      // Also persist to localStorage so cached items have their images restored permanently
      try {
        const local = getLocalProducts();
        let changed = false;
        for (const lp of local) {
          if ((!lp.images || lp.images.length === 0) && imgMap[lp.id]) {
            lp.images = imgMap[lp.id];
            changed = true;
          }
        }
        if (changed) {
          saveLocalProducts(local);
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    console.warn('Auto-hydrate product images notice:', err);
  }

  return products;
};

// 3-minute in-memory query cache for instant page switching & fast mobile performance
const queryCache = new Map<string, { result: { products: Product[]; total: number }; timestamp: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000;

export const clearProductCache = () => {
  queryCache.clear();
};

if (typeof window !== 'undefined') {
  window.addEventListener('eba_products_updated', () => clearProductCache());
}

export const productService = {
  async getProducts(filters: ProductFilters = {}): Promise<{ products: Product[]; total: number }> {
    const cacheKey = JSON.stringify(filters);
    const cached = queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.result;
    }

    const deletedIds = getDeletedProductIds();
    const statusOverrides = getStatusOverrides();
    const localProds = getLocalProducts().filter(p => !deletedIds.has(p.id));

    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('products')
          .select(`
            *,
            brand:brands(*),
            category:categories(*),
            subcategory:subcategories(*),
            images:product_images(*),
            variants:product_variants(*)
          `, { count: 'exact' });

        if (filters.gender) {
          query = query.or(`gender.eq.${filters.gender},gender.eq.UNISEX`);
        }
        if (filters.onSale) {
          query = query.eq('is_on_sale', true);
        }
        if (filters.isNew) {
          query = query.eq('is_new', true);
        }
        if (filters.isFeatured) {
          query = query.eq('is_featured', true);
        }
        if (filters.isBestseller) {
          query = query.eq('is_bestseller', true);
        }
        if (filters.minPrice !== undefined) {
          query = query.gte('price', filters.minPrice);
        }
        if (filters.maxPrice !== undefined) {
          query = query.lte('price', filters.maxPrice);
        }
        if (filters.fabric) {
          query = query.ilike('fabric', `%${filters.fabric}%`);
        }
        if (filters.color) {
          query = query.ilike('color', `%${filters.color}%`);
        }
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
        }

        // Sorting
        switch (filters.sortBy) {
          case 'newest':
            query = query.order('created_at', { ascending: false });
            break;
          case 'price-low':
            query = query.order('price', { ascending: true });
            break;
          case 'price-high':
            query = query.order('price', { ascending: false });
            break;
          case 'bestselling':
            query = query.order('is_bestseller', { ascending: false }).order('created_at', { ascending: false });
            break;
          default:
            query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
            break;
        }

        // Pagination
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;

        if (!error && data && data.length > 0) {
          // Filter by deleted IDs & status overrides
          let filtered = (data as Product[])
            .filter(p => !deletedIds.has(p.id))
            .map(p => statusOverrides[p.id] ? { ...p, status: statusOverrides[p.id] as any } : p);

          // Merge any locally added products not in Supabase yet
          const existingIds = new Set(filtered.map(p => p.id));
          let extraLocal = localProds.filter(p => !existingIds.has(p.id));

          if (filters.gender) {
            extraLocal = extraLocal.filter(p => p.gender === filters.gender || p.gender === 'UNISEX');
          }
          if (filters.brandSlug) {
            extraLocal = extraLocal.filter(p => p.brand?.slug === filters.brandSlug);
          }
          if (filters.categorySlug) {
            extraLocal = extraLocal.filter(p => p.category?.slug === filters.categorySlug);
          }
          if (filters.subcategorySlug) {
            extraLocal = extraLocal.filter(p => p.subcategory?.slug === filters.subcategorySlug);
          }

          filtered = [...filtered, ...extraLocal];

          if (filters.brandSlug) {
            filtered = filtered.filter(p => p.brand?.slug === filters.brandSlug);
          }
          if (filters.categorySlug) {
            filtered = filtered.filter(p => p.category?.slug === filters.categorySlug);
          }
          if (filters.subcategorySlug) {
            filtered = filtered.filter(p => p.subcategory?.slug === filters.subcategorySlug);
          }

          // Hydrate any missing images directly from Supabase
          filtered = await hydrateProductImages(filtered);

          const result = { products: filtered, total: count || filtered.length };
          queryCache.set(cacheKey, { result, timestamp: Date.now() });

          return result;
        }
      } catch (err) {
        console.warn('Supabase fetch notice, using local dataset:', err);
      }
    }

    // Local in-memory filtering fallback: initialProducts + localProds minus deletedIds
    const baseList = [...initialProducts, ...localProds];
    const seen = new Set<string>();
    let list: Product[] = [];
    for (const p of baseList) {
      if (!deletedIds.has(p.id) && !seen.has(p.id)) {
        seen.add(p.id);
        list.push(statusOverrides[p.id] ? { ...p, status: statusOverrides[p.id] as any } : p);
      }
    }

    if (filters.gender) {
      list = list.filter(p => p.gender === filters.gender || p.gender === 'UNISEX');
    }
    if (filters.brandSlug) {
      list = list.filter(p => p.brand?.slug === filters.brandSlug);
    }
    if (filters.categorySlug) {
      list = list.filter(p => p.category?.slug === filters.categorySlug);
    }
    if (filters.subcategorySlug) {
      list = list.filter(p => p.subcategory?.slug === filters.subcategorySlug);
    }
    if (filters.minPrice !== undefined) {
      list = list.filter(p => (p.sale_price ?? p.price) >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      list = list.filter(p => (p.sale_price ?? p.price) <= filters.maxPrice!);
    }
    if (filters.onSale) {
      list = list.filter(p => p.is_on_sale);
    }
    if (filters.isNew) {
      list = list.filter(p => p.is_new);
    }
    if (filters.isFeatured) {
      list = list.filter(p => p.is_featured);
    }
    if (filters.isBestseller) {
      list = list.filter(p => p.is_bestseller);
    }
    if (filters.fabric) {
      list = list.filter(p => p.fabric?.toLowerCase().includes(filters.fabric!.toLowerCase()));
    }
    if (filters.color) {
      list = list.filter(p => p.color?.toLowerCase().includes(filters.color!.toLowerCase()));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.brand?.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      );
    }

    // Sorting
    switch (filters.sortBy) {
      case 'newest':
        list.sort((a, b) => (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0));
        break;
      case 'price-low':
        list.sort((a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price));
        break;
      case 'price-high':
        list.sort((a, b) => (b.sale_price ?? b.price) - (a.sale_price ?? a.price));
        break;
      case 'bestselling':
        list.sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0));
        break;
      default:
        list.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
        break;
    }

    // Hydrate any missing images directly from Supabase
    list = await hydrateProductImages(list);

    const fallbackResult = { products: list, total: list.length };
    queryCache.set(cacheKey, { result: fallbackResult, timestamp: Date.now() });

    return fallbackResult;
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    const deletedIds = getDeletedProductIds();

    let product: Product | null = null;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            brand:brands(*),
            category:categories(*),
            subcategory:subcategories(*),
            images:product_images(*),
            variants:product_variants(*)
          `)
          .eq('slug', slug)
          .single();

        if (!error && data && !deletedIds.has(data.id)) {
          product = data as Product;
        }
      } catch (err) {
        console.warn('Supabase getProductBySlug fallback:', err);
      }
    }

    if (!product) {
      const localProds = getLocalProducts();
      const found = [...initialProducts, ...localProds].find(p => p.slug === slug && !deletedIds.has(p.id));
      product = found || null;
    }

    if (product) {
      if (!product.images || product.images.length === 0) {
        const hydrated = await hydrateProductImages([product]);
        product = hydrated[0] || product;
      }
    }

    return product;
  },

  async getRelatedProducts(productId: string, categoryId?: string, limit = 4): Promise<Product[]> {
    const { products } = await this.getProducts({ limit: 12 });
    return products
      .filter(p => p.id !== productId && (categoryId ? p.category_id === categoryId : true))
      .slice(0, limit);
  },

  async getFeaturedProducts(limit = 8): Promise<Product[]> {
    const { products } = await this.getProducts({ isFeatured: true, limit });
    return products;
  },

  async getNewArrivals(limit = 8): Promise<Product[]> {
    const { products } = await this.getProducts({ isNew: true, limit });
    return products;
  },

  async getSaleProducts(limit = 8): Promise<Product[]> {
    const { products } = await this.getProducts({ onSale: true, limit });
    return products;
  },

  async getBestsellers(limit = 8): Promise<Product[]> {
    const { products } = await this.getProducts({ isBestseller: true, limit });
    return products;
  },

  cleanProductPayload(data: Partial<Product>): Record<string, any> {
    const payload: Record<string, any> = { ...data };
    delete payload.brand;
    delete payload.category;
    delete payload.subcategory;
    delete payload.images;
    delete payload.variants;
    delete payload.primary_image;
    return payload;
  },

  async createProduct(
    productData: Partial<Product>,
    images: Array<{ url: string; alt_text?: string; is_primary: boolean; display_order: number }> = [],
    variants: Array<Partial<ProductVariant>> = []
  ): Promise<Product> {
    const payload = this.cleanProductPayload(productData);

    let newProd: any = null;
    const { data, error: prodErr } = await supabase
      .from('products')
      .insert([payload])
      .select()
      .single();

    if (prodErr) {
      // If error is about cost_price or low_stock_threshold, retry without them
      if (prodErr.message.includes('cost_price') || prodErr.message.includes('low_stock_threshold')) {
        delete payload.cost_price;
        delete payload.low_stock_threshold;
        const retry = await supabase.from('products').insert([payload]).select().single();
        if (retry.error) throw retry.error;
        newProd = retry.data;
      } else {
        throw prodErr;
      }
    } else {
      newProd = data;
    }

    // Insert images
    let createdImages: ProductImage[] = [];
    if (images.length > 0) {
      const imgPayload = images.map((img, idx) => ({
        product_id: newProd.id,
        url: img.url,
        alt_text: img.alt_text || newProd.name,
        is_primary: img.is_primary,
        display_order: img.display_order ?? (idx + 1),
      }));

      try {
        const { data: insertedImgs, error: imgErr } = await supabase
          .from('product_images')
          .insert(imgPayload)
          .select();

        if (!imgErr && insertedImgs && insertedImgs.length > 0) {
          createdImages = insertedImgs as ProductImage[];
        } else {
          createdImages = imgPayload.map((img, idx) => ({
            id: `img-${Date.now()}-${idx}`,
            created_at: new Date().toISOString(),
            ...img,
          })) as ProductImage[];
        }
      } catch (e) {
        createdImages = imgPayload.map((img, idx) => ({
          id: `img-${Date.now()}-${idx}`,
          created_at: new Date().toISOString(),
          ...img,
        })) as ProductImage[];
      }
    }

    newProd.images = createdImages;

    // Insert variants
    let createdVariants: ProductVariant[] = [];
    if (variants.length > 0) {
      const varPayload = variants.map(v => ({
        product_id: newProd.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        fabric: v.fabric,
        price: v.price,
        stock_quantity: v.stock_quantity ?? 0,
      }));

      try {
        const { data: insertedVars } = await supabase.from('product_variants').insert(varPayload).select();
        if (insertedVars) createdVariants = insertedVars as ProductVariant[];
      } catch (e) {
        // ignore
      }
    }

    newProd.variants = createdVariants;

    // Save to local products list for instant persistence across reloads
    try {
      const local = getLocalProducts().filter(p => p.id !== (newProd as Product).id);
      local.unshift(newProd as Product);
      saveLocalProducts(local);
    } catch (e) {
      // ignore
    }

    clearProductCache();
    return newProd as Product;
  },

  async updateProduct(
    id: string,
    productData: Partial<Product>,
    images?: Array<{ url: string; alt_text?: string; is_primary: boolean; display_order: number }>,
    variants?: Array<Partial<ProductVariant>>
  ): Promise<void> {
    const payload = this.cleanProductPayload(productData);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', id);

        if (error) {
          if (error.message.includes('cost_price') || error.message.includes('low_stock_threshold')) {
            delete payload.cost_price;
            delete payload.low_stock_threshold;
            const retry = await supabase.from('products').update(payload).eq('id', id);
            if (retry.error) console.warn('Supabase product update retry note:', retry.error.message);
          } else {
            console.warn('Supabase product update note:', error.message);
          }
        }

        if (images !== undefined) {
          await supabase.from('product_images').delete().eq('product_id', id);
          if (images.length > 0) {
            await supabase.from('product_images').insert(
              images.map(img => ({
                product_id: id,
                url: img.url,
                alt_text: img.alt_text || productData.name,
                is_primary: img.is_primary,
                display_order: img.display_order,
              }))
            );
          }
        }

        if (variants !== undefined) {
          await supabase.from('product_variants').delete().eq('product_id', id);
          if (variants.length > 0) {
            await supabase.from('product_variants').insert(
              variants.map(v => ({
                product_id: id,
                sku: v.sku,
                size: v.size,
                color: v.color,
                fabric: v.fabric,
                price: v.price,
                stock_quantity: v.stock_quantity ?? 0,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Supabase product update warning:', err);
      }
    }

    // Always update local products list
    try {
      const local = getLocalProducts().map(p => {
        if (p.id === id) {
          const updated: Product = { ...p, ...productData } as Product;
          if (images !== undefined) {
            updated.images = images.map((img, idx) => ({
              id: (img as any).id || `img-${Date.now()}-${idx}`,
              product_id: id,
              created_at: new Date().toISOString(),
              url: img.url,
              alt_text: img.alt_text || productData.name,
              is_primary: img.is_primary,
              display_order: img.display_order,
            })) as ProductImage[];
          }
          return updated;
        }
        return p;
      });
      saveLocalProducts(local);
    } catch (e) {
      // ignore
    }
    clearProductCache();
  },

  async deleteProduct(id: string): Promise<void> {
    clearProductCache();
    addDeletedProductIds([id]);

    if (isSupabaseConfigured()) {
      try {
        // Also cleanup dependent variants and images if cascade not configured
        await supabase.from('product_images').delete().eq('product_id', id);
        await supabase.from('product_variants').delete().eq('product_id', id);
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) console.warn('Supabase deleteProduct note:', error.message);
      } catch (err) {
        console.warn('Supabase deleteProduct err:', err);
      }
    }
  },

  async deleteMultipleProducts(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    clearProductCache();
    addDeletedProductIds(ids);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('product_images').delete().in('product_id', ids);
        await supabase.from('product_variants').delete().in('product_id', ids);
        const { error } = await supabase.from('products').delete().in('id', ids);
        if (error) console.warn('Supabase deleteMultipleProducts note:', error.message);
      } catch (err) {
        console.warn('Supabase deleteMultipleProducts err:', err);
      }
    }
  },

  async updateMultipleProductsStatus(ids: string[], status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'): Promise<void> {
    if (!ids || ids.length === 0) return;
    const overrides = getStatusOverrides();
    ids.forEach(id => { overrides[id] = status; });
    saveStatusOverrides(overrides);

    const localProds = getLocalProducts().map(p => ids.includes(p.id) ? { ...p, status } : p);
    saveLocalProducts(localProds);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('products').update({ status }).in('id', ids);
        if (error) console.warn('Supabase updateMultipleProductsStatus note:', error.message);
      } catch (err) {
        console.warn('Supabase updateMultipleProductsStatus err:', err);
      }
    }
  },
};
