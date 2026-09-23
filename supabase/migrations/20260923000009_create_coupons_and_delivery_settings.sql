-- ==============================================================================
-- Migration: 20260923000009_create_coupons_and_delivery_settings.sql
-- Description: Creates the coupons table with RLS and adds shipping/delivery
--              configuration fields to site_settings.
-- ==============================================================================

-- 1. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'PERCENTAGE' CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value NUMERIC NOT NULL,
  min_order_amount NUMERIC DEFAULT NULL,
  max_discount_amount NUMERIC DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expiry_date TIMESTAMPTZ DEFAULT NULL,
  for_new_customers_only BOOLEAN NOT NULL DEFAULT FALSE,
  times_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for speedy code lookups
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active coupons for cart / checkout validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'Public read coupons'
  ) THEN
    CREATE POLICY "Public read coupons" ON public.coupons FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'Allow all operations on coupons'
  ) THEN
    CREATE POLICY "Allow all operations on coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Enhance site_settings with delivery configuration columns (if flat schema exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_settings') THEN
    ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS free_delivery_threshold NUMERIC DEFAULT 5000;
    ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS default_shipping_fee NUMERIC DEFAULT 250;
    ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS estimated_delivery_days TEXT DEFAULT '2 - 4 Working Days';
  END IF;
END $$;

-- 4. Insert or update key-value shipping settings
INSERT INTO public.site_settings (key, value, description)
VALUES (
  'shipping_settings',
  '{"free_delivery_threshold": 5000, "default_shipping_fee": 250, "estimated_delivery_days": "2 - 4 Working Days"}'::JSONB,
  'Nationwide shipping rates, free delivery threshold, and estimated transit days'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description;

-- 5. Seed initial promotional vouchers
INSERT INTO public.coupons (id, code, description, discount_type, discount_value, min_order_amount, max_discount_amount, is_active, for_new_customers_only, times_used)
VALUES
  ('c-welcome-10', 'WELCOME10', '10% Welcome privilege discount on your first designer ensemble order', 'PERCENTAGE', 10, 3000, 5000, TRUE, TRUE, 12),
  ('c-eba-10', 'EBA10', '10% Exclusive privilege discount on selected luxury collections', 'PERCENTAGE', 10, 5000, 4000, TRUE, FALSE, 28),
  ('c-freeship', 'FREESHIP', 'Waive standard nationwide shipping fee on your order', 'FIXED', 250, 2500, NULL, TRUE, FALSE, 19)
ON CONFLICT (code) DO NOTHING;
