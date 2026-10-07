-- ==============================================================================
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

-- Dynamically drop existing policies on public tables to avoid duplicates
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 1. BRANDS
CREATE POLICY "brands_policy" ON public.brands
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (length(trim(name)) > 0 AND length(trim(slug)) > 0);

-- 2. CATEGORIES
CREATE POLICY "categories_policy" ON public.categories
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (length(trim(name)) > 0 AND length(trim(slug)) > 0);

-- 3. PRODUCTS
CREATE POLICY "products_policy" ON public.products
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (length(trim(name)) > 0 AND length(trim(sku)) > 0 AND price >= 0);

-- 4. PRODUCT IMAGES
CREATE POLICY "product_images_policy" ON public.product_images
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (length(trim(image_url)) > 0 AND product_id > 0);

-- 5. COUPONS
CREATE POLICY "coupons_policy" ON public.coupons
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (length(trim(code)) > 0 AND value >= 0);

-- 6. COUPON USAGES
CREATE POLICY "coupon_usages_policy" ON public.coupon_usages
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (coupon_id > 0);

-- 7. CMS CONTENT
CREATE POLICY "cms_content_policy" ON public.cms_content
  FOR ALL TO anon, authenticated
  USING (length(trim(key)) > 0)
  WITH CHECK (length(trim(key)) > 0 AND length(value) >= 0);

-- 8. STORE SETTINGS
CREATE POLICY "store_settings_policy" ON public.store_settings
  FOR ALL TO anon, authenticated
  USING (length(trim(key)) > 0)
  WITH CHECK (length(trim(key)) > 0 AND length(value) >= 0);

-- 9. CART ITEMS
CREATE POLICY "cart_items_policy" ON public.cart_items
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (product_id > 0 AND quantity > 0);

-- 10. WISHLIST
CREATE POLICY "wishlist_policy" ON public.wishlist
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (product_id > 0 AND user_id > 0);

-- 11. ORDERS
CREATE POLICY "orders_policy" ON public.orders
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (length(trim(order_number)) > 0 AND total >= 0);

-- 12. ORDER ITEMS
CREATE POLICY "order_items_policy" ON public.order_items
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (order_id > 0 AND quantity > 0);

-- 13. USERS
CREATE POLICY "users_policy" ON public.users
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (length(trim(email)) > 3 AND length(trim(password_hash)) > 0);

-- 14. CUSTOMER PROFILES
CREATE POLICY "customer_profiles_policy" ON public.customer_profiles
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (user_id > 0);

-- 15. ADDRESSES
CREATE POLICY "addresses_policy" ON public.addresses
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (user_id > 0 AND length(trim(full_name)) > 0);

-- 16. INVENTORY LOGS
CREATE POLICY "inventory_logs_policy" ON public.inventory_logs
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (product_id > 0 AND length(trim(reason)) > 0);

-- 17. ROLES & PERMISSIONS
CREATE POLICY "roles_permissions_policy" ON public.roles_permissions
  FOR ALL TO anon, authenticated
  USING (id > 0)
  WITH CHECK (length(trim(role)) > 0 AND length(trim(permission)) > 0);


-- ==============================================================================
-- SEED DATA INSERTION
-- ==============================================================================

-- Seed Roles & Permissions
INSERT INTO public.roles_permissions (role, permission) VALUES
  ('superadmin', 'products.view'),
  ('superadmin', 'products.create'),
  ('superadmin', 'products.edit'),
  ('superadmin', 'products.delete'),
  ('superadmin', 'orders.view'),
  ('superadmin', 'orders.edit'),
  ('superadmin', 'customers.view'),
  ('superadmin', 'customers.edit'),
  ('superadmin', 'inventory.view'),
  ('superadmin', 'inventory.edit'),
  ('superadmin', 'categories.manage'),
  ('superadmin', 'brands.manage'),
  ('superadmin', 'coupons.manage'),
  ('superadmin', 'homepage.manage'),
  ('superadmin', 'reports.view'),
  ('superadmin', 'settings.manage'),
  ('superadmin', 'users.manage'),
  ('superadmin', 'roles.manage'),
  ('admin', 'products.view'),
  ('admin', 'products.create'),
  ('admin', 'products.edit'),
  ('admin', 'products.delete'),
  ('admin', 'orders.view'),
  ('admin', 'orders.edit'),
  ('admin', 'customers.view'),
  ('admin', 'customers.edit'),
  ('admin', 'inventory.view'),
  ('admin', 'inventory.edit'),
  ('admin', 'categories.manage'),
  ('admin', 'brands.manage'),
  ('admin', 'coupons.manage'),
  ('admin', 'homepage.manage'),
  ('admin', 'reports.view'),
  ('admin', 'settings.manage'),
  ('staff', 'products.view'),
  ('staff', 'inventory.view'),
  ('staff', 'inventory.edit'),
  ('staff', 'orders.view'),
  ('staff', 'orders.edit')
ON CONFLICT (role, permission) DO NOTHING;

-- Seed Users
INSERT INTO public.users (id, name, email, phone, password_hash, role, status) VALUES
  (3, 'Fatima Noor', 'fatima@example.com', '+92 321 8456789', '$2b$10$oy4qyyVrW.V0GJe2znST1uJnSFofLcOvRfusHeIpBh8wZPcTtkRle', 'customer', 'active'),
  (4, 'Ahmed (Owner & Super Admin)', 'ahmedthor33@gmail.com', '+92 300 0000000', '$2b$10$SL9atvvZNgaiCq15KxZcBONO.DNleu5erAxvGymOvqzu6fxP38e5O', 'superadmin', 'active')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, name = EXCLUDED.name, status = EXCLUDED.status;
SELECT setval('public.users_id_seq', COALESCE((SELECT MAX(id) FROM public.users), 1), true);

-- Seed Customer Profiles
INSERT INTO public.customer_profiles (id, user_id, notes, total_spent, orders_count) VALUES
  (1, 3, 'VIP Patron. Prefers lawn and raw silk unstitched ensembles.', 31600, 2)
ON CONFLICT (user_id) DO NOTHING;
SELECT setval('public.customer_profiles_id_seq', COALESCE((SELECT MAX(id) FROM public.customer_profiles), 1), true);

-- Seed Addresses
INSERT INTO public.addresses (id, user_id, full_name, phone, street_address, area, city, province, postal_code, is_default) VALUES
  (1, 3, 'Fatima Noor', '+92 321 8456789', 'House 14-B, Street 32', 'Sector F-7/2', 'Islamabad', 'Islamabad Capital Territory', '44000', 1),
  (2, 3, 'Fatima Noor', '+92 321 8456789', 'House 14-B, Street 32', 'Sector F-7/2', 'Islamabad', 'Islamabad Capital Territory', '44000', 1)
ON CONFLICT DO NOTHING;
SELECT setval('public.addresses_id_seq', COALESCE((SELECT MAX(id) FROM public.addresses), 1), true);

-- Seed Brands
INSERT INTO public.brands (id, name, slug, description, logo_url, is_active) VALUES
  (1, 'EBA Signature Atelier', 'eba-signature-atelier', 'Couture hand-finished Pakistani master unstitched fabrics', '/assets/logo.png', 1),
  (2, 'EBA Royal Weaves', 'eba-royal-weaves', 'Aristocratic Egyptian Giza Cotton & Pure Boski silks', '/assets/logo.png', 1),
  (3, 'EBA Heritage Looms', 'eba-heritage-looms', 'Traditional handcrafted Karandi & authentic Khaddar weaves', '/assets/logo.png', 1)
ON CONFLICT (slug) DO NOTHING;
SELECT setval('public.brands_id_seq', COALESCE((SELECT MAX(id) FROM public.brands), 1), true);

-- Seed Categories
INSERT INTO public.categories (id, parent_id, name, slug, description, image_url, sort_order, is_active) VALUES
  (1, NULL, 'Men', 'men', 'Distinguished Pakistani Men''s Unstitched Fabrics', '/assets/men_luxury_unstitched.png', 1, 1),
  (2, NULL, 'Women', 'women', 'Haute Couture Women''s Unstitched Collections', '/assets/woman_opulent_lawn.png', 2, 1),
  (3, 1, 'Egyptian Cotton 120s', 'egyptian-cotton-120s', 'High-density 120s combed Giza yarn for regal drape', '/assets/men_collection.png', 1, 1),
  (4, 1, 'Pure Boski', 'pure-boski', '8-Pound heavy silk unstitched length for festive gatherings', '/assets/men_luxury_unstitched.png', 2, 1),
  (5, 1, 'Winter Karandi', 'winter-karandi', 'Warm structured textured heritage Karandi suits', '/assets/men_collection.png', 3, 1),
  (6, 1, 'Wash & Wear Luxury', 'wash-and-wear-luxury', 'Microfiber high-twist wrinkle-resistant formal cuts', '/assets/men_luxury_unstitched.png', 4, 1),
  (7, 1, 'Classic Latha', 'classic-latha', 'Stiff finish pristine white heirloom cotton', '/assets/men_collection.png', 5, 1),
  (8, 2, 'Festive Lawn ''25', 'festive-lawn-25', 'Embroidered festive Swiss lawn with pure silk & chiffon dupattas', '/assets/woman_opulent_lawn.png', 1, 1),
  (9, 2, 'Schiffli Organza', 'schiffli-organza', 'Laser-cut schiffli embroidery on fine lawn and organza', '/assets/women_collection.png', 2, 1),
  (10, 2, 'Pure Silk Chiffon', 'pure-silk-chiffon', 'Opulent raw silk and printed pure crinkle chiffon ensembles', '/assets/gul_e_noor_details.png', 3, 1),
  (11, 2, 'Embroidered Khaddar', 'embroidered-khaddar', 'Winter handspun khaddar with Kashmiri woolen shawls', '/assets/woman_opulent_lawn.png', 4, 1)
ON CONFLICT (slug) DO NOTHING;
SELECT setval('public.categories_id_seq', COALESCE((SELECT MAX(id) FROM public.categories), 1), true);

-- Seed Products
INSERT INTO public.products (id, name, slug, sku, brand_id, category_id, subcategory_id, description, short_description, price, sale_price, cost_price, stock_quantity, low_stock_threshold, fabric, season, color, color_hex, product_type, is_featured, is_sale, status) VALUES
  (1, 'Gul-e-Noor 3-Piece Luxury Festive Lawn Ensemble', 'gul-e-noor-3-piece-luxury-festive-lawn', 'EBA-W-25-01', 1, 2, 8, 'The Gul-e-Noor suite represents our atelier’s dedication to Pakistani textile heritage. Crafted on 80s fine Supima lawn with high thread count, it features intricate marori needlework along the neckline, daman, and sleeves. Paired with a gossamer pure silk chiffon dupatta and structured cambric trouser.', 'Opulent 3-piece festive lawn with marori and gold zari embroidery, accompanied by a 2.5m printed pure chiffon dupatta and dyed cambric trouser.', 15800, 14200, 8500, 20, 5, 'Supima Lawn 80s & Pure Chiffon', 'Festive / Spring 2025', 'Dusty Rose & Antique Gold', '#c9a296', '3-Piece Unstitched', 1, 1, 'published'),
  (2, 'Shahkaar Egyptian Giza 120s Kurta Shalwar', 'shahkaar-egyptian-giza-120s-kurta-shalwar', 'EBA-M-25-01', 2, 1, 3, 'Spun from authentic Egyptian long-staple Giza fiber, Shahkaar achieves an extraordinarily soft yet structured drape. Designed for formal wear and boardroom elegance, this suit retains its sharp silhouette in humid and warm climates.', 'Monumental 4.5m Egyptian cotton unstitched suit fabric with a silken matte finish and impeccable crease resistance.', 12800, NULL, 7000, 35, 6, '100% Combed Egyptian Giza Cotton 120s', 'All Season / Formal', 'Charcoal Obsidian', '#212224', 'Unstitched 4.5m', 1, 0, 'published'),
  (3, 'Zarmineh Schiffli Organza Couture Suite', 'zarmineh-schiffli-organza-couture-suite', 'EBA-W-25-02', 1, 2, 9, 'The Zarmineh collection captures royal garden splendor. Featuring laser-cut schiffli cutwork motifs embedded into fine lawn, finished with a luminous metallic zari organza dupatta.', 'Mint sage green designer unstitched lawn with heavy zari schiffli organza dupatta and hand-finished neckline border.', 19500, NULL, 11000, 18, 4, 'Laser Schiffli Organza & Lawn', 'Festive / Eid Edition', 'Sage Green & Ivory', '#a3b19b', '3-Piece Unstitched', 1, 0, 'published'),
  (4, 'Dastoor Textured Winter Karandi Ensemble', 'dastoor-textured-winter-karandi-ensemble', 'EBA-M-25-02', 3, 1, 5, 'Dastoor is woven by master artisans in Pakistan utilizing age-old slub technique, giving it natural textured character with reassuring warmth for winter occasions and evening ceremonies.', 'Heirloom handspun textured Karandi tailored for winter dignity and sovereign comfort.', 14500, 12900, 8000, 20, 4, 'Handspun Woven Karandi Fabric', 'Autumn / Winter', 'Camel Taupe', '#967d60', 'Unstitched 4.0m', 1, 1, 'published'),
  (5, 'Koh-e-Noor Pure 8-Pound Chinese Boski', 'koh-e-noor-pure-8-pound-chinese-boski', 'EBA-M-25-03', 2, 1, 4, 'The definitive royal attire for celebratory occasions. Each 4.5-meter cut of Koh-e-Noor Boski carries the genuine heavyweight 8-pound certification seal and provides unparalleled silken softness against the skin.', 'Authentic 8-Pound heavy Chinese silk Boski with peerless luster, fluid drape, and heritage prestige.', 24500, NULL, 16000, 12, 3, '100% Spun Silk (Original 8-Pound Weight)', 'Festive / Wedding', 'Pristine Cream Ivory', '#f5f0e1', 'Unstitched 4.5m', 1, 0, 'published'),
  (6, 'Mehr-o-Mah Heavy Resham Raw Silk 3-Piece', 'mehr-o-mah-heavy-resham-raw-silk-3-piece', 'EBA-W-25-03', 1, 2, 10, 'Rich garnet red raw silk adorned with Kashmiri resham tilla motifs. Includes 3.25m raw silk shirt, matching dyed silk trousers, and an organza jacquard dupatta trimmed with artisan borders.', 'Majestic garnet red raw silk unstitched suite embellished with resham threadwork, gold foil, and heavy borders.', 22000, NULL, 13000, 8, 2, 'Pure Raw Silk 80g & Organza Jacquard', 'Festive / Wedding Guest', 'Garnet Crimson & Gold', '#8b1e2d', '3-Piece Unstitched', 0, 0, 'published'),
  (7, 'Sarmast High-Twist Wrinkle-Resistant Wash & Wear', 'sarmast-high-twist-wash-and-wear', 'EBA-M-25-04', 3, 1, 6, 'Designed for daily elegance, Sarmast combines high-twist poly-viscose yarns to offer maximum wrinkle recovery and easy home laundering without losing its pristine look.', 'Daily executive wash & wear fabric with cool breathability, structured fall, and iron-free maintenance.', 9500, 8500, 5000, 42, 8, 'High-Twist Microfiber Poly-Viscose Blend', 'Spring / Summer', 'Deep Midnight Navy', '#182436', 'Unstitched 4.25m', 0, 1, 'published'),
  (8, 'Noor-e-Jahan Swiss Cambric & Schiffli 3-Piece', 'noor-e-jahan-swiss-cambric-schiffli', 'EBA-W-25-04', 1, 2, 9, 'A serene study in white and champagne gold. Features exquisite tonal embroidery on Swiss cambric fabric with a lightweight flowing chiffon dupatta.', 'Pristine pearl white cambric with delicate gold zari embroidery and hand-printed silk chiffon dupatta.', 16500, 14900, 9000, 16, 4, 'Fine Swiss Cambric & Chiffon', 'Summer / Eid', 'Pearl White & Gold', '#edeae1', '3-Piece Unstitched', 0, 1, 'published'),
  (9, 'Iqbalian Classic Latha Unstitched Fabric', 'iqbalian-classic-latha-unstitched-fabric', 'EBA-M-25-05', 2, 1, 7, 'The golden standard of Pakistani traditional attire. Spun from 100% pure long-staple cotton, this classic Latha features a crisp finish that maintains sharp creases and royal poise.', 'Traditional crisp starched finish classic Latha fabric crafted for authentic Pakistani Shalwar Kameez.', 8900, NULL, 4500, 50, 10, '100% Fine Long-Staple Cotton Latha', 'Summer / All Season', 'Crisp Bleached White', '#ffffff', 'Unstitched 4.5m', 0, 0, 'published'),
  (10, 'Bahaar Kashmiri Embroidered Winter Khaddar', 'bahaar-kashmiri-embroidered-winter-khaddar', 'EBA-W-25-05', 3, 2, 11, 'Hand-crafted for winter warmth, Bahaar marries the rich texture of traditional Pakistani Khaddar with floral Kashmiri embroidery and a luxuriously soft woven wool shawl.', 'Cozy authentic handloom khaddar suit accompanied by a 2.5m pure woolen warm jacquard shawl.', 18200, NULL, 10500, 14, 3, 'Handloom Khaddar & Pure Wool Shawl', 'Winter 2025', 'Pistachio Moss & Rust', '#7c8d76', '3-Piece Unstitched with Shawl', 1, 0, 'published')
ON CONFLICT (slug) DO NOTHING;
SELECT setval('public.products_id_seq', COALESCE((SELECT MAX(id) FROM public.products), 1), true);

-- Seed Product Images
INSERT INTO public.product_images (id, product_id, image_url, image_type, sort_order, is_primary) VALUES
  (24, 1, '/assets/gul_e_noor_details.png', 'primary', 0, 1),
  (25, 1, '/assets/woman_opulent_lawn.png', 'gallery', 1, 0),
  (26, 1, '/assets/women_collection.png', 'detail', 2, 0),
  (27, 2, '/assets/men_luxury_unstitched.png', 'primary', 0, 1),
  (28, 2, '/assets/hero_campaign_split.png', 'gallery', 1, 0),
  (29, 2, '/assets/men_collection.png', 'detail', 2, 0),
  (30, 3, '/assets/woman_opulent_lawn.png', 'primary', 0, 1),
  (31, 3, '/assets/women_collection.png', 'gallery', 1, 0),
  (32, 3, '/assets/gul_e_noor_details.png', 'detail', 2, 0),
  (33, 4, '/assets/men_collection.png', 'primary', 0, 1),
  (34, 4, '/assets/men_luxury_unstitched.png', 'gallery', 1, 0),
  (35, 5, '/assets/hero_campaign_split.png', 'primary', 0, 1),
  (36, 5, '/assets/men_luxury_unstitched.png', 'gallery', 1, 0),
  (37, 6, '/assets/women_collection.png', 'primary', 0, 1),
  (38, 6, '/assets/gul_e_noor_details.png', 'gallery', 1, 0),
  (39, 7, '/assets/men_luxury_unstitched.png', 'primary', 0, 1),
  (40, 7, '/assets/men_collection.png', 'gallery', 1, 0),
  (41, 8, '/assets/woman_opulent_lawn.png', 'primary', 0, 1),
  (42, 8, '/assets/gul_e_noor_details.png', 'gallery', 1, 0),
  (43, 9, '/assets/men_collection.png', 'primary', 0, 1),
  (44, 9, '/assets/hero_campaign_split.png', 'gallery', 1, 0),
  (45, 10, '/assets/women_collection.png', 'primary', 0, 1),
  (46, 10, '/assets/woman_opulent_lawn.png', 'gallery', 1, 0)
ON CONFLICT DO NOTHING;
SELECT setval('public.product_images_id_seq', COALESCE((SELECT MAX(id) FROM public.product_images), 1), true);

-- Seed Coupons
INSERT INTO public.coupons (id, code, type, value, min_order, max_discount, usage_limit, used_count, customer_usage_limit, is_active) VALUES
  (1, 'WELCOME10', 'percentage', 10, 10000, 3000, 500, 4, 1, 1),
  (2, 'FESTIVE25', 'fixed', 2500, 15000, 2500, 200, 0, 1, 1),
  (3, 'VIPATELIER', 'percentage', 15, 20000, 5000, 100, 0, 1, 1)
ON CONFLICT (code) DO NOTHING;
SELECT setval('public.coupons_id_seq', COALESCE((SELECT MAX(id) FROM public.coupons), 1), true);

-- Seed CMS Content
INSERT INTO public.cms_content (key, value) VALUES
  ('announcement_bar', '{"text":"Exclusive Festive Eid Drop Now Live | Free Express Delivery Across Pakistan","enabled":true}'),
  ('hero_banner', '{"tagline":"Unstitched Autumn/Festive ’25 Edition","title":"The Art of Pakistani Weaves","subtitle":"Exquisite unstitched fabrics tailored for the discerning connoisseur — Hand-selected Egyptian Cotton, Festive Lawn, and Raw Silk woven across premier Pakistani mills.","image":"/assets/hero_campaign_editorial.png","badge1":"Complimentary Nationwide Shipping","badge2":"Cash on Delivery Available","cta_men_text":"Explore Men''s Unstitched","cta_men_link":"#men","cta_women_text":"Explore Women''s Festive Lawn","cta_women_link":"#women","enabled":true}'),
  ('portal_sections', '{"men":{"badge":"Men''s Atelier","edition":"Autumn / Winter Weaves • 01","title":"The Gentleman''s Edit","description":"Timeless unstitched Latha, structured winter Karandi, luxurious pure Boski, and crease-resistant high-twist Wash & Wear cuts.","image":"/assets/men_luxury_unstitched.png","tags":["Egyptian 120s","Winter Karandi","Raw Silk 4.5m"],"cta_text":"Shop Men","link":"#men"},"women":{"badge":"Festive ''25 Preview","edition":"Festive Lawn Drop • 02","title":"The Couture Lawn ’25","description":"Intricate Kashmiri tilla motifs, jacquard borders, printed chiffon dupattas, and three-piece unstitched masterpieces woven on Swiss looms.","image":"/assets/woman_opulent_lawn.png","tags":["Schiffli Lawn","Silk Dupatta","3-Piece Suite"],"cta_text":"Shop Women","link":"#women"}}'),
  ('running_ticker', '["100% Authentic Thread Counts","Pure Supima & Egyptian Cotton 120s","Master Artisan Embroideries","Worldwide DHL Express Delivery","Bespoke Studio Master-Tailoring"]'),
  ('promotional_banner', '{"title":"Curated Atelier Packaging","subtitle":"Every unstitched length is delivered in a climate-sealed monogrammed heirloom box with authentic yardage certification.","image":"/assets/hero_campaign_split.png","enabled":true}'),
  ('men_banner', '{"tagline":"Haute Sartorial Weaves • The Gentleman''s Edit","title":"Men''s Unstitched Atelier","subtitle":"Timeless Pakistani craft meets modern sartorial precision. Discover 4.5-meter cuts of premium Egyptian Giza 120s cotton, royal pure Boski silk, crisp summer Latha, and seasonal Wash & Wear crafted for distinguished silhouette drapes.","image":"/assets/men_luxury_unstitched.png","badge1":"100% Authentic Thread Counts","badge2":"Mother-of-Pearl Buttons Included","badge3":"Complimentary Nationwide Shipping","enabled":true}'),
  ('women_banner', '{"tagline":"Couture Edit • Vol. I","title":"Women''s Luxury Festive Lawn ''25","subtitle":"Sumptuous 3-piece unstitched masterpieces featuring intricate zari marori embroidery, organza cutwork borders, and pure silk & printed chiffon dupattas crafted for celebratory splendor.","image":"/assets/woman_opulent_lawn.png","badge1":"3-Piece Luxury Festive Suites","badge2":"Pure Silk Chiffon Dupattas","badge3":"Bespoke Master Tailoring Available","enabled":true}'),
  ('new_arrivals_banner', '{"tagline":"Fresh Loom Dispatches • Autumn / Festive ’25","title":"New Unstitched Arrivals","subtitle":"Fresh off the master looms. Hand-curated seasonal releases in ultra-fine Egyptian cotton, embroidered festive lawn, and heritage textured weaves.","image":"/assets/hero_campaign_editorial.png","badge1":"Fresh Loom Dispatches","badge2":"Limited Edition Yardage","badge3":"48-Hour Priority Dispatch","enabled":true}'),
  ('sale_banner', '{"tagline":"Exclusive Archive Reductions","title":"Seasonal Archive & Sale","subtitle":"Exceptional values on select end-of-edition unstitched luxury fabrics. Complete with authentic selvedge verification and complimentary signature packaging.","image":"/assets/hero_campaign_split.png","badge1":"Privilege Reductions Up to 30%","badge2":"Authentic Yardage Certification","badge3":"Limited Vault Stocks","enabled":true}'),
  ('catalog_banner', '{"tagline":"The Master Textile Vault","title":"Curated Atelier Catalog","subtitle":"Explore the complete archives of EBA Fashion Studio — from regal winter Karandi and Egyptian cottons to decadent celebratory lawn ensembles.","image":"/assets/hero_campaign_editorial.png","badge1":"Certified Thread Counts","badge2":"Nationwide Express Shipping","badge3":"Master Bespoke Tailoring","enabled":true}'),
  ('cart_banner', '{"tagline":"Atelier Bag • Haute Couture Dispatch","title":"Your Curated Wardrobe Bag","subtitle":"Every unstitched length is delivered in a climate-sealed monogrammed heirloom box with authentic yardage certification.","image":"/assets/hero_campaign_split.png","badge1":"Climate-Sealed Monogrammed Box","badge2":"Free Shipping Above PKR 5,000","badge3":"Verified Yardage Guarantee","enabled":true}'),
  ('checkout_banner', '{"tagline":"Verified Checkout Salon","title":"Express Atelier Checkout","subtitle":"256-Bit SSL Encrypted • Real-time SMS & WhatsApp Courier Dispatch Verification","image":"/assets/hero_campaign_editorial.png","badge1":"Live Inventory Locked","badge2":"TCS Nationwide Delivery","badge3":"Encrypted Secure Payment","enabled":true}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Seed Store Settings
INSERT INTO public.store_settings (key, value) VALUES
  ('general', '{"store_name":"EBA Fashion Studio","tagline":"Haute Couture Pakistani Unstitched Fabrics","logo_url":"/assets/logo.png","email":"concierge@ebafashionstudio.com","domain":"ebafashionstudio.com","website":"https://ebafashionstudio.com","phone":"0325-4473333","whatsapp":"0325-4473333","address":"Flagship Salon, M.M. Alam Road, Gulberg III, Lahore, Pakistan","city":"Lahore","country":"Pakistan"}'),
  ('shipping', '{"standard_fee":250,"free_shipping_threshold":5000,"courier_partners":["TCS Express","Leopards Courier","DHL Express"],"estimated_delivery":"2 - 4 Business Days Across Pakistan"}'),
  ('payments', '{"cod":{"enabled":true,"title":"Cash on Delivery (COD)","handling_fee":0,"max_amount":75000,"description":"Pay with physical cash upon doorstep delivery anywhere in Pakistan via TCS / Leopards."},"bank_transfer":{"enabled":true,"title":"Direct Bank Wire / Online IBAN Transfer","bank_name":"Meezan Bank Ltd","account_title":"EBA Fashion Studio Pvt Ltd","account_number":"01000948210001","iban":"PK64MEZN0001000948210001","branch":"Gulberg III Main Boulevard Flagship, Lahore","instructions":"Please transfer invoice total to verified Meezan Bank and send receipt to WhatsApp 0325-4473333."},"jazzcash":{"enabled":true,"title":"JazzCash Mobile Wallet & Direct Pay","merchant_id":"03001234567","merchant_name":"EBA FASHION STUDIO","account_number":"0300 1234567","instructions":"Send payment via JazzCash App or dial *786# to Till 0300 1234567."},"easypaisa":{"enabled":true,"title":"Easypaisa Mobile Wallet & QR Pay","till_id":"78491","account_title":"EBA FASHION STUDIO","account_number":"0321 8456789","instructions":"Send payment via Easypaisa App to Mobile Account: 0321 8456789."}}'),
  ('shipping_zones', '[{"id":"zone-major-metros","name":"Major Metros (Express Corridor)","cities":["Karachi","Lahore","Islamabad","Rawalpindi","Faisalabad"],"rate":200,"free_threshold":5000,"delivery_time":"1 - 2 Business Days","courier":"TCS Express","is_active":true},{"id":"zone-punjab-sindh","name":"Rest of Punjab & Sindh","cities":["Multan","Sialkot","Gujranwala","Hyderabad","Sukkur","Bahawalpur","Sargodha","Gujrat"],"rate":250,"free_threshold":5000,"delivery_time":"2 - 3 Business Days","courier":"Leopards Courier","is_active":true},{"id":"zone-kpk-balochistan","name":"KPK, Balochistan, Gilgit & AJK","cities":["Peshawar","Quetta","Abbottabad","Mardan","Swat","Muzaffarabad","Mirpur","Gilgit"],"rate":350,"free_threshold":7000,"delivery_time":"3 - 5 Business Days","courier":"TCS Express Overnight","is_active":true},{"id":"zone-international","name":"International Express (Worldwide Air)","cities":["UK","USA","UAE","Saudi Arabia","Canada","Australia"],"rate":8500,"free_threshold":50000,"delivery_time":"3 - 5 Business Days","courier":"DHL Express Worldwide","is_active":true}]'),
  ('tailoring', '{"enabled":true,"fee":4500,"title":"Master Tailor Stitching Service","description":"Custom bespoke tailoring. Select standard sizing (XS–XL) or input custom chest/kameez length at checkout."}'),
  ('meta_pixel', '{"enabled":false,"pixel_id":"","test_event_code":"","track_pageview":true,"track_view_content":true,"track_add_to_cart":true,"track_initiate_checkout":true,"track_purchase":true,"track_search":true,"currency":"PKR"}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
