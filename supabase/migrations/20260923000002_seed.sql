-- EBA Fashion Studio: Luxury Pakistani Fashion Seed Data
-- Version: 1.0.0
-- Created: 2026-09-23

-- 1. Insert Initial Brands
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

-- 2. Insert Categories
INSERT INTO public.categories (id, name, slug, gender, description, display_order, is_active)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Men''s Unstitched', 'mens-unstitched', 'MEN', 'Exquisite unstitched fabrics crafted from superfine Egyptian cotton, latha, wash-and-wear, and luxury blends.', 1, true),
    ('c0000000-0000-0000-0000-000000000002', 'Men''s Shawls', 'mens-shawls', 'MEN', 'Handcrafted pure Merino wool, pashmina, and embroidered heirloom shawls for gentlemen.', 2, true),
    ('c0000000-0000-0000-0000-000000000003', 'Women''s Luxury Lawn', 'womens-luxury-lawn', 'WOMEN', 'Editorial unstitched 3-piece designer lawn with organza dupattas, schiffli embroidery, and digital silks.', 3, true),
    ('c0000000-0000-0000-0000-000000000004', 'Women''s Chiffon & Festive', 'womens-festive', 'WOMEN', 'Heavily embellished wedding and formal unstitched ensembles with hand-worked sequins, tilla, and beads.', 4, true),
    ('c0000000-0000-0000-0000-000000000005', 'Women''s Velvet & Winter', 'womens-velvet', 'WOMEN', 'Opulent micro-velvet, karandi, and jacquard winter collections for prestigious occasions.', 5, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Subcategories
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

-- 4. Insert Shipping Zones (Pakistan)
INSERT INTO public.shipping_zones (id, name, provinces, rate, free_shipping_threshold, estimated_days, is_active)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'Punjab & Capital', ARRAY['Punjab', 'Islamabad Capital Territory'], 250.00, 5000.00, '2 - 3 Working Days', true),
    ('f0000000-0000-0000-0000-000000000002', 'Sindh', ARRAY['Sindh'], 300.00, 5000.00, '3 - 4 Working Days', true),
    ('f0000000-0000-0000-0000-000000000003', 'Khyber Pakhtunkhwa (KPK)', ARRAY['Khyber Pakhtunkhwa'], 350.00, 5000.00, '3 - 5 Working Days', true),
    ('f0000000-0000-0000-0000-000000000004', 'Balochistan & Remote Regions', ARRAY['Balochistan', 'Azad Kashmir', 'Gilgit-Baltistan'], 400.00, 7000.00, '4 - 7 Working Days', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Payment Methods
INSERT INTO public.payment_methods (id, code, name, instructions, account_details, is_active, display_order)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'COD', 'Cash on Delivery', 'Pay with cash upon package delivery. Please keep exact change ready.', '{"note": "Applicable across all cities in Pakistan."}'::jsonb, true, 1),
    ('a0000000-0000-0000-0000-000000000002', 'BANK_TRANSFER', 'Direct Bank Transfer / IBFT', 'Transfer total amount directly to our official corporate account. Please share payment receipt on WhatsApp or upload proof.', '{"bank_name": "Meezan Bank Limited", "account_title": "EBA Fashion Studio", "account_number": "01020304050607", "iban": "PK12MEZN0001020304050607", "branch": "Main Boulevard Branch, Lahore"}'::jsonb, true, 2),
    ('a0000000-0000-0000-0000-000000000003', 'JAZZCASH', 'JazzCash', 'Send payment directly to our official JazzCash Mobile Account. Please share payment screenshot or TID on WhatsApp for priority dispatch.', '{"account_title": "EBA Fashion Studio", "account_number": "0300 1234567", "mobile_number": "0300 1234567", "note": "Dial *786# or transfer via JazzCash Mobile App to Mobile Account."}'::jsonb, true, 3)
ON CONFLICT (id) DO NOTHING;

-- 6. Products are dynamically managed through the EBA Admin Dashboard
