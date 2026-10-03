const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { requirePermission } = require('../../middleware/auth');

function slugify(text) {
  return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
}

// Get All Categories (admin list)
router.get('/', requirePermission('categories.manage'), (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, p.name as parent_name,
        (SELECT COUNT(*) FROM products WHERE category_id = c.id OR subcategory_id = c.id) as product_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      ORDER BY c.parent_id ASC, c.sort_order ASC, c.name ASC
    `).all();

    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create Category
router.post('/', requirePermission('categories.manage'), (req, res) => {
  try {
    const { name, parent_id, description, image_url, sort_order = 0, is_active = 1 } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    let slug = slugify(name);
    const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const result = db.prepare(`
      INSERT INTO categories (parent_id, name, slug, description, image_url, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(parent_id || null, name.trim(), slug, description || '', image_url || null, Number(sort_order), is_active ? 1 : 0);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Category created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update Category
router.put('/:id', requirePermission('categories.manage'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id, description, image_url, sort_order, is_active } = req.body;

    db.prepare(`
      UPDATE categories SET
        name = COALESCE(?, name),
        parent_id = ?,
        description = COALESCE(?, description),
        image_url = COALESCE(?, image_url),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      name ? name.trim() : null,
      parent_id !== undefined ? (parent_id || null) : null,
      description,
      image_url,
      sort_order !== undefined ? Number(sort_order) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id
    );

    res.json({ message: 'Category updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete Category
router.delete('/:id', requirePermission('categories.manage'), (req, res) => {
  try {
    const { id } = req.params;
    // Check if contains products
    const inUse = db.prepare('SELECT count(*) as count FROM products WHERE category_id = ? OR subcategory_id = ?').get(id, id);
    if (inUse && inUse.count > 0) {
      return res.status(400).json({ error: `Cannot delete: ${inUse.count} products are currently assigned to this category` });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Brands List (admin)
router.get('/brands/all', requirePermission('brands.manage'), (req, res) => {
  try {
    const brands = db.prepare(`
      SELECT b.*,
        (SELECT COUNT(*) FROM products WHERE brand_id = b.id) as product_count
      FROM brands b
      ORDER BY b.name ASC
    `).all();
    res.json({ brands });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// Create Brand
router.post('/brands', requirePermission('brands.manage'), (req, res) => {
  try {
    const { name, description, logo_url, is_active = 1 } = req.body;
    if (!name) return res.status(400).json({ error: 'Brand name is required' });

    let slug = slugify(name);
    const existing = db.prepare('SELECT id FROM brands WHERE slug = ?').get(slug);
    if (existing) slug = `${slug}-${Date.now().toString().slice(-4)}`;

    const result = db.prepare(`
      INSERT INTO brands (name, slug, description, logo_url, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run(name.trim(), slug, description || '', logo_url || null, is_active ? 1 : 0);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Brand created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// Update Brand
router.put('/brands/:id', requirePermission('brands.manage'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, logo_url, is_active } = req.body;
    db.prepare(`
      UPDATE brands SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        logo_url = COALESCE(?, logo_url),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(name ? name.trim() : null, description, logo_url, is_active !== undefined ? (is_active ? 1 : 0) : null, id);

    res.json({ message: 'Brand updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

// Delete Brand
router.delete('/brands/:id', requirePermission('brands.manage'), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM brands WHERE id = ?').run(id);
    res.json({ message: 'Brand removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete brand' });
  }
});

module.exports = router;
