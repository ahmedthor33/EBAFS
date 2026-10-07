const bcrypt = require('bcryptjs');
const db = require('./database');

function seed() {
  console.log('--- Starting Database Seeding ---');

  // 1. Roles & Permissions
  const permissions = [
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'orders.view', 'orders.edit',
    'customers.view', 'customers.edit',
    'inventory.view', 'inventory.edit',
    'categories.manage', 'brands.manage', 'coupons.manage',
    'homepage.manage', 'reports.view', 'settings.manage',
    'users.manage', 'roles.manage'
  ];

  const insertPerm = db.prepare('INSERT OR IGNORE INTO roles_permissions (role, permission) VALUES (?, ?)');
  
  // Super Admin gets all permissions
  permissions.forEach(perm => insertPerm.run('superadmin', perm));
  
  // Admin gets all except users/roles
  permissions.filter(p => !p.startsWith('users.') && !p.startsWith('roles.')).forEach(perm => {
    insertPerm.run('admin', perm);
  });

  // Staff gets inventory, view products, view/edit orders
  ['products.view', 'inventory.view', 'inventory.edit', 'orders.view', 'orders.edit'].forEach(perm => {
    insertPerm.run('staff', perm);
  });

  // 2. Users
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('admin123', salt);
  const staffHash = bcrypt.hashSync('staff123', salt);
  const fatimaHash = bcrypt.hashSync('fatima123', salt);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, phone, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('Ahmed (Owner & Super Admin)', 'ahmedthor33@gmail.com', '+92 300 0000000', adminHash, 'superadmin', 'active');
  db.prepare("UPDATE users SET password_hash = ?, role = 'superadmin', status = 'active' WHERE email = 'ahmedthor33@gmail.com'").run(adminHash);
  insertUser.run('Fatima Noor', 'fatima@example.com', '+92 321 8456789', fatimaHash, 'customer', 'active');

  const fatima = db.prepare("SELECT id FROM users WHERE email = 'fatima@example.com'").get();
  if (fatima) {
    db.prepare(`
      INSERT OR IGNORE INTO customer_profiles (user_id, notes, total_spent, orders_count)
      VALUES (?, ?, ?, ?)
    `).run(fatima.id, 'VIP Patron. Prefers lawn and raw silk unstitched ensembles.', 31600, 2);

    db.prepare(`
      INSERT OR IGNORE INTO addresses (user_id, full_name, phone, street_address, area, city, province, postal_code, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(fatima.id, 'Fatima Noor', '+92 321 8456789', 'House 14-B, Street 32', 'Sector F-7/2', 'Islamabad', 'Islamabad Capital Territory', '44000');
  }

  // 3. Brands
  const insertBrand = db.prepare(`
    INSERT OR IGNORE INTO brands (name, slug, description, logo_url, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);
  insertBrand.run('EBA Signature Atelier', 'eba-signature-atelier', 'Couture hand-finished Pakistani master unstitched fabrics', '/assets/logo.png');
  insertBrand.run('EBA Royal Weaves', 'eba-royal-weaves', 'Aristocratic Egyptian Giza Cotton & Pure Boski silks', '/assets/logo.png');
  insertBrand.run('EBA Heritage Looms', 'eba-heritage-looms', 'Traditional handcrafted Karandi & authentic Khaddar weaves', '/assets/logo.png');

  // 4. Categories
  const insertCat = db.prepare(`
    INSERT OR IGNORE INTO categories (parent_id, name, slug, description, image_url, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  // Parents
  insertCat.run(null, 'Men', 'men', "Distinguished Pakistani Men's Unstitched Fabrics", '/assets/men_luxury_unstitched.png', 1);
  insertCat.run(null, 'Women', 'women', "Haute Couture Women's Unstitched Collections", '/assets/woman_opulent_lawn.png', 2);

  const menCat = db.prepare("SELECT id FROM categories WHERE slug = 'men'").get();
  const womenCat = db.prepare("SELECT id FROM categories WHERE slug = 'women'").get();

  // Men Subcategories
  insertCat.run(menCat.id, 'Egyptian Cotton 120s', 'egyptian-cotton-120s', 'High-density 120s combed Giza yarn for regal drape', '/assets/men_collection.png', 1);
  insertCat.run(menCat.id, 'Pure Boski', 'pure-boski', '8-Pound heavy silk unstitched length for festive gatherings', '/assets/men_luxury_unstitched.png', 2);
  insertCat.run(menCat.id, 'Winter Karandi', 'winter-karandi', 'Warm structured textured heritage Karandi suits', '/assets/men_collection.png', 3);
  insertCat.run(menCat.id, 'Wash & Wear Luxury', 'wash-and-wear-luxury', 'Microfiber high-twist wrinkle-resistant formal cuts', '/assets/men_luxury_unstitched.png', 4);
  insertCat.run(menCat.id, 'Classic Latha', 'classic-latha', 'Stiff finish pristine white heirloom cotton', '/assets/men_collection.png', 5);

  // Women Subcategories
  insertCat.run(womenCat.id, "Festive Lawn '25", 'festive-lawn-25', 'Embroidered festive Swiss lawn with pure silk & chiffon dupattas', '/assets/woman_opulent_lawn.png', 1);
  insertCat.run(womenCat.id, 'Schiffli Organza', 'schiffli-organza', 'Laser-cut schiffli embroidery on fine lawn and organza', '/assets/women_collection.png', 2);
  insertCat.run(womenCat.id, 'Pure Silk Chiffon', 'pure-silk-chiffon', 'Opulent raw silk and printed pure crinkle chiffon ensembles', '/assets/gul_e_noor_details.png', 3);
  insertCat.run(womenCat.id, 'Embroidered Khaddar', 'embroidered-khaddar', 'Winter handspun khaddar with Kashmiri woolen shawls', '/assets/woman_opulent_lawn.png', 4);

  // 5. Products
  const brandEBA = db.prepare("SELECT id FROM brands WHERE slug = 'eba-signature-atelier'").get();
  const brandRoyal = db.prepare("SELECT id FROM brands WHERE slug = 'eba-royal-weaves'").get();
  const brandHeritage = db.prepare("SELECT id FROM brands WHERE slug = 'eba-heritage-looms'").get();

  const subFestive = db.prepare("SELECT id FROM categories WHERE slug = 'festive-lawn-25'").get();
  const subSchiffli = db.prepare("SELECT id FROM categories WHERE slug = 'schiffli-organza'").get();
  const subSilkChiffon = db.prepare("SELECT id FROM categories WHERE slug = 'pure-silk-chiffon'").get();
  const subKhaddar = db.prepare("SELECT id FROM categories WHERE slug = 'embroidered-khaddar'").get();

  const subCotton = db.prepare("SELECT id FROM categories WHERE slug = 'egyptian-cotton-120s'").get();
  const subBoski = db.prepare("SELECT id FROM categories WHERE slug = 'pure-boski'").get();
  const subKarandi = db.prepare("SELECT id FROM categories WHERE slug = 'winter-karandi'").get();
  const subWashWear = db.prepare("SELECT id FROM categories WHERE slug = 'wash-and-wear-luxury'").get();
  const subLatha = db.prepare("SELECT id FROM categories WHERE slug = 'classic-latha'").get();

  const productsData = [
    {
      name: 'Gul-e-Noor 3-Piece Luxury Festive Lawn Ensemble',
      slug: 'gul-e-noor-3-piece-luxury-festive-lawn',
      sku: 'EBA-W-25-01',
      brand_id: brandEBA.id,
      category_id: womenCat.id,
      subcategory_id: subFestive.id,
      price: 15800,
      sale_price: 14200,
      cost_price: 8500,
      stock_quantity: 24,
      low_stock_threshold: 5,
      fabric: 'Supima Lawn 80s & Pure Chiffon',
      season: 'Festive / Spring 2025',
      color: 'Dusty Rose & Antique Gold',
      color_hex: '#c9a296',
      product_type: '3-Piece Unstitched',
      is_featured: 1,
      is_sale: 1,
      short_description: 'Opulent 3-piece festive lawn with marori and gold zari embroidery, accompanied by a 2.5m printed pure chiffon dupatta and dyed cambric trouser.',
      description: 'The Gul-e-Noor suite represents our atelier’s dedication to Pakistani textile heritage. Crafted on 80s fine Supima lawn with high thread count, it features intricate marori needlework along the neckline, daman, and sleeves. Paired with a gossamer pure silk chiffon dupatta and structured cambric trouser.',
      images: [
        { url: '/assets/gul_e_noor_details.png', type: 'primary', is_primary: 1 },
        { url: '/assets/woman_opulent_lawn.png', type: 'gallery', is_primary: 0 },
        { url: '/assets/women_collection.png', type: 'detail', is_primary: 0 }
      ]
    },
    {
      name: 'Shahkaar Egyptian Giza 120s Kurta Shalwar',
      slug: 'shahkaar-egyptian-giza-120s-kurta-shalwar',
      sku: 'EBA-M-25-01',
      brand_id: brandRoyal.id,
      category_id: menCat.id,
      subcategory_id: subCotton.id,
      price: 12800,
      sale_price: null,
      cost_price: 7000,
      stock_quantity: 35,
      low_stock_threshold: 6,
      fabric: '100% Combed Egyptian Giza Cotton 120s',
      season: 'All Season / Formal',
      color: 'Charcoal Obsidian',
      color_hex: '#212224',
      product_type: 'Unstitched 4.5m',
      is_featured: 1,
      is_sale: 0,
      short_description: 'Monumental 4.5m Egyptian cotton unstitched suit fabric with a silken matte finish and impeccable crease resistance.',
      description: 'Spun from authentic Egyptian long-staple Giza fiber, Shahkaar achieves an extraordinarily soft yet structured drape. Designed for formal wear and boardroom elegance, this suit retains its sharp silhouette in humid and warm climates.',
      images: [
        { url: '/assets/men_luxury_unstitched.png', type: 'primary', is_primary: 1 },
        { url: '/assets/hero_campaign_split.png', type: 'gallery', is_primary: 0 },
        { url: '/assets/men_collection.png', type: 'detail', is_primary: 0 }
      ]
    },
    {
      name: 'Zarmineh Schiffli Organza Couture Suite',
      slug: 'zarmineh-schiffli-organza-couture-suite',
      sku: 'EBA-W-25-02',
      brand_id: brandEBA.id,
      category_id: womenCat.id,
      subcategory_id: subSchiffli.id,
      price: 19500,
      sale_price: null,
      cost_price: 11000,
      stock_quantity: 18,
      low_stock_threshold: 4,
      fabric: 'Laser Schiffli Organza & Lawn',
      season: 'Festive / Eid Edition',
      color: 'Sage Green & Ivory',
      color_hex: '#a3b19b',
      product_type: '3-Piece Unstitched',
      is_featured: 1,
      is_sale: 0,
      short_description: 'Mint sage green designer unstitched lawn with heavy zari schiffli organza dupatta and hand-finished neckline border.',
      description: 'The Zarmineh collection captures royal garden splendor. Featuring laser-cut schiffli cutwork motifs embedded into fine lawn, finished with a luminous metallic zari organza dupatta.',
      images: [
        { url: '/assets/woman_opulent_lawn.png', type: 'primary', is_primary: 1 },
        { url: '/assets/women_collection.png', type: 'gallery', is_primary: 0 },
        { url: '/assets/gul_e_noor_details.png', type: 'detail', is_primary: 0 }
      ]
    },
    {
      name: 'Dastoor Textured Winter Karandi Ensemble',
      slug: 'dastoor-textured-winter-karandi-ensemble',
      sku: 'EBA-M-25-02',
      brand_id: brandHeritage.id,
      category_id: menCat.id,
      subcategory_id: subKarandi.id,
      price: 14500,
      sale_price: 12900,
      cost_price: 8000,
      stock_quantity: 20,
      low_stock_threshold: 4,
      fabric: 'Handspun Woven Karandi Fabric',
      season: 'Autumn / Winter',
      color: 'Camel Taupe',
      color_hex: '#967d60',
      product_type: 'Unstitched 4.0m',
      is_featured: 1,
      is_sale: 1,
      short_description: 'Heirloom handspun textured Karandi tailored for winter dignity and sovereign comfort.',
      description: 'Dastoor is woven by master artisans in Pakistan utilizing age-old slub technique, giving it natural textured character with reassuring warmth for winter occasions and evening ceremonies.',
      images: [
        { url: '/assets/men_collection.png', type: 'primary', is_primary: 1 },
        { url: '/assets/men_luxury_unstitched.png', type: 'gallery', is_primary: 0 }
      ]
    },
    {
      name: 'Koh-e-Noor Pure 8-Pound Chinese Boski',
      slug: 'koh-e-noor-pure-8-pound-chinese-boski',
      sku: 'EBA-M-25-03',
      brand_id: brandRoyal.id,
      category_id: menCat.id,
      subcategory_id: subBoski.id,
      price: 24500,
      sale_price: null,
      cost_price: 16000,
      stock_quantity: 12,
      low_stock_threshold: 3,
      fabric: '100% Spun Silk (Original 8-Pound Weight)',
      season: 'Festive / Wedding',
      color: 'Pristine Cream Ivory',
      color_hex: '#f5f0e1',
      product_type: 'Unstitched 4.5m',
      is_featured: 1,
      is_sale: 0,
      short_description: 'Authentic 8-Pound heavy Chinese silk Boski with peerless luster, fluid drape, and heritage prestige.',
      description: 'The definitive royal attire for celebratory occasions. Each 4.5-meter cut of Koh-e-Noor Boski carries the genuine heavyweight 8-pound certification seal and provides unparalleled silken softness against the skin.',
      images: [
        { url: '/assets/hero_campaign_split.png', type: 'primary', is_primary: 1 },
        { url: '/assets/men_luxury_unstitched.png', type: 'gallery', is_primary: 0 }
      ]
    },
    {
      name: 'Mehr-o-Mah Heavy Resham Raw Silk 3-Piece',
      slug: 'mehr-o-mah-heavy-resham-raw-silk-3-piece',
      sku: 'EBA-W-25-03',
      brand_id: brandEBA.id,
      category_id: womenCat.id,
      subcategory_id: subSilkChiffon.id,
      price: 22000,
      sale_price: null,
      cost_price: 13000,
      stock_quantity: 8,
      low_stock_threshold: 2,
      fabric: 'Pure Raw Silk 80g & Organza Jacquard',
      season: 'Festive / Wedding Guest',
      color: 'Garnet Crimson & Gold',
      color_hex: '#8b1e2d',
      product_type: '3-Piece Unstitched',
      is_featured: 0,
      is_sale: 0,
      short_description: 'Majestic garnet red raw silk unstitched suite embellished with resham threadwork, gold foil, and heavy borders.',
      description: 'Rich garnet red raw silk adorned with Kashmiri resham tilla motifs. Includes 3.25m raw silk shirt, matching dyed silk trousers, and an organza jacquard dupatta trimmed with artisan borders.',
      images: [
        { url: '/assets/women_collection.png', type: 'primary', is_primary: 1 },
        { url: '/assets/gul_e_noor_details.png', type: 'gallery', is_primary: 0 }
      ]
    },
    {
      name: 'Sarmast High-Twist Wrinkle-Resistant Wash & Wear',
      slug: 'sarmast-high-twist-wash-and-wear',
      sku: 'EBA-M-25-04',
      brand_id: brandHeritage.id,
      category_id: menCat.id,
      subcategory_id: subWashWear.id,
      price: 9500,
      sale_price: 8500,
      cost_price: 5000,
      stock_quantity: 42,
      low_stock_threshold: 8,
      fabric: 'High-Twist Microfiber Poly-Viscose Blend',
      season: 'Spring / Summer',
      color: 'Deep Midnight Navy',
      color_hex: '#182436',
      product_type: 'Unstitched 4.25m',
      is_featured: 0,
      is_sale: 1,
      short_description: 'Daily executive wash & wear fabric with cool breathability, structured fall, and iron-free maintenance.',
      description: 'Designed for daily elegance, Sarmast combines high-twist poly-viscose yarns to offer maximum wrinkle recovery and easy home laundering without losing its pristine look.',
      images: [
        { url: '/assets/men_luxury_unstitched.png', type: 'primary', is_primary: 1 },
        { url: '/assets/men_collection.png', type: 'gallery', is_primary: 0 }
      ]
    },
    {
      name: 'Noor-e-Jahan Swiss Cambric & Schiffli 3-Piece',
      slug: 'noor-e-jahan-swiss-cambric-schiffli',
      sku: 'EBA-W-25-04',
      brand_id: brandEBA.id,
      category_id: womenCat.id,
      subcategory_id: subSchiffli.id,
      price: 16500,
      sale_price: 14900,
      cost_price: 9000,
      stock_quantity: 16,
      low_stock_threshold: 4,
      fabric: 'Fine Swiss Cambric & Chiffon',
      season: 'Summer / Eid',
      color: 'Pearl White & Gold',
      color_hex: '#edeae1',
      product_type: '3-Piece Unstitched',
      is_featured: 0,
      is_sale: 1,
      short_description: 'Pristine pearl white cambric with delicate gold zari embroidery and hand-printed silk chiffon dupatta.',
      description: 'A serene study in white and champagne gold. Features exquisite tonal embroidery on Swiss cambric fabric with a lightweight flowing chiffon dupatta.',
      images: [
        { url: '/assets/woman_opulent_lawn.png', type: 'primary', is_primary: 1 },
        { url: '/assets/gul_e_noor_details.png', type: 'gallery', is_primary: 0 }
      ]
    },
    {
      name: 'Iqbalian Classic Latha Unstitched Fabric',
      slug: 'iqbalian-classic-latha-unstitched-fabric',
      sku: 'EBA-M-25-05',
      brand_id: brandRoyal.id,
      category_id: menCat.id,
      subcategory_id: subLatha.id,
      price: 8900,
      sale_price: null,
      cost_price: 4500,
      stock_quantity: 50,
      low_stock_threshold: 10,
      fabric: '100% Fine Long-Staple Cotton Latha',
      season: 'Summer / All Season',
      color: 'Crisp Bleached White',
      color_hex: '#ffffff',
      product_type: 'Unstitched 4.5m',
      is_featured: 0,
      is_sale: 0,
      short_description: 'Traditional crisp starched finish classic Latha fabric crafted for authentic Pakistani Shalwar Kameez.',
      description: 'The golden standard of Pakistani traditional attire. Spun from 100% pure long-staple cotton, this classic Latha features a crisp finish that maintains sharp creases and royal poise.',
      images: [
        { url: '/assets/men_collection.png', type: 'primary', is_primary: 1 },
        { url: '/assets/hero_campaign_split.png', type: 'gallery', is_primary: 0 }
      ]
    },
    {
      name: 'Bahaar Kashmiri Embroidered Winter Khaddar',
      slug: 'bahaar-kashmiri-embroidered-winter-khaddar',
      sku: 'EBA-W-25-05',
      brand_id: brandHeritage.id,
      category_id: womenCat.id,
      subcategory_id: subKhaddar.id,
      price: 18200,
      sale_price: null,
      cost_price: 10500,
      stock_quantity: 14,
      low_stock_threshold: 3,
      fabric: 'Handloom Khaddar & Pure Wool Shawl',
      season: 'Winter 2025',
      color: 'Pistachio Moss & Rust',
      color_hex: '#7c8d76',
      product_type: '3-Piece Unstitched with Shawl',
      is_featured: 1,
      is_sale: 0,
      short_description: 'Cozy authentic handloom khaddar suit accompanied by a 2.5m pure woolen warm jacquard shawl.',
      description: 'Hand-crafted for winter warmth, Bahaar marries the rich texture of traditional Pakistani Khaddar with floral Kashmiri embroidery and a luxuriously soft woven wool shawl.',
      images: [
        { url: '/assets/women_collection.png', type: 'primary', is_primary: 1 },
        { url: '/assets/woman_opulent_lawn.png', type: 'gallery', is_primary: 0 }
      ]
    }
  ];

  const insertProd = db.prepare(`
    INSERT OR IGNORE INTO products (
      name, slug, sku, brand_id, category_id, subcategory_id,
      description, short_description, price, sale_price, cost_price,
      stock_quantity, low_stock_threshold, fabric, season, color, color_hex,
      product_type, is_featured, is_sale, status
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, 'published'
    )
  `);

  const insertImg = db.prepare(`
    INSERT INTO product_images (product_id, image_url, image_type, sort_order, is_primary)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertInvLog = db.prepare(`
    INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason)
    VALUES (?, ?, 0, ?, 'Initial inventory stock seed')
  `);

  for (const p of productsData) {
    insertProd.run(
      p.name, p.slug, p.sku, p.brand_id, p.category_id, p.subcategory_id,
      p.description, p.short_description, p.price, p.sale_price, p.cost_price,
      p.stock_quantity, p.low_stock_threshold, p.fabric, p.season, p.color, p.color_hex,
      p.product_type, p.is_featured, p.is_sale
    );

    const created = db.prepare('SELECT id FROM products WHERE sku = ?').get(p.sku);
    if (created) {
      // Ensure stock quantity is restored on re-seeding
      db.prepare('UPDATE products SET stock_quantity = ?, status = ? WHERE id = ?').run(p.stock_quantity, 'published', created.id);
      // Clear old images if re-seeding
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(created.id);
      p.images.forEach((img, idx) => {
        insertImg.run(created.id, img.url, img.type, idx, img.is_primary);
      });
      // Inventory log
      insertInvLog.run(created.id, p.stock_quantity, p.stock_quantity);
    }
  }

  // 6. Seed Coupons
  const insertCoupon = db.prepare(`
    INSERT OR IGNORE INTO coupons (code, type, value, min_order, max_discount, usage_limit, used_count, start_date, expiry_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 0, '2025-01-01', '2027-12-31', 1)
  `);

  insertCoupon.run('WELCOME10', 'percentage', 10, 10000, 3000, 500);
  insertCoupon.run('FESTIVE25', 'fixed', 2500, 15000, 2500, 200);
  insertCoupon.run('VIPATELIER', 'percentage', 15, 20000, 5000, 100);

  // 7. Seed CMS Content
  const insertCMS = db.prepare('INSERT OR REPLACE INTO cms_content (key, value) VALUES (?, ?)');

  insertCMS.run('announcement_bar', JSON.stringify({
    text: 'Free Express Delivery Across Pakistan on Orders Above PKR 5,000 | Cash on Delivery (COD) Available Worldwide',
    enabled: true
  }));

  insertCMS.run('hero_banner', JSON.stringify({
    tagline: "Unstitched Autumn/Festive ’25 Edition",
    title: 'The Art of Pakistani Weaves',
    subtitle: 'Exquisite unstitched fabrics tailored for the discerning connoisseur — Hand-selected Egyptian Cotton, Festive Lawn, and Raw Silk woven across premier Pakistani mills.',
    image: '/assets/hero_campaign_editorial.png',
    badge1: 'Complimentary Nationwide Shipping',
    badge2: 'Cash on Delivery Available',
    cta_men_text: "Explore Men's Unstitched",
    cta_men_link: '#men',
    cta_women_text: "Explore Women's Festive Lawn",
    cta_women_link: '#women',
    enabled: true
  }));

  insertCMS.run('portal_sections', JSON.stringify({
    men: {
      badge: "Men's Atelier",
      edition: 'Autumn / Winter Weaves • 01',
      title: "The Gentleman's Edit",
      description: 'Timeless unstitched Latha, structured winter Karandi, luxurious pure Boski, and crease-resistant high-twist Wash & Wear cuts.',
      image: '/assets/men_luxury_unstitched.png',
      tags: ['Egyptian 120s', 'Winter Karandi', 'Raw Silk 4.5m'],
      cta_text: 'Shop Men',
      link: '#men'
    },
    women: {
      badge: "Festive '25 Preview",
      edition: 'Festive Lawn Drop • 02',
      title: 'The Couture Lawn ’25',
      description: 'Intricate Kashmiri tilla motifs, jacquard borders, printed chiffon dupattas, and three-piece unstitched masterpieces woven on Swiss looms.',
      image: '/assets/woman_opulent_lawn.png',
      tags: ['Schiffli Lawn', 'Silk Dupatta', '3-Piece Suite'],
      cta_text: 'Shop Women',
      link: '#women'
    }
  }));

  insertCMS.run('running_ticker', JSON.stringify([
    '100% Authentic Thread Counts',
    'Pure Supima & Egyptian Cotton 120s',
    'Master Artisan Embroideries',
    'Worldwide DHL Express Delivery',
    'Bespoke Studio Master-Tailoring'
  ]));

  insertCMS.run('promotional_banner', JSON.stringify({
    title: 'Curated Atelier Packaging',
    subtitle: 'Every unstitched length is delivered in a climate-sealed monogrammed heirloom box with authentic yardage certification.',
    image: '/assets/hero_campaign_split.png',
    enabled: true
  }));

  insertCMS.run('men_banner', JSON.stringify({
    tagline: "Haute Sartorial Weaves • The Gentleman's Edit",
    title: "Men's Unstitched Atelier",
    subtitle: "Timeless Pakistani craft meets modern sartorial precision. Discover 4.5-meter cuts of premium Egyptian Giza 120s cotton, royal pure Boski silk, crisp summer Latha, and seasonal Wash & Wear crafted for distinguished silhouette drapes.",
    image: '/assets/men_luxury_unstitched.png',
    badge1: "100% Authentic Thread Counts",
    badge2: "Mother-of-Pearl Buttons Included",
    badge3: "Complimentary Nationwide Shipping",
    enabled: true
  }));

  insertCMS.run('women_banner', JSON.stringify({
    tagline: "Couture Edit • Vol. I",
    title: "Women's Luxury Festive Lawn '25",
    subtitle: "Sumptuous 3-piece unstitched masterpieces featuring intricate zari marori embroidery, organza cutwork borders, and pure silk & printed chiffon dupattas crafted for celebratory splendor.",
    image: '/assets/woman_opulent_lawn.png',
    badge1: "3-Piece Luxury Festive Suites",
    badge2: "Pure Silk Chiffon Dupattas",
    badge3: "Bespoke Master Tailoring Available",
    enabled: true
  }));

  insertCMS.run('new_arrivals_banner', JSON.stringify({
    tagline: "Fresh Loom Dispatches • Autumn / Festive ’25",
    title: "New Unstitched Arrivals",
    subtitle: "Fresh off the master looms. Hand-curated seasonal releases in ultra-fine Egyptian cotton, embroidered festive lawn, and heritage textured weaves.",
    image: '/assets/hero_campaign_editorial.png',
    badge1: "Fresh Loom Dispatches",
    badge2: "Limited Edition Yardage",
    badge3: "48-Hour Priority Dispatch",
    enabled: true
  }));

  insertCMS.run('sale_banner', JSON.stringify({
    tagline: "Exclusive Archive Reductions",
    title: "Seasonal Archive & Sale",
    subtitle: "Exceptional values on select end-of-edition unstitched luxury fabrics. Complete with authentic selvedge verification and complimentary signature packaging.",
    image: '/assets/hero_campaign_split.png',
    badge1: "Privilege Reductions Up to 30%",
    badge2: "Authentic Yardage Certification",
    badge3: "Limited Vault Stocks",
    enabled: true
  }));

  insertCMS.run('catalog_banner', JSON.stringify({
    tagline: "The Master Textile Vault",
    title: "Curated Atelier Catalog",
    subtitle: "Explore the complete archives of EBA Fashion Studio — from regal winter Karandi and Egyptian cottons to decadent celebratory lawn ensembles.",
    image: '/assets/hero_campaign_editorial.png',
    badge1: "Certified Thread Counts",
    badge2: "Nationwide Express Shipping",
    badge3: "Master Bespoke Tailoring",
    enabled: true
  }));

  insertCMS.run('cart_banner', JSON.stringify({
    tagline: "Atelier Bag • Haute Couture Dispatch",
    title: "Your Curated Wardrobe Bag",
    subtitle: "Every unstitched length is delivered in a climate-sealed monogrammed heirloom box with authentic yardage certification.",
    image: '/assets/hero_campaign_split.png',
    badge1: "Climate-Sealed Monogrammed Box",
    badge2: "Free Shipping Above PKR 5,000",
    badge3: "Verified Yardage Guarantee",
    enabled: true
  }));

  insertCMS.run('checkout_banner', JSON.stringify({
    tagline: "Verified Checkout Salon",
    title: "Express Atelier Checkout",
    subtitle: "256-Bit SSL Encrypted • Real-time SMS & WhatsApp Courier Dispatch Verification",
    image: '/assets/hero_campaign_editorial.png',
    badge1: "Live Inventory Locked",
    badge2: "TCS Nationwide Delivery",
    badge3: "Encrypted Secure Payment",
    enabled: true
  }));

  // 8. Seed Store Settings
  const insertSetting = db.prepare('INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)');

  insertSetting.run('general', JSON.stringify({
    store_name: 'EBA Fashion Studio',
    tagline: 'Haute Couture Pakistani Unstitched Fabrics',
    logo_url: '/assets/logo.png',
    email: 'concierge@ebafashionstudio.com',
    domain: 'ebafashionstudio.com',
    website: 'https://ebafashionstudio.com',
    phone: '0325-4473333',
    whatsapp: '0325-4473333',
    address: 'Flagship Salon, M.M. Alam Road, Gulberg III, Lahore, Pakistan',
    city: 'Lahore',
    country: 'Pakistan'
  }));

  insertSetting.run('shipping', JSON.stringify({
    standard_fee: 250,
    free_shipping_threshold: 5000,
    courier_partners: ['TCS Express', 'Leopards Courier', 'DHL Express'],
    estimated_delivery: '2 - 4 Business Days Across Pakistan'
  }));

  insertSetting.run('payments', JSON.stringify({
    cod: {
      enabled: true,
      title: 'Cash on Delivery (COD)',
      handling_fee: 0,
      max_amount: 75000,
      description: 'Pay with physical cash upon doorstep delivery anywhere in Pakistan via TCS / Leopards.'
    },
    bank_transfer: {
      enabled: true,
      title: 'Direct Bank Wire / Online IBAN Transfer',
      bank_name: 'Meezan Bank Ltd',
      account_title: 'EBA Fashion Studio Pvt Ltd',
      account_number: '01000948210001',
      iban: 'PK64MEZN0001000948210001',
      branch: 'Gulberg III Main Boulevard Flagship, Lahore',
      instructions: 'Please transfer invoice total to verified Meezan Bank and send receipt to WhatsApp 0325-4473333.'
    },
    jazzcash: {
      enabled: true,
      title: 'JazzCash Mobile Wallet & Direct Pay',
      merchant_id: '03001234567',
      merchant_name: 'EBA FASHION STUDIO',
      account_number: '0300 1234567',
      instructions: 'Send payment via JazzCash App or dial *786# to Till 0300 1234567.'
    },
    easypaisa: {
      enabled: true,
      title: 'Easypaisa Mobile Wallet & QR Pay',
      till_id: '78491',
      account_title: 'EBA FASHION STUDIO',
      account_number: '0321 8456789',
      instructions: 'Send payment via Easypaisa App to Mobile Account: 0321 8456789.'
    }
  }));

  insertSetting.run('tailoring', JSON.stringify({
    enabled: true,
    fee: 4500,
    title: 'Master Tailor Stitching Service',
    description: 'Custom bespoke tailoring. Select standard sizing (XS–XL) or input custom chest/kameez length at checkout.'
  }));

  // 9. Seed Demo Orders for Fatima Noor to match Stitch mockups!
  const existingOrders = db.prepare("SELECT count(*) as count FROM orders").get();
  if (existingOrders.count === 0 && fatima) {
    const prod1 = db.prepare("SELECT * FROM products WHERE sku = 'EBA-W-25-01'").get();
    const prod2 = db.prepare("SELECT * FROM products WHERE sku = 'EBA-M-25-01'").get();

    // Past delivered order
    const pastOrder = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        shipping_address, area, city, province, postal_code, country,
        subtotal, discount, shipping_fee, tax, total,
        payment_method, payment_status, order_status, tracking_number, courier_name, notes,
        created_at
      ) VALUES (
        'EBA-88124-PK', ?, 'Fatima Noor', 'fatima@example.com', '+92 321 8456789',
        'House 14-B, Street 32', 'Sector F-7/2', 'Islamabad', 'Islamabad Capital Territory', '44000', 'Pakistan',
        15800, 0, 0, 0, 15800,
        'cod', 'paid', 'delivered', 'TCS-9918234', 'TCS Express', 'Customer requested evening delivery',
        datetime('now', '-25 days')
      )
    `).run(fatima.id);

    db.prepare(`
      INSERT INTO order_items (order_id, product_id, sku, product_name, quantity, unit_price, tailoring_selected, tailoring_fee, total_price, image_url)
      VALUES (?, ?, ?, ?, 1, 15800, 0, 0, 15800, ?)
    `).run(pastOrder.lastInsertRowid, prod1.id, prod1.sku, prod1.name, '/assets/gul_e_noor_details.png');

    // Recent active order (matches the Stitch Order Confirmation screen: #EBA-94821-PK)
    const activeOrder = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        shipping_address, area, city, province, postal_code, country,
        subtotal, discount, shipping_fee, tax, total,
        payment_method, payment_status, order_status, tracking_number, courier_name, notes,
        created_at
      ) VALUES (
        'EBA-94821-PK', ?, 'Fatima Noor', 'fatima@example.com', '+92 321 8456789',
        'House 14-B, Street 32', 'Sector F-7/2', 'Islamabad', 'Islamabad Capital Territory', '44000', 'Pakistan',
        28600, 2500, 0, 0, 26100,
        'cod', 'pending', 'processing', 'TCS-77291048', 'TCS Express', 'Careful heirloom box handling',
        datetime('now', '-2 hours')
      )
    `).run(fatima.id);

    db.prepare(`
      INSERT INTO order_items (order_id, product_id, sku, product_name, quantity, unit_price, tailoring_selected, tailoring_fee, total_price, image_url)
      VALUES (?, ?, ?, ?, 1, 15800, 1, 4500, 20300, ?)
    `).run(activeOrder.lastInsertRowid, prod1.id, prod1.sku, prod1.name, '/assets/gul_e_noor_details.png');

    db.prepare(`
      INSERT INTO order_items (order_id, product_id, sku, product_name, quantity, unit_price, tailoring_selected, tailoring_fee, total_price, image_url)
      VALUES (?, ?, ?, ?, 1, 12800, 0, 0, 12800, ?)
    `).run(activeOrder.lastInsertRowid, prod2.id, prod2.sku, prod2.name, '/assets/men_luxury_unstitched.png');
  }

  // 10. Advanced Settings (Pakistani Payment Methods & Shipping Zones)
  try {
    require('../scripts/init-advanced-settings');
  } catch (err) {
    console.warn('Advanced settings initialization notice:', err.message);
  }

  console.log('--- Database Seeding Successfully Completed ---');
}

seed();
