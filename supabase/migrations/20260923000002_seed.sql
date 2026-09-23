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

-- 6. Insert Representative Luxury Products
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

-- 7. Insert Initial Product Images
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
