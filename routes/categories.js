const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Hierarchical Categories
router.get('/', (req, res) => {
  try {
    const parentCategories = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM products WHERE category_id = c.id AND status = 'published') as product_count
      FROM categories c
      WHERE c.parent_id IS NULL AND c.is_active = 1
      ORDER BY c.sort_order ASC
    `).all();

    const subcategories = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM products WHERE subcategory_id = c.id AND status = 'published') as product_count
      FROM categories c
      WHERE c.parent_id IS NOT NULL AND c.is_active = 1
      ORDER BY c.sort_order ASC
    `).all();

    const tree = parentCategories.map(parent => ({
      ...parent,
      subcategories: subcategories.filter(sub => sub.parent_id === parent.id)
    }));

    res.json({ categories: tree });
  } catch (err) {
    console.error('Categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Brands
router.get('/brands', (req, res) => {
  try {
    const brands = db.prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM products WHERE brand_id = b.id AND status = 'published') as product_count
      FROM brands b
      WHERE b.is_active = 1
      ORDER BY b.name ASC
    `).all();

    res.json({ brands });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

module.exports = router;
