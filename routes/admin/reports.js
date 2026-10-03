const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { requirePermission } = require('../../middleware/auth');

router.get('/', requirePermission('reports.view'), (req, res) => {
  try {
    const { range = '30d' } = req.query;

    let dateFilter = "AND created_at >= datetime('now', '-30 days')";
    if (range === 'today') {
      dateFilter = "AND date(created_at) = date('now')";
    } else if (range === 'yesterday') {
      dateFilter = "AND date(created_at) = date('now', '-1 day')";
    } else if (range === '7d') {
      dateFilter = "AND created_at >= datetime('now', '-7 days')";
    } else if (range === 'month') {
      dateFilter = "AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";
    } else if (range === 'all') {
      dateFilter = "";
    }

    // Revenue, Orders, AOV
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) as total_orders,
        COALESCE(AVG(total), 0) as aov,
        COALESCE(SUM(discount), 0) as total_discounts
      FROM orders
      WHERE order_status != 'cancelled' ${dateFilter}
    `).get();

    // Total products sold
    const unitsSold = db.prepare(`
      SELECT COALESCE(SUM(oi.quantity), 0) as total_units
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.order_status != 'cancelled' ${dateFilter.replace(/created_at/g, 'o.created_at')}
    `).get();

    // Top selling products
    const topProducts = db.prepare(`
      SELECT 
        oi.product_name,
        oi.sku,
        SUM(oi.quantity) as units_sold,
        SUM(oi.total_price) as gross_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.order_status != 'cancelled' ${dateFilter.replace(/created_at/g, 'o.created_at')}
      GROUP BY oi.product_name, oi.sku
      ORDER BY units_sold DESC
      LIMIT 5
    `).all();

    // Payment methods breakdown
    const paymentMethods = db.prepare(`
      SELECT 
        payment_method,
        COUNT(*) as order_count,
        SUM(total) as revenue
      FROM orders
      WHERE order_status != 'cancelled' ${dateFilter}
      GROUP BY payment_method
    `).all();

    // Order status breakdown
    const orderStatuses = db.prepare(`
      SELECT 
        order_status,
        COUNT(*) as count
      FROM orders
      WHERE 1=1 ${dateFilter}
      GROUP BY order_status
    `).all();

    // Inventory health snapshot
    const inventorySnapshot = db.prepare(`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock_quantity) as total_units,
        SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_count,
        SUM(stock_quantity * price) as inventory_retail_value,
        SUM(stock_quantity * COALESCE(cost_price, price * 0.6)) as inventory_cost_value
      FROM products WHERE status = 'published'
    `).get();

    // Total registered customers
    const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get().count;

    res.json({
      summary: {
        total_revenue: Math.round(summary.total_revenue),
        total_orders: summary.total_orders,
        aov: Math.round(summary.aov),
        total_units_sold: unitsSold.total_units,
        total_discounts: Math.round(summary.total_discounts),
        total_customers: totalCustomers
      },
      topProducts,
      paymentMethods,
      orderStatuses,
      inventorySnapshot: {
        ...inventorySnapshot,
        inventory_retail_value: Math.round(inventorySnapshot.inventory_retail_value || 0),
        inventory_cost_value: Math.round(inventorySnapshot.inventory_cost_value || 0)
      }
    });
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

module.exports = router;
