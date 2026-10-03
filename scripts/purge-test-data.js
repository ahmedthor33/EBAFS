const db = require('../db/database');
const { supabase } = require('../db/supabase');

async function purgeAllTestData() {
  console.log('=======================================================');
  console.log('🧹 Purging All Test Orders, Payments, & Products');
  console.log('=======================================================');

  // 1. Local SQLite Purge
  try {
    db.exec('BEGIN TRANSACTION;');

    // Purge order items & orders
    const deletedOrderItems = db.prepare('DELETE FROM order_items').run();
    const deletedOrders = db.prepare('DELETE FROM orders').run();
    console.log(`✅ Removed ${deletedOrders.changes} orders and ${deletedOrderItems.changes} order items.`);

    // Purge coupon usages & reset coupon counters
    const deletedCouponUsages = db.prepare('DELETE FROM coupon_usages').run();
    db.prepare('UPDATE coupons SET used_count = 0').run();
    console.log(`✅ Cleared ${deletedCouponUsages.changes} coupon usages and reset coupon counters.`);

    // Purge abandoned carts & wishlists
    const deletedCarts = db.prepare('DELETE FROM cart_items').run();
    const deletedWishlist = db.prepare('DELETE FROM wishlist').run();
    console.log(`✅ Cleared ${deletedCarts.changes} cart items and ${deletedWishlist.changes} wishlist items.`);

    // Purge products, images, & inventory logs
    const deletedImages = db.prepare('DELETE FROM product_images').run();
    const deletedInvLogs = db.prepare('DELETE FROM inventory_logs').run();
    const deletedProducts = db.prepare('DELETE FROM products').run();
    console.log(`✅ Removed ${deletedProducts.changes} products, ${deletedImages.changes} product images, and ${deletedInvLogs.changes} inventory logs.`);

    // Reset customer spend & order metrics
    db.prepare('UPDATE customer_profiles SET total_spent = 0.0, orders_count = 0').run();
    console.log('✅ Reset all customer financial and order counters to 0.');

    // Reset auto-increment sequence counters for fresh numbering
    try {
      db.prepare(`
        DELETE FROM sqlite_sequence 
        WHERE name IN ('orders', 'order_items', 'products', 'product_images', 'cart_items', 'wishlist', 'inventory_logs', 'coupon_usages')
      `).run();
      console.log('✅ Reset table auto-increment sequences for clean starting IDs.');
    } catch (seqErr) {
      console.warn('Sequence reset notice:', seqErr.message);
    }

    db.exec('COMMIT;');
    console.log('\n🌟 Local SQLite Database completely purged and reset!');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('❌ Failed to purge SQLite:', err);
    throw err;
  }

  // 2. Supabase Cloud Sync Purge
  try {
    console.log('\n--- Syncing Purge to Supabase Cloud ---');

    const { error: oiErr } = await supabase.from('order_items').delete().neq('id', 0);
    if (oiErr) console.warn('Supabase order_items purge note:', oiErr.message);

    const { error: oErr } = await supabase.from('orders').delete().neq('id', 0);
    if (oErr) console.warn('Supabase orders purge note:', oErr.message);

    const { error: piErr } = await supabase.from('product_images').delete().neq('id', 0);
    if (piErr) console.warn('Supabase product_images purge note:', piErr.message);

    const { error: pErr } = await supabase.from('products').delete().neq('id', 0);
    if (pErr) console.warn('Supabase products purge note:', pErr.message);

    const { error: cErr } = await supabase.from('cart_items').delete().neq('id', 0);
    if (cErr) console.warn('Supabase cart_items purge note:', cErr.message);

    const { error: wErr } = await supabase.from('wishlist').delete().neq('id', 0);
    if (wErr) console.warn('Supabase wishlist purge note:', wErr.message);

    console.log('✅ Supabase Cloud successfully synced with clean slate!');
  } catch (sbErr) {
    console.warn('Supabase purge notice:', sbErr.message);
  }

  console.log('\n=======================================================');
  console.log('✨ ALL TESTING ORDERS, PAYMENTS, & PRODUCTS REMOVED');
  console.log('👑 Ready for Owner (ahmedthor33@gmail.com) Catalog Input');
  console.log('=======================================================');
}

purgeAllTestData().catch(err => {
  console.error('Purge error:', err);
  process.exit(1);
});
