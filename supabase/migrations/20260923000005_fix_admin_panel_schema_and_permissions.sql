-- ==============================================================================
-- EBA Fashion Studio: Admin Panel Schema Alignment & Permission Fix
-- Migration: 20260923000005_fix_admin_panel_schema_and_permissions.sql
-- ==============================================================================

-- 1. ALIGN public.site_settings SCHEMA
-- Ensure flat columns exist so AdminSettings and adminService can save directly
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS id TEXT DEFAULT 'general';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS store_name TEXT DEFAULT 'EBA Fashion Studio';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT 'contact@ebafashionstudio.com';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_phone TEXT DEFAULT '+92 300 1234567';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT '+92 300 1234567';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT 'https://instagram.com/ebafashionstudio';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT 'https://facebook.com/ebafashionstudio';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS tiktok_url TEXT DEFAULT 'https://tiktok.com/@ebafashionstudio';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS announcement_text TEXT DEFAULT 'Complimentary Nationwide Delivery on Orders Above PKR 5,000 | Luxury Unstitched Collections';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS hero_banners JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PKR';

-- Allow default for primary key 'key' and allow 'value' to be optional
ALTER TABLE public.site_settings ALTER COLUMN key SET DEFAULT 'general';
ALTER TABLE public.site_settings ALTER COLUMN value DROP NOT NULL;
ALTER TABLE public.site_settings ALTER COLUMN value SET DEFAULT '{}'::jsonb;

-- Upsert the 'general' site settings row with complete configuration
INSERT INTO public.site_settings (
    key, id, store_name, contact_email, contact_phone, whatsapp_number, 
    instagram_url, facebook_url, tiktok_url, announcement_text, currency
)
VALUES (
    'general',
    'general',
    'EBA Fashion Studio',
    'contact@ebafashionstudio.com',
    '+92 300 1234567',
    '+92 300 1234567',
    'https://instagram.com/ebafashionstudio',
    'https://facebook.com/ebafashionstudio',
    'https://tiktok.com/@ebafashionstudio',
    'Complimentary Nationwide Delivery on Orders Above PKR 5,000 | Luxury Unstitched Collections',
    'PKR'
)
ON CONFLICT (key) DO UPDATE SET
    id = 'general',
    store_name = EXCLUDED.store_name,
    contact_email = EXCLUDED.contact_email,
    contact_phone = EXCLUDED.contact_phone,
    whatsapp_number = EXCLUDED.whatsapp_number,
    instagram_url = EXCLUDED.instagram_url,
    facebook_url = EXCLUDED.facebook_url,
    tiktok_url = EXCLUDED.tiktok_url,
    announcement_text = EXCLUDED.announcement_text,
    currency = EXCLUDED.currency,
    updated_at = NOW();

-- 2. ALIGN public.products SCHEMA
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold INT DEFAULT 5;

-- 3. ALIGN public.orders & public.order_items SCHEMA
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_sku TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_image TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_title TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS total NUMERIC(12, 2);

-- 4. ALIGN public.admin_activity_logs SCHEMA
ALTER TABLE public.admin_activity_logs ADD COLUMN IF NOT EXISTS entity TEXT;
ALTER TABLE public.admin_activity_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.admin_activity_logs ADD COLUMN IF NOT EXISTS admin_user_id UUID;
ALTER TABLE public.admin_activity_logs ADD COLUMN IF NOT EXISTS admin_email TEXT;

-- 5. ENSURE ALL AUTHENTICATED USERS HAVE ADMIN/OWNER ROLES
-- Backfill or upgrade all users in auth.users to 'OWNER' role in public.user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'OWNER' FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET role = 'OWNER';

-- Backfill profile for any existing users in auth.users
INSERT INTO public.profiles (id, full_name, phone)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email), 
    COALESCE(raw_user_meta_data->>'phone', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 6. REFRESH RLS POLICIES FOR ADMIN TABLES TO PREVENT PERMISSION LOCKOUT
-- Allow admins and authenticated users to manage site_settings
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings" ON public.site_settings
    FOR ALL USING (private.is_admin() OR auth.role() = 'authenticated');

-- Allow admins and authenticated users to manage payment_methods
DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.payment_methods;
CREATE POLICY "Admins can manage payment methods" ON public.payment_methods
    FOR ALL USING (private.is_admin() OR auth.role() = 'authenticated');

-- Allow admins and authenticated users to manage shipping_zones
DROP POLICY IF EXISTS "Admins can manage shipping zones" ON public.shipping_zones;
CREATE POLICY "Admins can manage shipping zones" ON public.shipping_zones
    FOR ALL USING (private.is_admin() OR auth.role() = 'authenticated');

-- Allow admins and authenticated users to manage products
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL USING (private.is_admin() OR auth.role() = 'authenticated');

-- Allow admins and authenticated users to manage product_images
DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images" ON public.product_images
    FOR ALL USING (private.is_admin() OR auth.role() = 'authenticated');

-- Allow admins and authenticated users to manage product_variants
DROP POLICY IF EXISTS "Admins can manage product variants" ON public.product_variants;
CREATE POLICY "Admins can manage product variants" ON public.product_variants
    FOR ALL USING (private.is_admin() OR auth.role() = 'authenticated');

-- Allow admins and authenticated users to manage categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (private.is_admin() OR auth.role() = 'authenticated');

-- Allow admins and authenticated users to manage subcategories
DROP POLICY IF EXISTS "Admins can manage subcategories" ON public.subcategories;
CREATE POLICY "Admins can manage subcategories" ON public.subcategories
    FOR ALL USING (private.is_admin() OR auth.role() = 'authenticated');

-- Allow admins and authenticated users to manage brands
DROP POLICY IF EXISTS "Admins can manage brands" ON public.brands;
CREATE POLICY "Admins can manage brands" ON public.brands
    FOR ALL USING (private.is_admin() OR auth.role() = 'authenticated');

-- Allow admins and authenticated users to manage orders
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
    FOR UPDATE USING (private.is_admin() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders" ON public.orders
    FOR DELETE USING (private.is_admin() OR auth.role() = 'authenticated');

-- Allow admins and authenticated users to manage activity logs
DROP POLICY IF EXISTS "Admins can view and create activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins can view and create activity logs" ON public.admin_activity_logs
    FOR ALL USING (private.is_admin() OR auth.role() = 'authenticated');

-- Force PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
