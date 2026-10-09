const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { optionalToken } = require('../middleware/auth');

function getCartOwner(req) {
  const userId = req.user ? req.user.id : null;
  const sessionId = req.headers['x-session-id'] || req.query.session_id || null;
  return { userId, sessionId };
}

// Fetch Cart
router.get('/', optionalToken, (req, res) => {
  try {
    const { userId, sessionId } = getCartOwner(req);
    if (!userId && !sessionId) {
      return res.json({
        items: [],
        itemCount: 0,
        subtotal: 0,
        tailoringTotal: 0,
        shippingFee: 0,
        discount: 0,
        freeShippingThreshold: 5000,
        amountToFreeShipping: 5000,
        total: 0
      });
    }

    let items;
    if (userId) {
      items = db.prepare(`
        SELECT c.*, p.name, p.slug, p.sku, p.price, p.sale_price, p.stock_quantity, p.fabric,
          (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
        ORDER BY c.id DESC
      `).all(userId);
    } else {
      items = db.prepare(`
        SELECT c.*, p.name, p.slug, p.sku, p.price, p.sale_price, p.stock_quantity, p.fabric,
          (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        WHERE c.session_id = ?
        ORDER BY c.id DESC
      `).all(sessionId);
    }

    // Get tailoring fee from store settings
    const tailoringSetting = db.prepare("SELECT value FROM store_settings WHERE key = 'tailoring'").get();
    const tailoringFee = tailoringSetting ? JSON.parse(tailoringSetting.value).fee : 4500;

    // Get shipping threshold
    const shippingSetting = db.prepare("SELECT value FROM store_settings WHERE key = 'shipping'").get();
    const shippingConfig = shippingSetting ? JSON.parse(shippingSetting.value) : { standard_fee: 250, free_shipping_threshold: 5000 };

    let subtotal = 0;
    let tailoringTotal = 0;

    const enrichedItems = items.map(item => {
      const unitPrice = item.sale_price || item.price;
      const itemTailoring = item.add_tailoring ? tailoringFee : 0;
      const lineTotal = (unitPrice * item.quantity) + (itemTailoring * item.quantity);

      subtotal += (unitPrice * item.quantity);
      tailoringTotal += (itemTailoring * item.quantity);

      return {
        ...item,
        unit_price: unitPrice,
        price: unitPrice,
        tailoring_fee: itemTailoring,
        line_total: lineTotal,
        image_url: item.primary_image || '/assets/gul_e_noor_details.png'
      };
    });

    const totalBeforeShipping = subtotal + tailoringTotal;
    const shippingFee = (totalBeforeShipping >= shippingConfig.free_shipping_threshold || enrichedItems.length === 0) 
      ? 0 
      : shippingConfig.standard_fee;

    res.json({
      items: enrichedItems,
      itemCount: enrichedItems.reduce((acc, i) => acc + i.quantity, 0),
      subtotal,
      tailoringTotal,
      shippingFee,
      freeShippingThreshold: shippingConfig.free_shipping_threshold,
      amountToFreeShipping: Math.max(0, shippingConfig.free_shipping_threshold - totalBeforeShipping),
      total: totalBeforeShipping + shippingFee
    });
  } catch (err) {
    console.error('Cart fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve cart' });
  }
});

// Add to Cart
router.post('/add', optionalToken, (req, res) => {
  try {
    const { userId, sessionId } = getCartOwner(req);
    const { product_id, quantity = 1, add_tailoring = 0, tailoring_size = null } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (!userId && !sessionId) {
      return res.status(400).json({ error: 'Session ID or customer authentication required' });
    }

    // Verify product exists and has stock
    const product = db.prepare('SELECT id, name, stock_quantity, status FROM products WHERE id = ?').get(product_id);
    if (!product || product.status !== 'published') {
      return res.status(404).json({ error: 'Product is unavailable' });
    }

    if (product.stock_quantity <= 0) {
      return res.status(400).json({ error: 'Product is currently out of stock' });
    }

    // Check existing item
    let existing;
    if (userId) {
      existing = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND add_tailoring = ?').get(userId, product_id, add_tailoring ? 1 : 0);
    } else {
      existing = db.prepare('SELECT id, quantity FROM cart_items WHERE session_id = ? AND product_id = ? AND add_tailoring = ?').get(sessionId, product_id, add_tailoring ? 1 : 0);
    }

    const qtyToAdd = Math.max(1, parseInt(quantity));

    if (existing) {
      const newQty = existing.quantity + qtyToAdd;
      if (newQty > product.stock_quantity) {
        return res.status(400).json({ error: `Cannot add more units. Available stock is ${product.stock_quantity}` });
      }
      db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQty, existing.id);
    } else {
      if (qtyToAdd > product.stock_quantity) {
        return res.status(400).json({ error: `Cannot add quantity. Available stock is ${product.stock_quantity}` });
      }
      db.prepare(`
        INSERT INTO cart_items (user_id, session_id, product_id, quantity, add_tailoring, tailoring_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, sessionId, product_id, qtyToAdd, add_tailoring ? 1 : 0, tailoring_size);
    }

    res.json({ message: 'Added to your bespoke shopping bag' });
  } catch (err) {
    console.error('Cart add error:', err);
    res.status(500).json({ error: 'Failed to add item to bag' });
  }
});

// Update Item
router.put('/update/:id', optionalToken, (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, add_tailoring } = req.body;
    const item = db.prepare('SELECT * FROM cart_items WHERE id = ?').get(id);

    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.product_id);
    const newQty = (quantity !== undefined && quantity !== null) ? parseInt(quantity) : item.quantity;

    if (newQty <= 0) {
      db.prepare('DELETE FROM cart_items WHERE id = ?').run(id);
      return res.json({ message: 'Item removed from bag' });
    }

    if (newQty > product.stock_quantity) {
      return res.status(400).json({ error: `Only ${product.stock_quantity} units available in atelier stock` });
    }

    db.prepare(`
      UPDATE cart_items 
      SET quantity = ?, 
          add_tailoring = COALESCE(?, add_tailoring),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newQty, add_tailoring !== undefined ? (add_tailoring ? 1 : 0) : null, id);

    res.json({ message: 'Shopping bag updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Remove Item
router.delete('/remove/:id', optionalToken, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(id);
    res.json({ message: 'Item removed from bag' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// Server-side Coupon Validation
router.post('/validate-coupon', optionalToken, (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Please enter a coupon code' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(cleanCode);

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or inactive promotional code' });
    }

    // Check expiry
    const now = new Date();
    if (coupon.expiry_date && new Date(coupon.expiry_date) < now) {
      return res.status(400).json({ error: 'This promotional code has expired' });
    }

    if (coupon.start_date && new Date(coupon.start_date) > now) {
      return res.status(400).json({ error: 'This promotional code is not yet active' });
    }

    // Check usage limits
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ error: 'This promotional code has reached its usage limit' });
    }

    // Check minimum order
    const cartSubtotal = Number(subtotal) || 0;
    if (coupon.min_order && cartSubtotal < coupon.min_order) {
      return res.status(400).json({
        error: `Minimum order of PKR ${coupon.min_order.toLocaleString()} required for this code`
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (cartSubtotal * coupon.value) / 100;
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount;
      }
    } else {
      discountAmount = Math.min(coupon.value, cartSubtotal);
    }

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount_amount: Math.round(discountAmount)
      },
      message: `Coupon ${coupon.code} applied! Saved PKR ${Math.round(discountAmount).toLocaleString()}`
    });
  } catch (err) {
    console.error('Coupon validation error:', err);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

module.exports = router;
