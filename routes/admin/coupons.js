const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { requirePermission } = require('../../middleware/auth');
const { supabase } = require('../../db/supabase');

// Helper to sync coupon changes to Supabase Cloud asynchronously
function syncCouponToSupabase(action, id, data = {}) {
  if (!supabase) return;
  try {
    if (action === 'insert' || action === 'upsert') {
      supabase.from('coupons').upsert({
        ...data,
        updated_at: new Date().toISOString()
      }).catch(err => console.warn('Supabase coupon upsert warning:', err.message));
    } else if (action === 'update') {
      supabase.from('coupons').update(data).eq('id', id)
        .catch(err => console.warn('Supabase coupon update warning:', err.message));
    } else if (action === 'delete') {
      supabase.from('coupons').delete().eq('id', id)
        .catch(err => console.warn('Supabase coupon delete warning:', err.message));
    }
  } catch (e) {
    console.warn('Supabase coupon sync exception:', e.message);
  }
}

// List coupons
router.get('/', requirePermission('coupons.manage'), (req, res) => {
  try {
    const coupons = db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
    res.json({ coupons });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Single coupon
router.get('/:id', requirePermission('coupons.manage'), (req, res) => {
  try {
    const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ coupon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupon' });
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

    const activeFlag = (is_active === 1 || is_active === true || is_active === '1') ? 1 : 0;
    const result = db.prepare(`
      INSERT INTO coupons (code, type, value, min_order, max_discount, usage_limit, used_count, customer_usage_limit, start_date, expiry_date, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `).run(
      cleanCode, type, Number(value), Number(min_order),
      max_discount ? Number(max_discount) : null,
      Number(usage_limit), Number(customer_usage_limit),
      start_date || null, expiry_date || null, activeFlag
    );

    const newId = Number(result.lastInsertRowid);
    const createdCoupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(newId);

    syncCouponToSupabase('insert', newId, {
      code: cleanCode,
      type,
      value: Number(value),
      min_order: Number(min_order),
      max_discount: max_discount ? Number(max_discount) : null,
      usage_limit: Number(usage_limit),
      used_count: 0,
      customer_usage_limit: Number(customer_usage_limit),
      start_date: start_date || null,
      expiry_date: expiry_date || null,
      is_active: activeFlag
    });

    res.status(201).json({ id: newId, coupon: createdCoupon, message: 'Coupon created successfully' });
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

    const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const cleanCode = code ? code.trim().toUpperCase() : existing.code;
    const activeFlag = is_active !== undefined ? ((is_active === 1 || is_active === true || is_active === '1') ? 1 : 0) : existing.is_active;

    db.prepare(`
      UPDATE coupons SET
        code = ?,
        type = COALESCE(?, type),
        value = COALESCE(?, value),
        min_order = COALESCE(?, min_order),
        max_discount = ?,
        usage_limit = COALESCE(?, usage_limit),
        start_date = ?,
        expiry_date = ?,
        is_active = ?
      WHERE id = ?
    `).run(
      cleanCode,
      type || existing.type,
      value !== undefined ? Number(value) : existing.value,
      min_order !== undefined ? Number(min_order) : existing.min_order,
      max_discount !== undefined ? (max_discount ? Number(max_discount) : null) : existing.max_discount,
      usage_limit !== undefined ? Number(usage_limit) : existing.usage_limit,
      start_date !== undefined ? (start_date || null) : existing.start_date,
      expiry_date !== undefined ? (expiry_date || null) : existing.expiry_date,
      activeFlag,
      id
    );

    const updated = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);

    syncCouponToSupabase('update', id, {
      code: cleanCode,
      type: type || existing.type,
      value: value !== undefined ? Number(value) : existing.value,
      min_order: min_order !== undefined ? Number(min_order) : existing.min_order,
      max_discount: max_discount !== undefined ? (max_discount ? Number(max_discount) : null) : existing.max_discount,
      usage_limit: usage_limit !== undefined ? Number(usage_limit) : existing.usage_limit,
      is_active: activeFlag
    });

    res.json({ message: 'Coupon updated successfully', coupon: updated });
  } catch (err) {
    console.error('Update coupon error:', err);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// Toggle coupon status (Enable / Disable)
router.patch('/:id/toggle', requirePermission('coupons.manage'), (req, res) => {
  try {
    const { id } = req.params;
    const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const newStatus = (req.body.is_active !== undefined)
      ? ((req.body.is_active === 1 || req.body.is_active === true || req.body.is_active === '1') ? 1 : 0)
      : (coupon.is_active ? 0 : 1);

    db.prepare('UPDATE coupons SET is_active = ? WHERE id = ?').run(newStatus, id);
    syncCouponToSupabase('update', id, { is_active: newStatus });

    res.json({
      success: true,
      is_active: newStatus,
      message: `Coupon '${coupon.code}' ${newStatus ? 'activated' : 'disabled'} successfully`
    });
  } catch (err) {
    console.error('Toggle coupon error:', err);
    res.status(500).json({ error: 'Failed to toggle coupon status' });
  }
});

// Delete coupon
router.delete('/:id', requirePermission('coupons.manage'), (req, res) => {
  try {
    const { id } = req.params;
    const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
    db.prepare('DELETE FROM coupon_usages WHERE coupon_id = ?').run(id);
    db.prepare('DELETE FROM coupons WHERE id = ?').run(id);
    syncCouponToSupabase('delete', id);
    res.json({ success: true, message: `Coupon '${coupon ? coupon.code : id}' deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

module.exports = router;
