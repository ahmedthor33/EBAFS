-- =====================================================================
-- EBA FASHION STUDIO: COMPLETE DATABASE SETUP
-- Includes:
-- 1. All Tables, Constraints & Indexes (Schema)
-- 2. Row Level Security (RLS) & Role-Based Access Control (RBAC)
-- 3. Storage Bucket Configuration (product-images)
-- 4. Initial Luxury Pakistani Designer Seed Data & Pricing (PKR)
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-----------------------------------------------------------------------
-- SECTION 1: SCHEMA TABLES
-----------------------------------------------------------------------

-- 1. Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Roles (RBAC)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('OWNER', 'MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER', 'CUSTOMER')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Brands
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    gender TEXT NOT NULL CHECK (gender IN ('MEN', 'WOMEN', 'UNISEX')),
    description TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Subcategories
CREATE TABLE IF NOT EXISTS public.subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sku TEXT UNIQUE,
    description TEXT,
    short_description TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    sale_price NUMERIC(12, 2) CHECK (sale_price >= 0 AND (sale_price IS NULL OR sale_price < price)),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    fabric TEXT,
    color TEXT,
    season TEXT,
    gender TEXT NOT NULL CHECK (gender IN ('MEN', 'WOMEN', 'UNISEX')),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    is_featured BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    is_bestseller BOOLEAN DEFAULT false,
    is_on_sale BOOLEAN DEFAULT false,
    view_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Product Images
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    alt_text TEXT,
    display_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Product Variants
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    price_override NUMERIC(12, 2) CHECK (price_override >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Wishlists & Wishlist Items
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wishlist_id UUID REFERENCES public.wishlists(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wishlist_id, product_id)
);

-- 10. Carts & Cart Items
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    guest_session_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES public.carts(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cart_id, product_id, variant_id)
);

-- 11. Customer Addresses
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    street_address TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    postal_code TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Shipping Zones (Pakistan)
CREATE TABLE IF NOT EXISTS public.shipping_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    provinces TEXT[] NOT NULL,
    rate NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
    free_shipping_threshold NUMERIC(10, 2) DEFAULT 5000.00,
    estimated_days TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Payment Methods
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    instructions TEXT,
    account_details JSONB,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Orders, Order Items & Payments
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    shipping_address JSONB NOT NULL,
    shipping_zone_id UUID REFERENCES public.shipping_zones(id) ON DELETE SET NULL,
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
    order_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (order_status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
    tracking_number TEXT,
    courier_name TEXT,
    customer_notes TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    sku TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    payment_method TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    transaction_ref TEXT,
    proof_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    notes TEXT,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Newsletter Subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Site Settings
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Admin Activity Logs
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_gender ON public.products(gender);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);


-----------------------------------------------------------------------
-- SECTION 2: ROW LEVEL SECURITY & RBAC
-----------------------------------------------------------------------

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Security Functions (in private schema to prevent PostgREST API exposure)
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_user_role(p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = p_user_id 
        AND role IN ('OWNER', 'MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER')
    );
$$;

CREATE OR REPLACE FUNCTION private.is_owner(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = p_user_id 
        AND role = 'OWNER'
    );
$$;

-- Trigger to automate profile and role creation on new user signup
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_first_user BOOLEAN;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first_user;

    INSERT INTO public.profiles (id, full_name, phone, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );

    INSERT INTO public.user_roles (user_id, role)
    VALUES (
        NEW.id,
        CASE WHEN is_first_user THEN 'OWNER' ELSE 'CUSTOMER' END
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- Internal database execution permissions
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.handle_new_user() TO service_role, postgres;

-- Profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR private.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR private.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR private.is_admin());

-- Roles
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR private.is_admin());

DROP POLICY IF EXISTS "Only owners can modify roles" ON public.user_roles;
CREATE POLICY "Only owners can modify roles" ON public.user_roles FOR ALL USING (private.is_owner());

-- Brands
DROP POLICY IF EXISTS "Public can view active brands" ON public.brands;
CREATE POLICY "Public can view active brands" ON public.brands FOR SELECT USING (is_active = true OR private.is_admin());

DROP POLICY IF EXISTS "Admins can manage brands" ON public.brands;
CREATE POLICY "Admins can manage brands" ON public.brands FOR ALL USING (private.is_admin());

-- Categories
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories" ON public.categories FOR SELECT USING (is_active = true OR private.is_admin());

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (private.is_admin());

-- Subcategories
DROP POLICY IF EXISTS "Public can view active subcategories" ON public.subcategories;
CREATE POLICY "Public can view active subcategories" ON public.subcategories FOR SELECT USING (is_active = true OR private.is_admin());

DROP POLICY IF EXISTS "Admins can manage subcategories" ON public.subcategories;
CREATE POLICY "Admins can manage subcategories" ON public.subcategories FOR ALL USING (private.is_admin());

-- Products
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products" ON public.products FOR SELECT USING (status = 'PUBLISHED' OR private.is_admin());

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (private.is_admin());

-- Images
DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;
CREATE POLICY "Public can view product images" ON public.product_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images" ON public.product_images FOR ALL USING (private.is_admin());

-- Variants
DROP POLICY IF EXISTS "Public can view product variants" ON public.product_variants;
CREATE POLICY "Public can view product variants" ON public.product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage product variants" ON public.product_variants;
CREATE POLICY "Admins can manage product variants" ON public.product_variants FOR ALL USING (private.is_admin());

-- Wishlist
DROP POLICY IF EXISTS "Users can manage own wishlist" ON public.wishlists;
CREATE POLICY "Users can manage own wishlist" ON public.wishlists FOR ALL USING (auth.uid() = user_id OR private.is_admin());

DROP POLICY IF EXISTS "Users can manage own wishlist items" ON public.wishlist_items;
CREATE POLICY "Users can manage own wishlist items" ON public.wishlist_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.wishlists WHERE wishlists.id = wishlist_items.wishlist_id AND wishlists.user_id = auth.uid()) OR private.is_admin()
);

-- Carts
DROP POLICY IF EXISTS "Users can manage own cart" ON public.carts;
CREATE POLICY "Users can manage own cart" ON public.carts FOR ALL USING (auth.uid() = user_id OR private.is_admin());

DROP POLICY IF EXISTS "Users can manage own cart items" ON public.cart_items;
CREATE POLICY "Users can manage own cart items" ON public.cart_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()) OR private.is_admin()
);

-- Addresses
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.addresses;
CREATE POLICY "Users can manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id OR private.is_admin());

-- Shipping Zones
DROP POLICY IF EXISTS "Public can view active shipping zones" ON public.shipping_zones;
CREATE POLICY "Public can view active shipping zones" ON public.shipping_zones FOR SELECT USING (is_active = true OR private.is_admin());

DROP POLICY IF EXISTS "Admins can manage shipping zones" ON public.shipping_zones;
CREATE POLICY "Admins can manage shipping zones" ON public.shipping_zones FOR ALL USING (private.is_admin());

-- Payment Methods
DROP POLICY IF EXISTS "Public can view active payment methods" ON public.payment_methods;
CREATE POLICY "Public can view active payment methods" ON public.payment_methods FOR SELECT USING (is_active = true OR private.is_admin());

DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.payment_methods;
CREATE POLICY "Admins can manage payment methods" ON public.payment_methods FOR ALL USING (private.is_admin());

-- Orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR private.is_admin());

DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
CREATE POLICY "Anyone can create order" ON public.orders FOR INSERT WITH CHECK (
    order_number IS NOT NULL 
    AND total >= 0 
    AND customer_email IS NOT NULL
    AND (
        (auth.uid() IS NULL AND user_id IS NULL) 
        OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
        OR private.is_admin()
    )
);

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE USING (private.is_admin());

-- Order Items
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR private.is_admin()))
);

DROP POLICY IF EXISTS "Anyone can insert order items with order" ON public.order_items;
CREATE POLICY "Anyone can insert order items with order" ON public.order_items FOR INSERT WITH CHECK (
    order_id IS NOT NULL 
    AND product_name IS NOT NULL 
    AND quantity > 0
    AND price >= 0
);

DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL USING (private.is_admin());

-- Payments
DROP POLICY IF EXISTS "Users can view payments for own orders" ON public.payments;
CREATE POLICY "Users can view payments for own orders" ON public.payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND (orders.user_id = auth.uid() OR private.is_admin()))
);

DROP POLICY IF EXISTS "Anyone can submit payment proof" ON public.payments;
CREATE POLICY "Anyone can submit payment proof" ON public.payments FOR INSERT WITH CHECK (
    order_id IS NOT NULL 
    AND amount >= 0 
    AND payment_method IS NOT NULL
);

DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL USING (private.is_admin());

-- Newsletter
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT WITH CHECK (
    email IS NOT NULL 
    AND length(trim(email)) >= 5 
    AND email LIKE '%@%.%'
);

DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can view newsletter subscribers" ON public.newsletter_subscribers FOR SELECT USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can delete newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can delete newsletter subscribers" ON public.newsletter_subscribers FOR DELETE USING (private.is_admin());

-- Settings
DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING (private.is_admin());

-- Admin Logs
DROP POLICY IF EXISTS "Admins can view and create activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins can view and create activity logs" ON public.admin_activity_logs FOR ALL USING (private.is_admin());

-----------------------------------------------------------------------
-- SECTION 3: STORAGE BUCKET (product-images)
-----------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Admins can list and view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images' AND private.is_admin());

DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND private.is_admin());

DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND private.is_admin());

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND private.is_admin());


-----------------------------------------------------------------------
-- SECTION 4: SEED DATA
-----------------------------------------------------------------------

-- Brands
INSERT INTO public.brands (id, name, slug, description, is_featured, is_active, display_order)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Hussain Rehar', 'hussain-rehar', 'High-end Pakistani couture and avant-garde luxury unstitched ensembles with intricate handcrafted embellishments.', true, true, 1),
    ('b0000000-0000-0000-0000-000000000002', 'Maria-B', 'maria-b', 'Pakistan’s premier luxury designer known for bespoke bridal, unstitched luxury lawn, and couture silk collections.', true, true, 2),
    ('b0000000-0000-0000-0000-000000000003', 'Baroque', 'baroque', 'Timeless elegance blending traditional Pakistani motifs with modern silhouettes in Swiss lawn, organza, and chiffon.', true, true, 3),
    ('b0000000-0000-0000-0000-000000000004', 'Iznik', 'iznik', 'Artisanal embroideries, opulent digital prints, and royal textiles celebrating festive Pakistani heritage.', true, true, 4),
    ('b0000000-0000-0000-0000-000000000005', 'Zarqash', 'zarqash', 'Exquisite unstitched formals featuring zari embroidery, mirror work, and heavy sequence embellishments.', true, true, 5),
    ('b0000000-0000-0000-0000-000000000006', 'Ethnic', 'ethnic', 'Contemporary Pakistani aesthetics celebrating true eastern roots with sophisticated everyday and festive wear.', false, true, 6),
    ('b0000000-0000-0000-0000-000000000007', 'Azure', 'azure', 'Vibrant color palettes, delicate threadwork, and modern chic unstitched luxury lawn and jacquard.', false, true, 7),
    ('b0000000-0000-0000-0000-000000000008', 'J. (Junaid Jamshed)', 'j-dot', 'The benchmark in Men’s premium unstitched fabrics, pure wool winter shawls, and regal ethnic wear.', true, true, 8),
    ('b0000000-0000-0000-0000-000000000009', 'Bin Faisal', 'bin-faisal', 'Superfine Egyptian cotton, blended suiting, and royal unstitched fabrics tailored for discerning gentlemen.', true, true, 9)
ON CONFLICT (id) DO NOTHING;

-- Categories
INSERT INTO public.categories (id, name, slug, gender, description, display_order, is_active)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Men''s Unstitched', 'mens-unstitched', 'MEN', 'Exquisite unstitched fabrics crafted from superfine Egyptian cotton, latha, wash-and-wear, and luxury blends.', 1, true),
    ('c0000000-0000-0000-0000-000000000002', 'Men''s Shawls', 'mens-shawls', 'MEN', 'Handcrafted pure Merino wool, pashmina, and embroidered heirloom shawls for gentlemen.', 2, true),
    ('c0000000-0000-0000-0000-000000000003', 'Women''s Luxury Lawn', 'womens-luxury-lawn', 'WOMEN', 'Editorial unstitched 3-piece designer lawn with organza dupattas, schiffli embroidery, and digital silks.', 3, true),
    ('c0000000-0000-0000-0000-000000000004', 'Women''s Chiffon & Festive', 'womens-festive', 'WOMEN', 'Heavily embellished wedding and formal unstitched ensembles with hand-worked sequins, tilla, and beads.', 4, true),
    ('c0000000-0000-0000-0000-000000000005', 'Women''s Velvet & Winter', 'womens-velvet', 'WOMEN', 'Opulent micro-velvet, karandi, and jacquard winter collections for prestigious occasions.', 5, true)
ON CONFLICT (id) DO NOTHING;

-- Subcategories
INSERT INTO public.subcategories (id, category_id, name, slug, description, display_order, is_active)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Egyptian Cotton', 'egyptian-cotton', 'Long staple Egyptian cotton with silk-like finish', 1, true),
    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Wash & Wear', 'wash-and-wear', 'Wrinkle-resistant luxury everyday fabric', 2, true),
    ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Royal Latha', 'royal-latha', 'Traditional crisp white and off-white latha', 3, true),
    ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'Pure Wool Shawls', 'pure-wool-shawls', 'Warm and refined pure wool winter shawls', 1, true),
    ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', '3-Piece Embroidered', '3-piece-embroidered', 'Shirt, trouser, and embroidered dupatta set', 1, true),
    ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 'Silk Dupatta Edition', 'silk-dupatta-edition', 'Lawn shirt with pure medium silk printed dupatta', 2, true),
    ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000004', 'Chiffon Formals', 'chiffon-formals', 'Luxury pure crinkle chiffon with tilla and zardozi', 1, true),
    ('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000004', 'Net & Organza', 'net-and-organza', 'Delicate organza and bridal net with hand-embellishment', 2, true)
ON CONFLICT (id) DO NOTHING;

-- Shipping Zones (Pakistan)
INSERT INTO public.shipping_zones (id, name, provinces, rate, free_shipping_threshold, estimated_days, is_active)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'Punjab & Capital', ARRAY['Punjab', 'Islamabad Capital Territory'], 250.00, 5000.00, '2 - 3 Working Days', true),
    ('f0000000-0000-0000-0000-000000000002', 'Sindh', ARRAY['Sindh'], 300.00, 5000.00, '3 - 4 Working Days', true),
    ('f0000000-0000-0000-0000-000000000003', 'Khyber Pakhtunkhwa (KPK)', ARRAY['Khyber Pakhtunkhwa'], 350.00, 5000.00, '3 - 5 Working Days', true),
    ('f0000000-0000-0000-0000-000000000004', 'Balochistan & Remote Regions', ARRAY['Balochistan', 'Azad Kashmir', 'Gilgit-Baltistan'], 400.00, 7000.00, '4 - 7 Working Days', true)
ON CONFLICT (id) DO NOTHING;

-- Payment Methods
INSERT INTO public.payment_methods (id, code, name, instructions, account_details, is_active, display_order)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'COD', 'Cash on Delivery', 'Pay with cash upon package delivery. Please keep exact change ready.', '{"note": "Applicable across all cities in Pakistan."}'::jsonb, true, 1),
    ('a0000000-0000-0000-0000-000000000002', 'BANK_TRANSFER', 'Direct Bank Transfer / IBFT', 'Transfer total amount directly to our official corporate account. Please share payment receipt on WhatsApp or upload proof.', '{"bank_name": "Meezan Bank Limited", "account_title": "EBA Fashion Studio", "account_number": "01020304050607", "iban": "PK12MEZN0001020304050607", "branch": "Main Boulevard Branch, Lahore"}'::jsonb, true, 2),
    ('a0000000-0000-0000-0000-000000000003', 'JAZZCASH', 'JazzCash', 'Send payment directly to our official JazzCash Mobile Account. Please share payment screenshot or TID on WhatsApp for priority dispatch.', '{"account_title": "EBA Fashion Studio", "account_number": "0300 1234567", "mobile_number": "0300 1234567", "note": "Dial *786# or transfer via JazzCash Mobile App to Mobile Account."}'::jsonb, true, 3)
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO public.products (
    id, brand_id, category_id, subcategory_id, name, slug, sku, 
    description, short_description, price, sale_price, stock_quantity, 
    fabric, color, season, gender, status, is_featured, is_new, is_bestseller, is_on_sale
) VALUES
    (
        'e0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001', -- Hussain Rehar
        'c0000000-0000-0000-0000-000000000003', -- Women's Luxury Lawn
        'd0000000-0000-0000-0000-000000000005', -- 3-piece
        'Noor-e-Kashmir Embroidered Luxury Lawn 3-Piece',
        'noor-e-kashmir-embroidered-luxury-lawn-3pc',
        'HR-L26-001',
        'Bespoke 3-piece unstitched luxury lawn ensemble showcasing intricate resham floral motifs along the neckline and hem. Paired with a diaphanous digitally printed pure silk dupatta and dyed cambric trousers. Embellished with delicate schiffli borders and lace inserts.',
        'Unstitched 3-Piece Luxury Lawn with Pure Silk Dupatta & Embroidered Organza Patches.',
        18500.00, 16500.00, 15,
        'Luxury Lawn & Pure Medium Silk', 'Midnight Charcoal & Ivory', 'Summer / Festive', 'WOMEN',
        'PUBLISHED', true, true, true, true
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000002', -- Maria-B
        'c0000000-0000-0000-0000-000000000004', -- Women's Chiffon & Festive
        'd0000000-0000-0000-0000-000000000007', -- Chiffon Formals
        'Mbroidered Heritage Chiffon Festive Edition',
        'mbroidered-heritage-chiffon-festive-edition',
        'MB-M26-042',
        'Handcrafted wedding festive unstitched 3-piece suit rendered on premium crinkle chiffon. Adorned with gold zardozi, hand-cut sequins, cutwork borders, and pearl spray. Includes an opulent organza jacquard dupatta and silk slip with matching trousers.',
        'Luxury Unstitched Hand-Embroidered Chiffon 3-Piece Festive Ensemble.',
        27950.00, NULL, 12,
        'Pure Crinkle Chiffon & Raw Silk', 'Soft Champagne Gold', 'Wedding / Festive', 'WOMEN',
        'PUBLISHED', true, true, true, false
    ),
    (
        'e0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000003', -- Baroque
        'c0000000-0000-0000-0000-000000000003', -- Women's Luxury Lawn
        'd0000000-0000-0000-0000-000000000005', -- 3-piece
        'Chantelle Swiss Voile Embroidered Ensemble',
        'chantelle-swiss-voile-embroidered-ensemble',
        'BQ-CH-109',
        'Elegance re-imagined in ethereal Swiss voile fabric with pastel threadwork, embroidered neckline patti, sleeve borders, and a scalloped embroidered organza dupatta. Perfect for daytime celebrations.',
        'Unstitched 3-Piece Swiss Voile with Scalloped Organza Dupatta.',
        15500.00, 13950.00, 20,
        'Swiss Voile & Organza', 'Powder Blue & White', 'Summer / Spring', 'WOMEN',
        'PUBLISHED', true, false, true, true
    ),
    (
        'e0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000008', -- J. (Junaid Jamshed)
        'c0000000-0000-0000-0000-000000000002', -- Men's Shawls
        'd0000000-0000-0000-0000-000000000004', -- Pure Wool Shawls
        'J. Premium Heirloom Wool Shawl',
        'j-premium-heirloom-wool-shawl',
        'JJ-SHW-09',
        'Woven from the finest 100% Australian Merino wool, this royal gentlemen''s shawl exudes aristocratic distinction. Features subtle jacquard borders, raw fringes, and exceptional warmth with a featherweight drape.',
        '100% Pure Australian Merino Wool Men''s Formal Shawl (2.75m x 1.4m).',
        14990.00, 12500.00, 18,
        '100% Merino Wool', 'Rich Camel & Charcoal', 'Winter Heritage', 'MEN',
        'PUBLISHED', true, true, true, true
    ),
    (
        'e0000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000009', -- Bin Faisal
        'c0000000-0000-0000-0000-000000000001', -- Men's Unstitched
        'd0000000-0000-0000-0000-000000000001', -- Egyptian Cotton
        'Executive Royal Egyptian Cotton Unstitched Suit',
        'executive-royal-egyptian-cotton-unstitched-suit',
        'BF-EGY-04',
        '4.5 meters of luxury grade unstitched Egyptian Giza cotton fabric with a liquid-mercerized finish. Naturally breathable, crisp drape, and resilient color fastness for bespoke tailoring.',
        '4.5 Meters Superfine Egyptian Giza Cotton with Mother of Pearl Buttons & Collar Tags.',
        6990.00, 5990.00, 30,
        '100% Giza Egyptian Cotton', 'Midnight Jet Black', 'All-Season', 'MEN',
        'PUBLISHED', true, true, false, true
    ),
    (
        'e0000000-0000-0000-0000-000000000006',
        'b0000000-0000-0000-0000-000000000009', -- Bin Faisal
        'c0000000-0000-0000-0000-000000000001', -- Men's Unstitched
        'd0000000-0000-0000-0000-000000000003', -- Royal Latha
        'Imperial Crisp White Royal Latha',
        'imperial-crisp-white-royal-latha',
        'BF-LTH-01',
        'Traditional Pakistani latha woven from combed long-staple cotton yarn. Impeccable stiffness, luminous snow-white hue, and unmatched durability for authentic traditional shalwar kameez.',
        '4.5 Meters Traditional White Royal Latha for Bespoke Shalwar Kameez.',
        5490.00, NULL, 25,
        'Pure Combed Cotton Latha', 'Pure White', 'All-Season', 'MEN',
        'PUBLISHED', false, false, true, false
    )
ON CONFLICT (id) DO NOTHING;

-- Product Images
INSERT INTO public.product_images (id, product_id, url, alt_text, display_order, is_primary)
VALUES
    ('fa000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '/assets/products/women/hussain-rehar-1.jpg', 'Hussain Rehar Luxury Lawn Editorial Front', 1, true),
    ('fa000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', '/assets/products/women/hussain-rehar-2.jpg', 'Hussain Rehar Detail View', 2, false),
    ('fa000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', '/assets/products/women/maria-b-1.jpg', 'Maria-B Festive Chiffon Front', 1, true),
    ('fa000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', '/assets/products/women/maria-b-2.jpg', 'Maria-B Dupatta Embroidery Detail', 2, false),
    ('fa000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000003', '/assets/products/women/baroque-1.jpg', 'Baroque Swiss Voile Editorial', 1, true),
    ('fa000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000004', '/assets/products/men/j-shawl-1.jpg', 'J. Premium Wool Shawl Draped', 1, true),
    ('fa000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000004', '/assets/products/men/j-shawl-2.jpg', 'J. Wool Shawl Texture & Fringe Detail', 2, false),
    ('fa000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000005', '/assets/products/men/bin-faisal-1.jpg', 'Bin Faisal Egyptian Cotton Unstitched Box Packaging', 1, true),
    ('fa000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000006', '/assets/products/men/bin-faisal-2.jpg', 'Bin Faisal Royal Latha Fabric', 1, true)
ON CONFLICT (id) DO NOTHING;

-- Initial Site Settings
INSERT INTO public.site_settings (key, value, description)
VALUES
    ('store_info', '{"name": "EBA Fashion Studio", "tagline": "Luxury Pakistani Fashion", "phone": "+92 300 1234567", "email": "concierge@ebafashionstudio.com", "address": "Gulberg III, Lahore, Punjab, Pakistan", "currency": "PKR", "currency_symbol": "₨"}'::jsonb, 'General store contact and brand identity info'),
    ('shipping_policy', '{"free_shipping_threshold": 5000, "standard_fee": 250, "default_courier": "TCS Express"}'::jsonb, 'Storewide shipping calculations'),
    ('announcements', '{"active": true, "text": "Complimentary Express Delivery across Pakistan on orders over PKR 5,000", "link": "/shop"}'::jsonb, 'Top header announcement message')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
