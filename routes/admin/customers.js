const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { requirePermission } = require('../../middleware/auth');

// List customers
router.get('/', requirePermission('customers.view'), (req, res) => {
  try {
    const { q, status } = req.query;

    let query = `
      SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
        COALESCE(p.total_spent, 0) as total_spent,
        COALESCE(p.orders_count, 0) as orders_count,
        (SELECT city FROM addresses WHERE user_id = u.id AND is_default = 1 LIMIT 1) as city
      FROM users u
      LEFT JOIN customer_profiles p ON u.id = p.user_id
      WHERE u.role = 'customer'
    `;
    const params = [];

    if (q && q.trim()) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }

    if (status) {
      query += ` AND u.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY u.id DESC`;

    const customers = db.prepare(query).all(...params);
    res.json({ customers });
  } catch (err) {
    console.error('Customers fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Customer details & orders
router.get('/:id', requirePermission('customers.view'), (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT id, name, email, phone, status, created_at FROM users WHERE id = ? AND role = "customer"').get(id);

    if (!user) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const profile = db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(id);
    const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ?').all(id);
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(id);

    res.json({
      customer: user,
      profile,
      addresses,
      orders
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer profile' });
  }
});

// Toggle customer status (active/suspended)
router.patch('/:id/status', requirePermission('customers.edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Status must be active or suspended' });
    }

    db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = "customer"').run(status, id);
    res.json({ message: `Customer account is now ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer status' });
  }
});

module.exports = router;
