-- ==============================================================================
-- MIGRATION: 20260923000008_remove_test_products.sql
-- Description:
-- Permanently delete the initial testing products added during setup:
-- 1. Ethnic  Elegance Redefined – Silk Edition (16b99f34-632a-452c-83d6-eff675a4a847)
-- 2. Ethnic Elegance Redefined – Silk Edition (a702a789-3eac-40ca-9a01-85dd57be4a42)
-- 3. Aneela’s Premium Airjet Dhanak TWO Piece (01bb803b-0ccc-4d35-8b84-4fb758a2e4f6)
-- ==============================================================================

-- Delete associated images
DELETE FROM public.product_images
WHERE product_id IN (
  '16b99f34-632a-452c-83d6-eff675a4a847',
  'a702a789-3eac-40ca-9a01-85dd57be4a42',
  '01bb803b-0ccc-4d35-8b84-4fb758a2e4f6'
);

-- Delete associated variants
DELETE FROM public.product_variants
WHERE product_id IN (
  '16b99f34-632a-452c-83d6-eff675a4a847',
  'a702a789-3eac-40ca-9a01-85dd57be4a42',
  '01bb803b-0ccc-4d35-8b84-4fb758a2e4f6'
);

-- Delete associated wishlist items
DELETE FROM public.wishlist_items
WHERE product_id IN (
  '16b99f34-632a-452c-83d6-eff675a4a847',
  'a702a789-3eac-40ca-9a01-85dd57be4a42',
  '01bb803b-0ccc-4d35-8b84-4fb758a2e4f6'
);

-- Delete associated order items if any
DELETE FROM public.order_items
WHERE product_id IN (
  '16b99f34-632a-452c-83d6-eff675a4a847',
  'a702a789-3eac-40ca-9a01-85dd57be4a42',
  '01bb803b-0ccc-4d35-8b84-4fb758a2e4f6'
);

-- Delete the products
DELETE FROM public.products
WHERE id IN (
  '16b99f34-632a-452c-83d6-eff675a4a847',
  'a702a789-3eac-40ca-9a01-85dd57be4a42',
  '01bb803b-0ccc-4d35-8b84-4fb758a2e4f6'
);
