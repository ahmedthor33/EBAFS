const fs = require('fs');
const path = require('path');
const db = require('../db/database');

const supabaseDir = path.join(__dirname, '..', 'supabase');
if (!fs.existsSync(supabaseDir)) {
  fs.mkdirSync(supabaseDir, { recursive: true });
}

console.log('Generating complete Supabase PostgreSQL schema and seed data...');

let sql = `-- ==============================================================================
-- EBA FASHION STUDIO - LUXURY PAKISTANI UNSTITCHED ECOMMERCE STORE
-- SUPABASE POSTGRESQL PRODUCTION DATABASE SETUP & SEED SCRIPT
-- Project ID: ydycwzcfptlbfvzbyzlb
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. CUSTOMER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notes TEXT,
  total_spent NUMERIC(12,2) DEFAULT 0.00,
  orders_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  street_address TEXT NOT NULL,
  area TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. ROLES & PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.roles_permissions (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  UNIQUE(role, permission)
);

-- 5. BRANDS TABLE
CREATE TABLE IF NOT EXISTS public.brands (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  brand_id INTEGER REFERENCES public.brands(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  short_description TEXT,
  price NUMERIC(10,2) NOT NULL,
  sale_price NUMERIC(10,2),
  cost_price NUMERIC(10,2),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  fabric TEXT,
  season TEXT,
  color TEXT,
  color_hex TEXT,
  product_type TEXT DEFAULT 'unstitched',
  is_featured INTEGER DEFAULT 0,
  is_sale INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. PRODUCT IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT DEFAULT 'gallery',
  sort_order INTEGER DEFAULT 0,
  is_primary INTEGER DEFAULT 0
);

-- 9. WISHLIST TABLE
CREATE TABLE IF NOT EXISTS public.wishlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- 10. CART ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT,
  product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  add_tailoring INTEGER DEFAULT 0,
  tailoring_size TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'percentage',
  value NUMERIC(10,2) NOT NULL,
  min_order NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2),
  usage_limit INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  customer_usage_limit INTEGER DEFAULT 1,
  start_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. COUPON USAGES TABLE
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  order_id INTEGER,
  used_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  area TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  country TEXT DEFAULT 'Pakistan',
  subtotal NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  shipping_fee NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  order_status TEXT DEFAULT 'pending',
  tracking_number TEXT,
  courier_name TEXT DEFAULT 'TCS Express',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES public.products(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  tailoring_selected INTEGER DEFAULT 0,
  tailoring_fee NUMERIC(10,2) DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL,
  image_url TEXT
);

-- 15. INVENTORY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  change_amount INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 16. CMS CONTENT TABLE
CREATE TABLE IF NOT EXISTS public.cms_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.store_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (IDEMPOTENT)
-- ==============================================================================

-- Enable RLS across tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to catalog, CMS, and settings for storefront browsing
DROP POLICY IF EXISTS "Allow public read on brands" ON public.brands;
CREATE POLICY "Allow public read on brands" ON public.brands FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on categories" ON public.categories;
CREATE POLICY "Allow public read on categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on products" ON public.products;
CREATE POLICY "Allow public read on products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on product_images" ON public.product_images;
CREATE POLICY "Allow public read on product_images" ON public.product_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on coupons" ON public.coupons;
CREATE POLICY "Allow public read on coupons" ON public.coupons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on cms_content" ON public.cms_content;
CREATE POLICY "Allow public read on cms_content" ON public.cms_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on store_settings" ON public.store_settings;
CREATE POLICY "Allow public read on store_settings" ON public.store_settings FOR SELECT USING (true);

-- Allow public cart management
DROP POLICY IF EXISTS "Allow public read cart" ON public.cart_items;
CREATE POLICY "Allow public read cart" ON public.cart_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert cart" ON public.cart_items;
CREATE POLICY "Allow public insert cart" ON public.cart_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update cart" ON public.cart_items;
CREATE POLICY "Allow public update cart" ON public.cart_items FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete cart" ON public.cart_items;
CREATE POLICY "Allow public delete cart" ON public.cart_items FOR DELETE USING (true);

-- Allow public order submission
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
CREATE POLICY "Allow public insert orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select orders" ON public.orders;
CREATE POLICY "Allow public select orders" ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert order_items" ON public.order_items;
CREATE POLICY "Allow public insert order_items" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select order_items" ON public.order_items;
CREATE POLICY "Allow public select order_items" ON public.order_items FOR SELECT USING (true);

-- Allow public wishlist actions
DROP POLICY IF EXISTS "Allow public read wishlist" ON public.wishlist;
CREATE POLICY "Allow public read wishlist" ON public.wishlist FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert wishlist" ON public.wishlist;
CREATE POLICY "Allow public insert wishlist" ON public.wishlist FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete wishlist" ON public.wishlist;
CREATE POLICY "Allow public delete wishlist" ON public.wishlist FOR DELETE USING (true);

-- Allow service role and admins full access
DROP POLICY IF EXISTS "Allow admin full access to users" ON public.users;
CREATE POLICY "Allow admin full access to users" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to customer_profiles" ON public.customer_profiles;
CREATE POLICY "Allow admin full access to customer_profiles" ON public.customer_profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to addresses" ON public.addresses;
CREATE POLICY "Allow admin full access to addresses" ON public.addresses FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to inventory_logs" ON public.inventory_logs;
CREATE POLICY "Allow admin full access to inventory_logs" ON public.inventory_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to roles_permissions" ON public.roles_permissions;
CREATE POLICY "Allow admin full access to roles_permissions" ON public.roles_permissions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to brands" ON public.brands;
CREATE POLICY "Allow admin full access to brands" ON public.brands FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to categories" ON public.categories;
CREATE POLICY "Allow admin full access to categories" ON public.categories FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to products" ON public.products;
CREATE POLICY "Allow admin full access to products" ON public.products FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to product_images" ON public.product_images;
CREATE POLICY "Allow admin full access to product_images" ON public.product_images FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to coupons" ON public.coupons;
CREATE POLICY "Allow admin full access to coupons" ON public.coupons FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to coupon_usages" ON public.coupon_usages;
CREATE POLICY "Allow admin full access to coupon_usages" ON public.coupon_usages FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to orders" ON public.orders;
CREATE POLICY "Allow admin full access to orders" ON public.orders FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to order_items" ON public.order_items;
CREATE POLICY "Allow admin full access to order_items" ON public.order_items FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to cms_content" ON public.cms_content;
CREATE POLICY "Allow admin full access to cms_content" ON public.cms_content FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to store_settings" ON public.store_settings;
CREATE POLICY "Allow admin full access to store_settings" ON public.store_settings FOR ALL USING (true);

-- ==============================================================================
-- SEED DATA INSERTION
-- ==============================================================================
`;

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  return `'${String(val).replace(/'/g, "''")}'`;
}

// 1. Roles & Permissions
const rolesPerms = db.prepare('SELECT role, permission FROM roles_permissions').all();
if (rolesPerms.length > 0) {
  sql += `\n-- Seed Roles & Permissions\nINSERT INTO public.roles_permissions (role, permission) VALUES\n`;
  sql += rolesPerms.map(r => `  (${escapeSql(r.role)}, ${escapeSql(r.permission)})`).join(',\n');
  sql += `\nON CONFLICT (role, permission) DO NOTHING;\n`;
}

// 2. Users
const users = db.prepare('SELECT id, name, email, phone, password_hash, role, status FROM users').all();
if (users.length > 0) {
  sql += `\n-- Seed Users\nINSERT INTO public.users (id, name, email, phone, password_hash, role, status) VALUES\n`;
  sql += users.map(u => `  (${u.id}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.phone)}, ${escapeSql(u.password_hash)}, ${escapeSql(u.role)}, ${escapeSql(u.status)})`).join(',\n');
  sql += `\nON CONFLICT (email) DO NOTHING;\nSELECT setval('public.users_id_seq', COALESCE((SELECT MAX(id) FROM public.users), 1), true);\n`;
}

// 3. Customer Profiles & Addresses
const profiles = db.prepare('SELECT id, user_id, notes, total_spent, orders_count FROM customer_profiles').all();
if (profiles.length > 0) {
  sql += `\n-- Seed Customer Profiles\nINSERT INTO public.customer_profiles (id, user_id, notes, total_spent, orders_count) VALUES\n`;
  sql += profiles.map(p => `  (${p.id}, ${p.user_id}, ${escapeSql(p.notes)}, ${p.total_spent}, ${p.orders_count})`).join(',\n');
  sql += `\nON CONFLICT (user_id) DO NOTHING;\nSELECT setval('public.customer_profiles_id_seq', COALESCE((SELECT MAX(id) FROM public.customer_profiles), 1), true);\n`;
}

const addresses = db.prepare('SELECT id, user_id, full_name, phone, street_address, area, city, province, postal_code, is_default FROM addresses').all();
if (addresses.length > 0) {
  sql += `\n-- Seed Addresses\nINSERT INTO public.addresses (id, user_id, full_name, phone, street_address, area, city, province, postal_code, is_default) VALUES\n`;
  sql += addresses.map(a => `  (${a.id}, ${a.user_id}, ${escapeSql(a.full_name)}, ${escapeSql(a.phone)}, ${escapeSql(a.street_address)}, ${escapeSql(a.area)}, ${escapeSql(a.city)}, ${escapeSql(a.province)}, ${escapeSql(a.postal_code)}, ${a.is_default})`).join(',\n');
  sql += `\nON CONFLICT DO NOTHING;\nSELECT setval('public.addresses_id_seq', COALESCE((SELECT MAX(id) FROM public.addresses), 1), true);\n`;
}

// 4. Brands
const brands = db.prepare('SELECT id, name, slug, description, logo_url, is_active FROM brands').all();
if (brands.length > 0) {
  sql += `\n-- Seed Brands\nINSERT INTO public.brands (id, name, slug, description, logo_url, is_active) VALUES\n`;
  sql += brands.map(b => `  (${b.id}, ${escapeSql(b.name)}, ${escapeSql(b.slug)}, ${escapeSql(b.description)}, ${escapeSql(b.logo_url)}, ${b.is_active})`).join(',\n');
  sql += `\nON CONFLICT (slug) DO NOTHING;\nSELECT setval('public.brands_id_seq', COALESCE((SELECT MAX(id) FROM public.brands), 1), true);\n`;
}

// 5. Categories
const categories = db.prepare('SELECT id, parent_id, name, slug, description, image_url, sort_order, is_active FROM categories').all();
if (categories.length > 0) {
  sql += `\n-- Seed Categories\nINSERT INTO public.categories (id, parent_id, name, slug, description, image_url, sort_order, is_active) VALUES\n`;
  sql += categories.map(c => `  (${c.id}, ${c.parent_id === null ? 'NULL' : c.parent_id}, ${escapeSql(c.name)}, ${escapeSql(c.slug)}, ${escapeSql(c.description)}, ${escapeSql(c.image_url)}, ${c.sort_order}, ${c.is_active})`).join(',\n');
  sql += `\nON CONFLICT (slug) DO NOTHING;\nSELECT setval('public.categories_id_seq', COALESCE((SELECT MAX(id) FROM public.categories), 1), true);\n`;
}

// 6. Products
const products = db.prepare('SELECT * FROM products').all();
if (products.length > 0) {
  sql += `\n-- Seed Products\nINSERT INTO public.products (id, name, slug, sku, brand_id, category_id, subcategory_id, description, short_description, price, sale_price, cost_price, stock_quantity, low_stock_threshold, fabric, season, color, color_hex, product_type, is_featured, is_sale, status) VALUES\n`;
  sql += products.map(p => `  (${p.id}, ${escapeSql(p.name)}, ${escapeSql(p.slug)}, ${escapeSql(p.sku)}, ${p.brand_id || 'NULL'}, ${p.category_id || 'NULL'}, ${p.subcategory_id || 'NULL'}, ${escapeSql(p.description)}, ${escapeSql(p.short_description)}, ${p.price}, ${escapeSql(p.sale_price)}, ${escapeSql(p.cost_price)}, ${p.stock_quantity}, ${p.low_stock_threshold}, ${escapeSql(p.fabric)}, ${escapeSql(p.season)}, ${escapeSql(p.color)}, ${escapeSql(p.color_hex)}, ${escapeSql(p.product_type)}, ${p.is_featured}, ${p.is_sale}, ${escapeSql(p.status)})`).join(',\n');
  sql += `\nON CONFLICT (slug) DO NOTHING;\nSELECT setval('public.products_id_seq', COALESCE((SELECT MAX(id) FROM public.products), 1), true);\n`;
}

// 7. Product Images
const images = db.prepare('SELECT id, product_id, image_url, image_type, sort_order, is_primary FROM product_images').all();
if (images.length > 0) {
  sql += `\n-- Seed Product Images\nINSERT INTO public.product_images (id, product_id, image_url, image_type, sort_order, is_primary) VALUES\n`;
  sql += images.map(img => `  (${img.id}, ${img.product_id}, ${escapeSql(img.image_url)}, ${escapeSql(img.image_type)}, ${img.sort_order}, ${img.is_primary})`).join(',\n');
  sql += `\nON CONFLICT DO NOTHING;\nSELECT setval('public.product_images_id_seq', COALESCE((SELECT MAX(id) FROM public.product_images), 1), true);\n`;
}

// 8. Coupons
const coupons = db.prepare('SELECT * FROM coupons').all();
if (coupons.length > 0) {
  sql += `\n-- Seed Coupons\nINSERT INTO public.coupons (id, code, type, value, min_order, max_discount, usage_limit, used_count, customer_usage_limit, is_active) VALUES\n`;
  sql += coupons.map(cp => `  (${cp.id}, ${escapeSql(cp.code)}, ${escapeSql(cp.type)}, ${cp.value}, ${cp.min_order}, ${escapeSql(cp.max_discount)}, ${cp.usage_limit}, ${cp.used_count}, ${cp.customer_usage_limit}, ${cp.is_active})`).join(',\n');
  sql += `\nON CONFLICT (code) DO NOTHING;\nSELECT setval('public.coupons_id_seq', COALESCE((SELECT MAX(id) FROM public.coupons), 1), true);\n`;
}

// 9. CMS Content & Store Settings
const cms = db.prepare('SELECT key, value FROM cms_content').all();
if (cms.length > 0) {
  sql += `\n-- Seed CMS Content\nINSERT INTO public.cms_content (key, value) VALUES\n`;
  sql += cms.map(c => `  (${escapeSql(c.key)}, ${escapeSql(c.value)})`).join(',\n');
  sql += `\nON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;\n`;
}

const settings = db.prepare('SELECT key, value FROM store_settings').all();
if (settings.length > 0) {
  sql += `\n-- Seed Store Settings\nINSERT INTO public.store_settings (key, value) VALUES\n`;
  sql += settings.map(s => `  (${escapeSql(s.key)}, ${escapeSql(s.value)})`).join(',\n');
  sql += `\nON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;\n`;
}

const outputPath = path.join(supabaseDir, 'setup.sql');
fs.writeFileSync(outputPath, sql, 'utf8');
console.log(`Generated ${outputPath} (${sql.length} bytes)!`);
