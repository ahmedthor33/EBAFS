-- EBA Fashion Studio: Row Level Security & RBAC Functions
-- Version: 1.1.0
-- Security Hardened: Conforms with Supabase Postgres Linter (Splinter) Security Advisor

-- 1. Enable Row Level Security on all tables
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

-- 2. Create private schema for security functions to prevent PostgREST API exposure
CREATE SCHEMA IF NOT EXISTS private;

-- Security helper functions (in private schema to prevent API exposure while avoiding RLS recursion)
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

-- Trigger function: handle new user signup in private schema
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

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- Grant internal database execution permissions for private schema functions
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO anon, authenticated, service_role;

-- Revoke execute on trigger function from client roles
REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.handle_new_user() TO service_role, postgres;

-------------------------------------------------------
-- POLICIES
-------------------------------------------------------

-- 1. Profiles
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR private.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR private.is_admin());

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR private.is_admin());

-- 2. User Roles
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id OR private.is_admin());

CREATE POLICY "Only owners can modify roles" ON public.user_roles
    FOR ALL USING (private.is_owner());

-- 3. Brands
CREATE POLICY "Public can view active brands" ON public.brands
    FOR SELECT USING (is_active = true OR private.is_admin());

CREATE POLICY "Admins can manage brands" ON public.brands
    FOR ALL USING (private.is_admin());

-- 4. Categories
CREATE POLICY "Public can view active categories" ON public.categories
    FOR SELECT USING (is_active = true OR private.is_admin());

CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (private.is_admin());

-- 5. Subcategories
CREATE POLICY "Public can view active subcategories" ON public.subcategories
    FOR SELECT USING (is_active = true OR private.is_admin());

CREATE POLICY "Admins can manage subcategories" ON public.subcategories
    FOR ALL USING (private.is_admin());

-- 6. Products
CREATE POLICY "Public can view published products" ON public.products
    FOR SELECT USING (status = 'PUBLISHED' OR private.is_admin());

CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL USING (private.is_admin());

-- 7. Product Images
CREATE POLICY "Public can view product images" ON public.product_images
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage product images" ON public.product_images
    FOR ALL USING (private.is_admin());

-- 8. Product Variants
CREATE POLICY "Public can view product variants" ON public.product_variants
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage product variants" ON public.product_variants
    FOR ALL USING (private.is_admin());

-- 9. Wishlists & Items
CREATE POLICY "Users can manage own wishlist" ON public.wishlists
    FOR ALL USING (auth.uid() = user_id OR private.is_admin());

CREATE POLICY "Users can manage own wishlist items" ON public.wishlist_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.wishlists 
            WHERE wishlists.id = wishlist_items.wishlist_id 
            AND wishlists.user_id = auth.uid()
        ) OR private.is_admin()
    );

-- 10. Carts & Items
CREATE POLICY "Users can manage own cart" ON public.carts
    FOR ALL USING (auth.uid() = user_id OR private.is_admin());

CREATE POLICY "Users can manage own cart items" ON public.cart_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.carts 
            WHERE carts.id = cart_items.cart_id 
            AND carts.user_id = auth.uid()
        ) OR private.is_admin()
    );

-- 11. Addresses
CREATE POLICY "Users can manage own addresses" ON public.addresses
    FOR ALL USING (auth.uid() = user_id OR private.is_admin());

-- 12. Shipping Zones
CREATE POLICY "Public can view active shipping zones" ON public.shipping_zones
    FOR SELECT USING (is_active = true OR private.is_admin());

CREATE POLICY "Admins can manage shipping zones" ON public.shipping_zones
    FOR ALL USING (private.is_admin());

-- 13. Payment Methods
CREATE POLICY "Public can view active payment methods" ON public.payment_methods
    FOR SELECT USING (is_active = true OR private.is_admin());

CREATE POLICY "Admins can manage payment methods" ON public.payment_methods
    FOR ALL USING (private.is_admin());

-- 14. Orders & Items & Payments
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id OR private.is_admin());

CREATE POLICY "Anyone can create order" ON public.orders
    FOR INSERT WITH CHECK (
        order_number IS NOT NULL 
        AND total >= 0 
        AND customer_email IS NOT NULL
        AND (
            (auth.uid() IS NULL AND user_id IS NULL) 
            OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
            OR private.is_admin()
        )
    );

CREATE POLICY "Admins can update orders" ON public.orders
    FOR UPDATE USING (private.is_admin());

CREATE POLICY "Admins can delete orders" ON public.orders
    FOR DELETE USING (private.is_admin());

CREATE POLICY "Users can view own order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.user_id = auth.uid() OR private.is_admin())
        )
    );

CREATE POLICY "Anyone can insert order items with order" ON public.order_items
    FOR INSERT WITH CHECK (
        order_id IS NOT NULL 
        AND product_name IS NOT NULL 
        AND quantity > 0
        AND price >= 0
    );

CREATE POLICY "Admins can manage order items" ON public.order_items
    FOR ALL USING (private.is_admin());

CREATE POLICY "Users can view payments for own orders" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = payments.order_id 
            AND (orders.user_id = auth.uid() OR private.is_admin())
        )
    );

CREATE POLICY "Anyone can submit payment proof" ON public.payments
    FOR INSERT WITH CHECK (
        order_id IS NOT NULL 
        AND amount >= 0 
        AND payment_method IS NOT NULL
    );

CREATE POLICY "Admins can manage payments" ON public.payments
    FOR ALL USING (private.is_admin());

-- 15. Newsletter
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers
    FOR INSERT WITH CHECK (
        email IS NOT NULL 
        AND length(trim(email)) >= 5 
        AND email LIKE '%@%.%'
    );

CREATE POLICY "Admins can view newsletter subscribers" ON public.newsletter_subscribers
    FOR SELECT USING (private.is_admin());

CREATE POLICY "Admins can delete newsletter subscribers" ON public.newsletter_subscribers
    FOR DELETE USING (private.is_admin());

-- 16. Site Settings
CREATE POLICY "Public can read site settings" ON public.site_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage site settings" ON public.site_settings
    FOR ALL USING (private.is_admin());

-- 17. Admin Activity Logs
CREATE POLICY "Admins can view and create activity logs" ON public.admin_activity_logs
    FOR ALL USING (private.is_admin());

-------------------------------------------------------
-- STORAGE BUCKET CONFIGURATION (product-images)
-------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies:
-- Notice: Public bucket allows direct CDN URL downloads without a SELECT policy on storage.objects.
-- Restricting SELECT listing on storage.objects to Admins prevents bucket enumeration.
CREATE POLICY "Admins can list and view product images"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'product-images'
    AND private.is_admin()
);

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'product-images'
    AND private.is_admin()
);

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'product-images'
    AND private.is_admin()
);

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'product-images'
    AND private.is_admin()
);
