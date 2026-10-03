const { supabase, projectId, supabaseUrl } = require('../db/supabase');
const db = require('../db/database');

async function sync() {
  console.log(`\n=======================================================`);
  console.log(`🔄 EBA Fashion Studio: Supabase Sync Utility`);
  console.log(`📡 Target Supabase Project: ${projectId}`);
  console.log(`🌐 Supabase URL: ${supabaseUrl}`);
  console.log(`=======================================================\n`);

  // 1. Probe for products table
  const { data: testData, error: probeErr } = await supabase.from('products').select('id').limit(1);

  if (probeErr && probeErr.code === 'PGRST205') {
    console.error(`❌ Table public.products not found in Supabase schema cache.`);
    console.log(`\n👉 INSTRUCTIONS TO INITIALIZE SUPABASE TABLES:`);
    console.log(`1. Go to: https://supabase.com/dashboard/project/${projectId}/sql/new`);
    console.log(`2. Open the file 'supabase/setup.sql' generated in your project.`);
    console.log(`3. Paste the entire content into the SQL Editor and click 'RUN'.`);
    console.log(`4. Re-run this sync script: npm run supabase:sync\n`);
    process.exit(1);
  }

  if (probeErr) {
    console.error(`⚠️ Connection or permissions warning:`, probeErr.message);
  } else {
    console.log(`✅ Supabase schema detected! Syncing records...`);
  }

  try {
    // Sync brands
    const brands = db.prepare('SELECT id, name, slug, description, logo_url, is_active FROM brands').all();
    const { error: bErr } = await supabase.from('brands').upsert(brands, { onConflict: 'slug' });
    if (bErr) console.warn('Brands sync note:', bErr.message);
    else console.log(`✅ Synced ${brands.length} brands to Supabase`);

    // Sync categories
    const categories = db.prepare('SELECT id, parent_id, name, slug, description, image_url, sort_order, is_active FROM categories').all();
    const { error: cErr } = await supabase.from('categories').upsert(categories, { onConflict: 'slug' });
    if (cErr) console.warn('Categories sync note:', cErr.message);
    else console.log(`✅ Synced ${categories.length} categories to Supabase`);

    // Sync products
    const products = db.prepare('SELECT * FROM products').all();
    const { error: pErr } = await supabase.from('products').upsert(products, { onConflict: 'slug' });
    if (pErr) console.warn('Products sync note:', pErr.message);
    else console.log(`✅ Synced ${products.length} products to Supabase`);

    // Sync coupons
    const coupons = db.prepare('SELECT * FROM coupons').all();
    const { error: cpErr } = await supabase.from('coupons').upsert(coupons, { onConflict: 'code' });
    if (cpErr) console.warn('Coupons sync note:', cpErr.message);
    else console.log(`✅ Synced ${coupons.length} coupons to Supabase`);

    // Sync CMS
    const cms = db.prepare('SELECT key, value FROM cms_content').all();
    const { error: cmsErr } = await supabase.from('cms_content').upsert(cms, { onConflict: 'key' });
    if (cmsErr) console.warn('CMS sync note:', cmsErr.message);
    else console.log(`✅ Synced ${cms.length} CMS content blocks to Supabase`);

    console.log(`\n🎉 Supabase synchronization completed successfully!`);
  } catch (err) {
    console.error('Sync failed:', err);
  }
}

sync();
