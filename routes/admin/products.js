const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { requirePermission } = require('../../middleware/auth');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// List all products for admin
router.get('/', requirePermission('products.view'), (req, res) => {
  try {
    const { q, category_id, status, is_featured, is_sale, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT p.*, c.name as category_name, sub.name as subcategory_name, b.name as brand_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories sub ON p.subcategory_id = sub.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (q && q.trim()) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.fabric LIKE ?)`;
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }

    if (category_id) {
      query += ` AND (p.category_id = ? OR p.subcategory_id = ?)`;
      params.push(Number(category_id), Number(category_id));
    }

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (is_featured !== undefined && is_featured !== '') {
      query += ` AND p.is_featured = ?`;
      params.push(Number(is_featured));
    }

    if (is_sale !== undefined && is_sale !== '') {
      query += ` AND p.is_sale = ?`;
      params.push(Number(is_sale));
    }

    query += ` ORDER BY p.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const products = db.prepare(query).all(...params);
    const totalCount = db.prepare('SELECT count(*) as count FROM products').get().count;

    res.json({ products, total: totalCount });
  } catch (err) {
    console.error('Admin products fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Single product
router.get('/:id', requirePermission('products.view'), (req, res) => {
  try {
    const { id } = req.params;
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, sub.name as subcategory_name, b.name as brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories sub ON p.subcategory_id = sub.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = ?
    `).get(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const images = db.prepare(`
      SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC
    `).all(product.id);

    res.json({ product, images });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product
router.post('/', requirePermission('products.create'), (req, res) => {
  try {
    const {
      name, sku, brand_id, category_id, subcategory_id,
      description, short_description, price, sale_price, cost_price,
      stock_quantity = 0, low_stock_threshold = 5,
      fabric, season, color, color_hex, product_type = '3-Piece Unstitched',
      is_featured = 0, is_sale = 0, status = 'published',
      images = []
    } = req.body;

    if (!name || !sku || !price) {
      return res.status(400).json({ error: 'Name, SKU, and Price are required' });
    }

    // Check SKU
    const existingSku = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku.trim());
    if (existingSku) {
      return res.status(400).json({ error: `SKU '${sku}' already exists` });
    }

    let slug = slugify(name);
    const existingSlug = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const stmt = db.prepare(`
      INSERT INTO products (
        name, slug, sku, brand_id, category_id, subcategory_id,
        description, short_description, price, sale_price, cost_price,
        stock_quantity, low_stock_threshold, fabric, season, color, color_hex,
        product_type, is_featured, is_sale, status
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    const result = stmt.run(
      name.trim(), slug, sku.trim(),
      brand_id || null, category_id || null, subcategory_id || null,
      description || '', short_description || '',
      Number(price), sale_price ? Number(sale_price) : null, cost_price ? Number(cost_price) : null,
      Number(stock_quantity), Number(low_stock_threshold),
      fabric || '', season || '', color || '', color_hex || '#c5a880',
      product_type, is_featured ? 1 : 0, is_sale ? 1 : 0, status
    );

    const newProductId = Number(result.lastInsertRowid);

    // Save images
    if (Array.isArray(images) && images.length > 0) {
      const insertImg = db.prepare(`
        INSERT INTO product_images (product_id, image_url, image_type, sort_order, is_primary)
        VALUES (?, ?, ?, ?, ?)
      `);
      images.forEach((img, idx) => {
        insertImg.run(newProductId, img.image_url, img.image_type || 'gallery', idx, img.is_primary ? 1 : (idx === 0 ? 1 : 0));
      });
    }

    // Inventory log
    db.prepare(`
      INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason)
      VALUES (?, ?, 0, ?, 'Product created')
    `).run(newProductId, Number(stock_quantity), Number(stock_quantity));

    res.status(201).json({ id: newProductId, message: 'Product created successfully' });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', requirePermission('products.edit'), (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, sku, brand_id, category_id, subcategory_id,
      description, short_description, price, sale_price, cost_price,
      stock_quantity, low_stock_threshold,
      fabric, season, color, color_hex, product_type,
      is_featured, is_sale, status, images
    } = req.body;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check SKU conflict
    if (sku && sku.trim() !== existing.sku) {
      const conflict = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku.trim(), id);
      if (conflict) {
        return res.status(400).json({ error: 'SKU is already in use by another product' });
      }
    }

    db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        sku = COALESCE(?, sku),
        brand_id = ?,
        category_id = ?,
        subcategory_id = ?,
        description = COALESCE(?, description),
        short_description = COALESCE(?, short_description),
        price = COALESCE(?, price),
        sale_price = ?,
        cost_price = ?,
        stock_quantity = COALESCE(?, stock_quantity),
        low_stock_threshold = COALESCE(?, low_stock_threshold),
        fabric = COALESCE(?, fabric),
        season = COALESCE(?, season),
        color = COALESCE(?, color),
        color_hex = COALESCE(?, color_hex),
        product_type = COALESCE(?, product_type),
        is_featured = COALESCE(?, is_featured),
        is_sale = COALESCE(?, is_sale),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name ? name.trim() : null,
      sku ? sku.trim() : null,
      brand_id || null, category_id || null, subcategory_id || null,
      description, short_description,
      price !== undefined ? Number(price) : null,
      sale_price !== undefined ? (sale_price ? Number(sale_price) : null) : existing.sale_price,
      cost_price !== undefined ? (cost_price ? Number(cost_price) : null) : existing.cost_price,
      stock_quantity !== undefined ? Number(stock_quantity) : null,
      low_stock_threshold !== undefined ? Number(low_stock_threshold) : null,
      fabric, season, color, color_hex, product_type,
      is_featured !== undefined ? (is_featured ? 1 : 0) : null,
      is_sale !== undefined ? (is_sale ? 1 : 0) : null,
      status, id
    );

    // If images array provided, refresh images
    if (Array.isArray(images)) {
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(id);
      const insertImg = db.prepare(`
        INSERT INTO product_images (product_id, image_url, image_type, sort_order, is_primary)
        VALUES (?, ?, ?, ?, ?)
      `);
      images.forEach((img, idx) => {
        insertImg.run(id, img.image_url, img.image_type || 'gallery', idx, img.is_primary ? 1 : (idx === 0 ? 1 : 0));
      });
    }

    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Duplicate product
router.post('/:id/duplicate', requirePermission('products.create'), (req, res) => {
  try {
    const { id } = req.params;
    const original = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!original) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const newSku = `${original.sku}-COPY-${Math.floor(100 + Math.random() * 900)}`;
    const newName = `${original.name} (Copy)`;
    const newSlug = slugify(newName) + '-' + Math.floor(100 + Math.random() * 900);

    const result = db.prepare(`
      INSERT INTO products (
        name, slug, sku, brand_id, category_id, subcategory_id,
        description, short_description, price, sale_price, cost_price,
        stock_quantity, low_stock_threshold, fabric, season, color, color_hex,
        product_type, is_featured, is_sale, status
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 'draft'
      )
    `).run(
      newName, newSlug, newSku, original.brand_id, original.category_id, original.subcategory_id,
      original.description, original.short_description, original.price, original.sale_price, original.cost_price,
      original.stock_quantity, original.low_stock_threshold, original.fabric, original.season, original.color, original.color_hex,
      original.product_type, 0, original.is_sale
    );

    const newId = Number(result.lastInsertRowid);

    // Duplicate images
    const images = db.prepare('SELECT * FROM product_images WHERE product_id = ?').all(id);
    const insertImg = db.prepare(`
      INSERT INTO product_images (product_id, image_url, image_type, sort_order, is_primary)
      VALUES (?, ?, ?, ?, ?)
    `);
    images.forEach(img => {
      insertImg.run(newId, img.image_url, img.image_type, img.sort_order, img.is_primary);
    });

    res.status(201).json({ id: newId, message: 'Product duplicated as draft' });
  } catch (err) {
    console.error('Duplicate product error:', err);
    res.status(500).json({ error: 'Failed to duplicate product' });
  }
});

// Toggle product status or flags
router.patch('/:id/toggle', requirePermission('products.edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { field, value } = req.body;

    if (!['status', 'is_featured', 'is_sale'].includes(field)) {
      return res.status(400).json({ error: 'Invalid field to toggle' });
    }

    db.prepare(`UPDATE products SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(value, id);
    res.json({ message: `${field} updated` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle product attribute' });
  }
});

// Delete product
router.delete('/:id', requirePermission('products.delete'), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product permanently removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
