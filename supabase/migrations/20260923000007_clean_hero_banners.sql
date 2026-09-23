-- ==============================================================================
-- MIGRATION: 20260923000007_clean_hero_banners.sql
-- Description:
-- Update public.site_settings to remove the old placeholder logo slide (hero-1.png)
-- and preserve only the 2 luxury editorial hero slides:
-- 1. Women's Luxury Festive
-- 2. Men's Premium Quality Winter Shawls
-- ==============================================================================

-- 1. Update the 'hero_banners' key-value row
UPDATE public.site_settings
SET value = jsonb_build_array(
  jsonb_build_object(
    'id', 1,
    'eyebrow', 'COUTURE FORMALS & LAWN',
    'title', 'Women’s Luxury Festive',
    'subtitle', 'Intricate resham embroideries, pure silk dupattas, and handcrafted embellishments.',
    'btnMen', 'VIEW SALE',
    'btnWomen', 'SHOP WOMEN',
    'linkMen', '/shop?sale=true',
    'linkWomen', '/women',
    'bgImage', 'https://pybegueviocyeptgaxyk.supabase.co/storage/v1/object/public/product-images/banners/1790158251618_f0h8c7_change_dimenssion_2k_20260922225213.jpeg'
  ),
  jsonb_build_object(
    'id', 2,
    'eyebrow', 'ARISTOCRATIC HERITAGE',
    'title', 'Men’s Premium Quality Winter Shawls',
    'subtitle', 'Superfine Egyptian cotton, royal latha, and 100% Australian Merino wool shawls.',
    'btnMen', 'EXPLORE MEN',
    'btnWomen', 'VIEW ALL BRANDS',
    'linkMen', '/men',
    'linkWomen', '/brands',
    'bgImage', '/assets/products/men/j-shawl-1.jpg'
  )
),
updated_at = NOW()
WHERE key = 'hero_banners';

-- 2. Update the 'general' flat row hero_banners column
UPDATE public.site_settings
SET hero_banners = jsonb_build_array(
  jsonb_build_object(
    'id', 1,
    'eyebrow', 'COUTURE FORMALS & LAWN',
    'title', 'Women’s Luxury Festive',
    'subtitle', 'Intricate resham embroideries, pure silk dupattas, and handcrafted embellishments.',
    'btnMen', 'VIEW SALE',
    'btnWomen', 'SHOP WOMEN',
    'linkMen', '/shop?sale=true',
    'linkWomen', '/women',
    'bgImage', 'https://pybegueviocyeptgaxyk.supabase.co/storage/v1/object/public/product-images/banners/1790158251618_f0h8c7_change_dimenssion_2k_20260922225213.jpeg'
  ),
  jsonb_build_object(
    'id', 2,
    'eyebrow', 'ARISTOCRATIC HERITAGE',
    'title', 'Men’s Premium Quality Winter Shawls',
    'subtitle', 'Superfine Egyptian cotton, royal latha, and 100% Australian Merino wool shawls.',
    'btnMen', 'EXPLORE MEN',
    'btnWomen', 'VIEW ALL BRANDS',
    'linkMen', '/men',
    'linkWomen', '/brands',
    'bgImage', '/assets/products/men/j-shawl-1.jpg'
  )
),
updated_at = NOW()
WHERE key = 'general';
