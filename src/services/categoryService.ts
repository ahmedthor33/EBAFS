import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Category, Subcategory } from '../types';
import { initialCategories } from '../data/initialData';

const getLocalCategories = (): Category[] => {
  try {
    const raw = localStorage.getItem('eba_categories');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [...initialCategories];
};

const saveLocalCategories = (cats: Category[]) => {
  try {
    localStorage.setItem('eba_categories', JSON.stringify(cats));
  } catch (e) {}
};

export const categoryService = {
  async getCategories(gender?: 'MEN' | 'WOMEN' | 'UNISEX'): Promise<Category[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('categories')
          .select('*, subcategories(*)')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (gender) {
          query = query.or(`gender.eq.${gender},gender.eq.UNISEX`);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data as Category[];
        }
      } catch (err) {
        console.warn('Supabase getCategories fallback:', err);
      }
    }

    const local = getLocalCategories();
    if (gender) {
      return local.filter(c => c.gender === gender || c.gender === 'UNISEX');
    }
    return local;
  },

  async getAllCategoriesAdmin(): Promise<Category[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*, subcategories(*)')
          .order('display_order', { ascending: true });
        if (!error && data && data.length > 0) {
          saveLocalCategories(data as Category[]);
          return data as Category[];
        }
      } catch (err) {
        console.warn('Supabase getAllCategoriesAdmin fallback:', err);
      }
    }
    return getLocalCategories();
  },

  async createCategory(cat: Partial<Category>): Promise<Category> {
    const local = getLocalCategories();
    const newCat: Category = {
      id: cat.id || `cat_${Date.now()}`,
      name: cat.name || '',
      slug: cat.slug || '',
      gender: cat.gender || 'WOMEN',
      description: cat.description || '',
      image_url: cat.image_url || '',
      display_order: cat.display_order || local.length + 1,
      is_active: cat.is_active !== undefined ? cat.is_active : true,
      subcategories: [],
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('categories').insert([cat]).select().single();
        if (!error && data) {
          newCat.id = data.id;
        } else if (error) {
          console.warn('Supabase createCategory note:', error.message);
        }
      } catch (err) {
        console.warn('Supabase createCategory exception:', err);
      }
    }

    local.push(newCat);
    saveLocalCategories(local);
    return newCat;
  },

  async updateCategory(id: string, cat: Partial<Category>): Promise<void> {
    const local = getLocalCategories();
    const idx = local.findIndex(c => c.id === id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...cat };
      saveLocalCategories(local);
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('categories').update(cat).eq('id', id);
        if (error) console.warn('Supabase updateCategory note:', error.message);
      } catch (err) {
        console.warn('Supabase updateCategory exception:', err);
      }
    }
  },

  async deleteCategory(id: string): Promise<void> {
    const local = getLocalCategories();
    const filtered = local.filter(c => c.id !== id);
    saveLocalCategories(filtered);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) console.warn('Supabase deleteCategory note:', error.message);
      } catch (err) {
        console.warn('Supabase deleteCategory exception:', err);
      }
    }
  },

  async createSubcategory(sub: Partial<Subcategory>): Promise<Subcategory> {
    const local = getLocalCategories();
    const newSub: Subcategory = {
      id: sub.id || `sub_${Date.now()}`,
      category_id: sub.category_id || '',
      name: sub.name || '',
      slug: sub.slug || '',
      description: sub.description || '',
      display_order: sub.display_order || 1,
      is_active: sub.is_active !== undefined ? sub.is_active : true,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('subcategories').insert([sub]).select().single();
        if (!error && data) {
          newSub.id = data.id;
        } else if (error) {
          console.warn('Supabase createSubcategory note:', error.message);
        }
      } catch (err) {
        console.warn('Supabase createSubcategory exception:', err);
      }
    }

    const parentCat = local.find(c => c.id === sub.category_id);
    if (parentCat) {
      parentCat.subcategories = parentCat.subcategories || [];
      parentCat.subcategories.push(newSub);
      saveLocalCategories(local);
    }

    return newSub;
  },

  async updateSubcategory(id: string, sub: Partial<Subcategory>): Promise<void> {
    const local = getLocalCategories();
    for (const c of local) {
      if (c.subcategories) {
        const sIdx = c.subcategories.findIndex(s => s.id === id);
        if (sIdx !== -1) {
          c.subcategories[sIdx] = { ...c.subcategories[sIdx], ...sub };
          break;
        }
      }
    }
    saveLocalCategories(local);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('subcategories').update(sub).eq('id', id);
        if (error) console.warn('Supabase updateSubcategory note:', error.message);
      } catch (err) {
        console.warn('Supabase updateSubcategory exception:', err);
      }
    }
  },

  async deleteSubcategory(id: string): Promise<void> {
    const local = getLocalCategories();
    for (const c of local) {
      if (c.subcategories) {
        c.subcategories = c.subcategories.filter(s => s.id !== id);
      }
    }
    saveLocalCategories(local);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('subcategories').delete().eq('id', id);
        if (error) console.warn('Supabase deleteSubcategory note:', error.message);
      } catch (err) {
        console.warn('Supabase deleteSubcategory exception:', err);
      }
    }
  },
};
