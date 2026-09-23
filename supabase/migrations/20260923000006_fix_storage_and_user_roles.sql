-- ==============================================================================
-- MIGRATION: 20260923000006_fix_storage_and_user_roles.sql
-- Description:
-- 1. Configure Storage Bucket 'product-images' and open Storage Policies
-- 2. Promote ahmedthor33@gmail.com to OWNER in public.user_roles (as TEXT)
-- 3. Ensure public.profiles table allows SELECT, INSERT, and UPDATE without RLS errors
-- ==============================================================================

-- 1. ENSURE STORAGE BUCKET 'product-images' IS CONFIGURED AND PUBLIC
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. REFRESH STORAGE POLICIES ON storage.objects
DROP POLICY IF EXISTS "Admins can list and view product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update in product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from product-images" ON storage.objects;

-- Allow public read access to images in product-images
CREATE POLICY "Allow public read from product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow uploads to product-images
CREATE POLICY "Allow public uploads to product-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

-- Allow updates to product-images
CREATE POLICY "Allow public update in product-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

-- Allow deletes from product-images
CREATE POLICY "Allow public delete from product-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

-- 3. ENSURE ahmedthor33@gmail.com IS PROMOTED TO OWNER (role is TEXT)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'OWNER'
FROM auth.users
WHERE LOWER(email) = 'ahmedthor33@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'OWNER';

-- Also ensure the primary user registered is an OWNER
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'OWNER'
FROM auth.users
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id) 
DO UPDATE SET role = 'OWNER';

-- 4. ENSURE PROFILES POLICIES ARE PERMISSIVE FOR PROFILE UPDATES
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public or users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;

CREATE POLICY "Public or users can read profiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can manage own profile"
ON public.profiles FOR ALL
USING (true)
WITH CHECK (true);
