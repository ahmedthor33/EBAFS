import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Brand } from '../types';
import { initialBrands } from '../data/initialData';

let cachedBrands: { data: Brand[]; timestamp: number } | null = null;
const BRAND_CACHE_TTL = 5 * 60 * 1000;

export const brandService = {
  async getBrands(onlyActive = true): Promise<Brand[]> {
    if (cachedBrands && (Date.now() - cachedBrands.timestamp < BRAND_CACHE_TTL)) {
      return onlyActive ? cachedBrands.data.filter(b => b.is_active) : cachedBrands.data;
    }

    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('brands').select('*').order('display_order', { ascending: true });
        if (onlyActive) {
          query = query.eq('is_active', true);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          cachedBrands = { data: data as Brand[], timestamp: Date.now() };
          return data as Brand[];
        }
      } catch (err) {
        console.warn('Supabase getBrands fallback:', err);
      }
    }
    const fallback = onlyActive ? initialBrands.filter(b => b.is_active) : initialBrands;
    return fallback;
  },

  async getFeaturedBrands(): Promise<Brand[]> {
    const brands = await this.getBrands(true);
    return brands.filter(b => b.is_featured);
  },

  async getBrandBySlug(slug: string): Promise<Brand | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('brands')
          .select('*')
          .eq('slug', slug)
          .single();
        if (!error && data) return data as Brand;
      } catch (err) {
        console.warn('Supabase getBrandBySlug fallback:', err);
      }
    }
    return initialBrands.find(b => b.slug === slug) || null;
  },

  async createBrand(brandData: Partial<Brand>): Promise<Brand> {
    cachedBrands = null;
    const { data, error } = await supabase.from('brands').insert([brandData]).select().single();
    if (error) throw error;
    return data as Brand;
  },

  async updateBrand(id: string, brandData: Partial<Brand>): Promise<void> {
    cachedBrands = null;
    const { error } = await supabase.from('brands').update(brandData).eq('id', id);
    if (error) throw error;
  },

  async deleteBrand(id: string): Promise<void> {
    cachedBrands = null;
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) throw error;
  },
};
