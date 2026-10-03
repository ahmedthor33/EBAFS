const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { optionalToken, authenticateToken } = require('../middleware/auth');

function generateOrderNumber() {
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  return `EBA-${randomDigits}-PK`;
}

// Place Order (Full Checkout)
router.post('/checkout', optionalToken, (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      area,
      city,
      province,
      postal_code,
      country = 'Pakistan',
      payment_method, // 'cod' or 'bank_transfer'
      coupon_code,
      notes,
      items // array of { product_id, quantity, add_tailoring, tailoring_size }
    } = req.body;

    // 1. Validation
    if (!customer_name || !customer_email || !customer_phone || !shipping_address || !city || !province) {
      return res.status(400).json({ error: 'Please provide complete dispatch and contact details' });
    }

    const validPaymentMethods = ['cod', 'bank_transfer', 'jazzcash', 'easypaisa'];
    if (!payment_method || !validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ error: 'Please select a valid payment method (Cash on Delivery, Bank Wire, JazzCash, or Easypaisa)' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your shopping bag is empty' });
    }

    // 2. Fetch system settings & shipping zones
    const tailoringSetting = db.prepare("SELECT value FROM store_settings WHERE key = 'tailoring'").get();
    const tailoringFee = tailoringSetting ? JSON.parse(tailoringSetting.value).fee : 4500;

    const shippingSetting = db.prepare("SELECT value FROM store_settings WHERE key = 'shipping'").get();
    const shippingConfig = shippingSetting ? JSON.parse(shippingSetting.value) : { standard_fee: 250, free_shipping_threshold: 5000 };

    const zonesSetting = db.prepare("SELECT value FROM store_settings WHERE key = 'shipping_zones'").get();
    let shippingZones = [];
    try {
      shippingZones = zonesSetting ? JSON.parse(zonesSetting.value) : [];
    } catch (e) {
      shippingZones = [];
    }

    // 3. Validate items & stock server-side
    let subtotal = 0;
    let tailoringTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = db.prepare(`
        SELECT p.*,
          (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
        FROM products p WHERE p.id = ?
      `).get(item.product_id);

      if (!product || product.status !== 'published') {
        return res.status(400).json({ error: `Product "${item.product_name || 'selected item'}" is no longer available` });
      }

      const qty = parseInt(item.quantity) || 1;
      if (product.stock_quantity < qty) {
        return res.status(400).json({
          error: `Insufficient inventory for "${product.name}". Only ${product.stock_quantity} available.`
        });
      }

      const unitPrice = product.sale_price || product.price;
      const hasTailoring = item.add_tailoring ? 1 : 0;
      const itemTailoring = hasTailoring ? tailoringFee : 0;
      const lineTotal = (unitPrice * qty) + (itemTailoring * qty);

      subtotal += (unitPrice * qty);
      tailoringTotal += (itemTailoring * qty);

      validatedItems.push({
        product_id: product.id,
        sku: product.sku,
        product_name: product.name,
        quantity: qty,
        unit_price: unitPrice,
        tailoring_selected: hasTailoring,
        tailoring_fee: itemTailoring,
        total_price: lineTotal,
        image_url: product.primary_image || '/assets/gul_e_noor_details.png',
        current_stock: product.stock_quantity
      });
    }

    // 4. Validate Coupon
    let discountAmount = 0;
    let appliedCoupon = null;
    if (coupon_code && coupon_code.trim()) {
      const cleanCode = coupon_code.trim().toUpperCase();
      const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(cleanCode);

      if (coupon) {
        const now = new Date();
        const validDate = (!coupon.expiry_date || new Date(coupon.expiry_date) >= now) &&
                          (!coupon.start_date || new Date(coupon.start_date) <= now);
        const validLimit = !coupon.usage_limit || coupon.used_count < coupon.usage_limit;
        const validMin = !coupon.min_order || subtotal >= coupon.min_order;

        if (validDate && validLimit && validMin) {
          if (coupon.type === 'percentage') {
            discountAmount = (subtotal * coupon.value) / 100;
            if (coupon.max_discount && discountAmount > coupon.max_discount) {
              discountAmount = coupon.max_discount;
            }
          } else {
            discountAmount = Math.min(coupon.value, subtotal);
          }
          appliedCoupon = coupon;
        }
      }
    }

    // 5. Shipping & Final Total with Dynamic Zone Matching
    const totalBeforeShipping = subtotal + tailoringTotal - discountAmount;
    let shippingFee = (totalBeforeShipping >= shippingConfig.free_shipping_threshold) ? 0 : shippingConfig.standard_fee;
    let assignedCourier = 'TCS Express';

    // Match against active shipping zones
    const userCity = (city || '').trim().toLowerCase();
    const isInternational = country && country.toLowerCase() !== 'pakistan';

    const matchedZone = shippingZones.find(z => {
      if (!z.is_active) return false;
      if (isInternational && z.id === 'zone-international') return true;
      if (Array.isArray(z.cities)) {
        return z.cities.some(c => userCity === c.toLowerCase() || userCity.includes(c.toLowerCase()) || c.toLowerCase().includes(userCity));
      }
      return false;
    });

    if (matchedZone) {
      const threshold = typeof matchedZone.free_threshold === 'number' ? matchedZone.free_threshold : shippingConfig.free_shipping_threshold;
      shippingFee = (totalBeforeShipping >= threshold) ? 0 : Number(matchedZone.rate);
      if (matchedZone.courier) {
        assignedCourier = matchedZone.courier;
      }
    }

    const finalTotal = Math.max(0, totalBeforeShipping + shippingFee);

    const orderNumber = generateOrderNumber();
    const trackingNumber = `${assignedCourier.split(' ')[0].toUpperCase()}-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const userId = req.user ? req.user.id : null;

    // 6. Database Insertion Transaction
    const createOrderStmt = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        shipping_address, area, city, province, postal_code, country,
        subtotal, discount, shipping_fee, tax, total,
        payment_method, payment_status, order_status, tracking_number, courier_name, notes
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 0, ?,
        ?, 'pending', 'confirmed', ?, ?, ?
      )
    `);

    const orderResult = createOrderStmt.run(
      orderNumber, userId, customer_name.trim(), customer_email.trim(), customer_phone.trim(),
      shipping_address.trim(), area ? area.trim() : '', city.trim(), province.trim(), postal_code || '', country,
      subtotal + tailoringTotal, Math.round(discountAmount), shippingFee, Math.round(finalTotal),
      payment_method, trackingNumber, assignedCourier, notes || null
    );

    const orderId = Number(orderResult.lastInsertRowid);

    // 7. Insert Order Items & Deduct Inventory
    const insertOrderItemStmt = db.prepare(`
      INSERT INTO order_items (
        order_id, product_id, sku, product_name, quantity, unit_price,
        tailoring_selected, tailoring_fee, total_price, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const deductStockStmt = db.prepare(`
      UPDATE products 
      SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    const insertInvLogStmt = db.prepare(`
      INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const vItem of validatedItems) {
      insertOrderItemStmt.run(
        orderId, vItem.product_id, vItem.sku, vItem.product_name, vItem.quantity,
        vItem.unit_price, vItem.tailoring_selected, vItem.tailoring_fee, vItem.total_price, vItem.image_url
      );

      // Decrement stock
      deductStockStmt.run(vItem.quantity, vItem.product_id);

      // Log inventory change
      insertInvLogStmt.run(
        vItem.product_id,
        -vItem.quantity,
        vItem.current_stock,
        vItem.current_stock - vItem.quantity,
        `Order #${orderNumber} placed`
      );
    }

    // 8. Record Coupon Usage if applied
    if (appliedCoupon) {
      db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(appliedCoupon.id);
      db.prepare(`
        INSERT INTO coupon_usages (coupon_id, user_id, order_id)
        VALUES (?, ?, ?)
      `).run(appliedCoupon.id, userId, orderId);
    }

    // 9. Update Customer Profile Metrics if registered user
    if (userId) {
      db.prepare(`
        UPDATE customer_profiles 
        SET total_spent = total_spent + ?, orders_count = orders_count + 1
        WHERE user_id = ?
      `).run(finalTotal, userId);

      // Clear customer's persistent cart
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
    } else {
      const sessionId = req.headers['x-session-id'];
      if (sessionId) {
        db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(sessionId);
      }
    }

    res.status(201).json({
      success: true,
      order: {
        id: orderId,
        order_number: orderNumber,
        tracking_number: trackingNumber,
        courier_name: assignedCourier,
        payment_method,
        total: Math.round(finalTotal),
        customer_name,
        customer_phone,
        city
      },
      message: 'Your order has been confirmed by EBA Fashion Studio Atelier'
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Order placement failed. Please review your details and try again.' });
  }
});

// Single Order Lookup (for Confirmation screen or Tracking)
router.get('/lookup/:orderNumber', (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    res.json({
      order,
      items
    });
  } catch (err) {
    console.error('Order lookup error:', err);
    res.status(500).json({ error: 'Failed to look up order' });
  }
});

// Customer's Own Order History
router.get('/my-orders', authenticateToken, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT o.*,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as total_items,
        (SELECT image_url FROM order_items WHERE order_id = o.id LIMIT 1) as preview_image
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.id DESC
    `).all(req.user.id);

    res.json({ orders });
  } catch (err) {
    console.error('My orders error:', err);
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

module.exports = router;
