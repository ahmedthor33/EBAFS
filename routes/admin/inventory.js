const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { requirePermission } = require('../../middleware/auth');

// List inventory overview
router.get('/', requirePermission('inventory.view'), (req, res) => {
  try {
    const { status, q } = req.query;

    let query = `
      SELECT p.id, p.name, p.sku, p.stock_quantity, p.low_stock_threshold, p.price, p.fabric,
             c.name as category_name,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published'
    `;
    const params = [];

    if (q && q.trim()) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ?)`;
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    if (status === 'low') {
      query += ` AND p.stock_quantity <= p.low_stock_threshold AND p.stock_quantity > 0`;
    } else if (status === 'out') {
      query += ` AND p.stock_quantity <= 0`;
    }

    query += ` ORDER BY p.stock_quantity ASC`;

    const inventory = db.prepare(query).all(...params);

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock,
        SUM(stock_quantity) as total_units
      FROM products WHERE status = 'published'
    `).get();

    res.json({ inventory, stats });
  } catch (err) {
    console.error('Inventory fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Adjust stock manually
router.post('/adjust', requirePermission('inventory.edit'), (req, res) => {
  try {
    const { product_id, change_amount, reason } = req.body;

    if (!product_id || change_amount === undefined || !reason) {
      return res.status(400).json({ error: 'Product ID, adjustment amount, and reason are required' });
    }

    const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const previousStock = product.stock_quantity;
    const newStock = Math.max(0, previousStock + Number(change_amount));

    db.prepare('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newStock, product_id);

    db.prepare(`
      INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(product_id, Number(change_amount), previousStock, newStock, reason.trim());

    res.json({
      message: `Stock updated. Previous: ${previousStock}, New: ${newStock}`,
      newStock
    });
  } catch (err) {
    console.error('Stock adjustment error:', err);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

// Inventory Audit Logs
router.get('/logs/:productId', requirePermission('inventory.view'), (req, res) => {
  try {
    const { productId } = req.params;
    const logs = db.prepare(`
      SELECT * FROM inventory_logs 
      WHERE product_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all(productId);

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory logs' });
  }
});

module.exports = router;
