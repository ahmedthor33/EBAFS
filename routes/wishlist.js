const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// Get Wishlist
router.get('/', authenticateToken, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT w.id as wishlist_id, w.created_at as added_at, p.*,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ? AND p.status = 'published'
      ORDER BY w.id DESC
    `).all(req.user.id);

    res.json({
      items: items.map(item => ({
        ...item,
        primary_image: item.primary_image || '/assets/gul_e_noor_details.png',
        effective_price: item.sale_price || item.price
      })),
      count: items.length
    });
  } catch (err) {
    console.error('Wishlist fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// Toggle Wishlist item
router.post('/toggle', authenticateToken, (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const existing = db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);

    if (existing) {
      db.prepare('DELETE FROM wishlist WHERE id = ?').run(existing.id);
      return res.json({ added: false, message: 'Removed from your curated wishlist' });
    } else {
      db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, product_id);
      return res.json({ added: true, message: 'Saved to your curated wishlist' });
    }
  } catch (err) {
    console.error('Wishlist toggle error:', err);
    res.status(500).json({ error: 'Failed to update wishlist' });
  }
});

// Move Wishlist to Cart
router.post('/move-to-cart', authenticateToken, (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) {
      return res.status(400).json({ error: 'Product ID required' });
    }

    // Add to cart
    const existingInCart = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
    if (existingInCart) {
      db.prepare('UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?').run(existingInCart.id);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, 1)').run(req.user.id, product_id);
    }

    // Delete from wishlist
    db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.user.id, product_id);

    res.json({ message: 'Moved to your shopping bag' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to transfer item' });
  }
});

module.exports = router;
