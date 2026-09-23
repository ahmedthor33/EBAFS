import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Coupon } from '../types';

const defaultCoupons: Coupon[] = [
  {
    id: 'c-welcome-10',
    code: 'WELCOME10',
    description: '10% Welcome privilege discount on your first designer ensemble order',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    min_order_amount: 3000,
    max_discount_amount: 5000,
    is_active: true,
    for_new_customers_only: true,
    times_used: 12,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c-eba-10',
    code: 'EBA10',
    description: '10% Exclusive privilege discount on selected luxury collections',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    min_order_amount: 5000,
    max_discount_amount: 4000,
    is_active: true,
    for_new_customers_only: false,
    times_used: 28,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c-freeship',
    code: 'FREESHIP',
    description: 'Waive standard nationwide shipping fee on your order',
    discount_type: 'FIXED',
    discount_value: 250,
    min_order_amount: 2500,
    is_active: true,
    for_new_customers_only: false,
    times_used: 19,
    created_at: new Date().toISOString(),
  },
];

const getLocalCoupons = (): Coupon[] => {
  if (typeof window === 'undefined') return defaultCoupons;
  try {
    const raw = localStorage.getItem('eba_coupons');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch (e) {
    // ignore
  }
  // Initialize default coupons
  localStorage.setItem('eba_coupons', JSON.stringify(defaultCoupons));
  return defaultCoupons;
};

const saveLocalCoupons = (coupons: Coupon[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('eba_coupons', JSON.stringify(coupons));
    window.dispatchEvent(new CustomEvent('eba_coupons_updated'));
  } catch (e) {
    // ignore
  }
};

export interface CouponValidationResult {
  valid: boolean;
  discountAmount: number;
  coupon?: Coupon;
  message?: string;
  error?: string;
}

export const couponService = {
  // Fetch all coupons for Admin panel
  async getAllCoupons(): Promise<Coupon[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          saveLocalCoupons(data as Coupon[]);
          return data as Coupon[];
        }
      } catch (err) {
        console.warn('Supabase coupons fetch fallback:', err);
      }
    }

    return getLocalCoupons();
  },

  // Create new coupon
  async createCoupon(payload: Omit<Coupon, 'id' | 'created_at' | 'times_used'>): Promise<Coupon> {
    const newCoupon: Coupon = {
      id: `cpn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      code: payload.code.trim().toUpperCase(),
      description: payload.description?.trim() || '',
      discount_type: payload.discount_type,
      discount_value: Number(payload.discount_value),
      min_order_amount: payload.min_order_amount ? Number(payload.min_order_amount) : undefined,
      max_discount_amount: payload.max_discount_amount ? Number(payload.max_discount_amount) : undefined,
      is_active: payload.is_active ?? true,
      expiry_date: payload.expiry_date || undefined,
      for_new_customers_only: Boolean(payload.for_new_customers_only),
      times_used: 0,
      created_at: new Date().toISOString(),
    };

    // 1. Immediately persist locally
    const current = getLocalCoupons();
    // Prevent duplicate codes
    const existingIdx = current.findIndex(c => c.code === newCoupon.code);
    if (existingIdx >= 0) {
      current[existingIdx] = newCoupon;
    } else {
      current.unshift(newCoupon);
    }
    saveLocalCoupons(current);

    // 2. Persist to Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('coupons')
          .upsert(newCoupon)
          .select()
          .single();

        if (!error && data) {
          return data as Coupon;
        }
      } catch (err) {
        console.warn('Supabase coupon save fallback:', err);
      }
    }

    return newCoupon;
  },

  // Update existing coupon
  async updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon | null> {
    const current = getLocalCoupons();
    const idx = current.findIndex(c => c.id === id);
    if (idx === -1) return null;

    const updated: Coupon = {
      ...current[idx],
      ...updates,
      code: updates.code ? updates.code.trim().toUpperCase() : current[idx].code,
    };
    current[idx] = updated;
    saveLocalCoupons(current);

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('coupons')
          .update(updated)
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase coupon update fallback:', err);
      }
    }

    return updated;
  },

  // Delete coupon
  async deleteCoupon(id: string): Promise<boolean> {
    const current = getLocalCoupons();
    const filtered = current.filter(c => c.id !== id);
    saveLocalCoupons(filtered);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('coupons').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase coupon delete fallback:', err);
      }
    }

    return true;
  },

  // Validate coupon against cart/checkout order
  async validateCoupon(
    rawCode: string,
    subtotal: number,
    options?: { isNewCustomer?: boolean; customerEmail?: string }
  ): Promise<CouponValidationResult> {
    if (!rawCode || !rawCode.trim()) {
      return { valid: false, discountAmount: 0, error: 'Please enter a coupon code.' };
    }

    const code = rawCode.trim().toUpperCase();
    const coupons = await this.getAllCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === code);

    if (!coupon) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Coupon "${code}" is invalid or expired. Try "EBA10" or "WELCOME10".`,
      };
    }

    if (!coupon.is_active) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Coupon "${code}" is no longer active.`,
      };
    }

    // Check expiration date
    if (coupon.expiry_date) {
      const exp = new Date(coupon.expiry_date).getTime();
      if (Date.now() > exp) {
        return {
          valid: false,
          discountAmount: 0,
          error: `Coupon "${code}" expired on ${new Date(coupon.expiry_date).toLocaleDateString()}.`,
        };
      }
    }

    // Check new customer constraint
    if (coupon.for_new_customers_only && options?.isNewCustomer === false) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Coupon "${code}" is exclusively reserved for first-time customers.`,
      };
    }

    // Check minimum order subtotal
    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Coupon "${code}" requires a minimum order subtotal of PKR ${coupon.min_order_amount.toLocaleString()}.`,
      };
    }

    // Calculate discount amount
    let discount = 0;
    if (coupon.discount_type === 'PERCENTAGE') {
      discount = Math.round(subtotal * (coupon.discount_value / 100));
      if (coupon.max_discount_amount && discount > coupon.max_discount_amount) {
        discount = coupon.max_discount_amount;
      }
    } else {
      discount = Math.min(subtotal, coupon.discount_value);
    }

    return {
      valid: true,
      discountAmount: discount,
      coupon,
      message: `✓ ${coupon.code} applied: ${
        coupon.discount_type === 'PERCENTAGE'
          ? `${coupon.discount_value}% off`
          : `PKR ${coupon.discount_value.toLocaleString()} off`
      }!`,
    };
  },

  // Record usage count increment
  async recordUsage(code: string): Promise<void> {
    const current = getLocalCoupons();
    const idx = current.findIndex(c => c.code.toUpperCase() === code.toUpperCase());
    if (idx !== -1) {
      current[idx].times_used = (current[idx].times_used || 0) + 1;
      saveLocalCoupons(current);

      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('coupons')
            .update({ times_used: current[idx].times_used })
            .eq('id', current[idx].id);
        } catch (err) {
          // ignore
        }
      }
    }
  },
};
