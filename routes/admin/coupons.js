const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { requirePermission } = require('../../middleware/auth');

// List coupons
router.get('/', requirePermission('coupons.manage'), (req, res) => {
  try {
    const coupons = db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
    res.json({ coupons });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Create coupon
router.post('/', requirePermission('coupons.manage'), (req, res) => {
  try {
    const { code, type = 'percentage', value, min_order = 0, max_discount, usage_limit = 100, customer_usage_limit = 1, start_date, expiry_date, is_active = 1 } = req.body;

    if (!code || value === undefined) {
      return res.status(400).json({ error: 'Code and discount value are required' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = db.prepare('SELECT id FROM coupons WHERE code = ?').get(cleanCode);
    if (existing) {
      return res.status(400).json({ error: `Coupon code '${cleanCode}' already exists` });
    }

    const result = db.prepare(`
      INSERT INTO coupons (code, type, value, min_order, max_discount, usage_limit, used_count, customer_usage_limit, start_date, expiry_date, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `).run(
      cleanCode, type, Number(value), Number(min_order),
      max_discount ? Number(max_discount) : null,
      Number(usage_limit), Number(customer_usage_limit),
      start_date || null, expiry_date || null, is_active ? 1 : 0
    );

    res.status(201).json({ id: result.lastInsertRowid, message: 'Coupon created successfully' });
  } catch (err) {
    console.error('Create coupon error:', err);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// Update coupon
router.put('/:id', requirePermission('coupons.manage'), (req, res) => {
  try {
    const { id } = req.params;
    const { code, type, value, min_order, max_discount, usage_limit, start_date, expiry_date, is_active } = req.body;

    db.prepare(`
      UPDATE coupons SET
        code = COALESCE(?, code),
        type = COALESCE(?, type),
        value = COALESCE(?, value),
        min_order = COALESCE(?, min_order),
        max_discount = ?,
        usage_limit = COALESCE(?, usage_limit),
        start_date = ?,
        expiry_date = ?,
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      code ? code.trim().toUpperCase() : null,
      type,
      value !== undefined ? Number(value) : null,
      min_order !== undefined ? Number(min_order) : null,
      max_discount !== undefined ? (max_discount ? Number(max_discount) : null) : null,
      usage_limit !== undefined ? Number(usage_limit) : null,
      start_date || null,
      expiry_date || null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id
    );

    res.json({ message: 'Coupon updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// Delete coupon
router.delete('/:id', requirePermission('coupons.manage'), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM coupons WHERE id = ?').run(id);
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

module.exports = router;
