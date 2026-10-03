const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { requirePermission } = require('../../middleware/auth');

// List Orders
router.get('/', requirePermission('orders.view'), (req, res) => {
  try {
    const { status, payment_status, q, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT o.*,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ` AND o.order_status = ?`;
      params.push(status);
    }

    if (payment_status && payment_status !== 'all') {
      query += ` AND o.payment_status = ?`;
      params.push(payment_status);
    }

    if (q && q.trim()) {
      query += ` AND (o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.customer_email LIKE ? OR o.tracking_number LIKE ?)`;
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term, term);
    }

    query += ` ORDER BY o.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const orders = db.prepare(query).all(...params);
    const totalCount = db.prepare('SELECT count(*) as count FROM orders').get().count;

    res.json({ orders, total: totalCount });
  } catch (err) {
    console.error('Admin orders fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Single Order Detail
router.get('/:id', requirePermission('orders.view'), (req, res) => {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const customer = order.user_id ? db.prepare('SELECT id, name, email, phone FROM users WHERE id = ?').get(order.user_id) : null;

    res.json({ order, items, customer });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// Update Order Status / Payment Status
router.patch('/:id/status', requirePermission('orders.edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { order_status, payment_status } = req.body;

    const validOrderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'];
    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];

    if (order_status && !validOrderStatuses.includes(order_status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    if (payment_status && !validPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    db.prepare(`
      UPDATE orders SET
        order_status = COALESCE(?, order_status),
        payment_status = COALESCE(?, payment_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(order_status || null, payment_status || null, id);

    res.json({ message: 'Order status updated successfully' });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Update Tracking Number & Courier
router.patch('/:id/tracking', requirePermission('orders.edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { tracking_number, courier_name } = req.body;

    if (!tracking_number) {
      return res.status(400).json({ error: 'Tracking number is required' });
    }

    db.prepare(`
      UPDATE orders SET
        tracking_number = ?,
        courier_name = COALESCE(?, courier_name),
        order_status = CASE WHEN order_status = 'pending' OR order_status = 'confirmed' THEN 'shipped' ELSE order_status END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(tracking_number.trim(), courier_name ? courier_name.trim() : null, id);

    res.json({ message: 'Courier tracking information assigned' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tracking information' });
  }
});

module.exports = router;
