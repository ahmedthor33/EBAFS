import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables or browser storage fallback
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('eba_supabase_url') || '' : '';
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('eba_supabase_anon_key') || '' : '';

export const supabaseUrl = envUrl || storedUrl;
export const supabaseAnonKey = envKey || storedKey;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey &&
    supabaseAnonKey.length > 20
  );
};

export const saveSupabaseConfig = (url: string, key: string): void => {
  localStorage.setItem('eba_supabase_url', url.trim());
  localStorage.setItem('eba_supabase_anon_key', key.trim());
  window.location.reload();
};

export const clearSupabaseConfig = (): void => {
  localStorage.removeItem('eba_supabase_url');
  localStorage.removeItem('eba_supabase_anon_key');
  window.location.reload();
};

// Fallback dummy client if credentials not entered yet so the app doesn't crash on load
const dummyUrl = 'https://placeholder.supabase.co';
const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const supabase: SupabaseClient = createClient(
  supabaseUrl || dummyUrl,
  supabaseAnonKey || dummyKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Format price in Pakistani Rupees (PKR)
export const formatPKR = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return 'PKR 0';
  }
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `PKR ${numeric.toLocaleString('en-PK', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}`;
};

// Format Date Utility
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
