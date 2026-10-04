const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { supabase } = require('../../db/supabase');
const { requirePermission } = require('../../middleware/auth');

// Helper to sync settings to Supabase Cloud asynchronously
function syncToSupabase(key, valueStr) {
  if (supabase) {
    supabase.from('store_settings').upsert({
      key,
      value: valueStr,
      updated_at: new Date().toISOString()
    }).then(({ error }) => {
      if (error) console.warn(`Supabase sync warning for store_settings '${key}':`, error.message);
    }).catch(err => {
      console.warn(`Supabase sync error for store_settings '${key}':`, err.message);
    });
  }
}

// Get all settings
router.get('/', requirePermission('settings.manage'), (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value, updated_at FROM store_settings').all();
    const settings = {};
    for (const r of rows) {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch (e) {
        settings[r.key] = r.value;
      }
    }
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Dedicated Payment Gateways endpoint
router.get('/payments', requirePermission('settings.manage'), (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM store_settings WHERE key = 'payments'").get();
    const payments = row ? JSON.parse(row.value) : {};
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment settings' });
  }
});

const savePaymentsHandler = (req, res) => {
  try {
    const value = req.body.payments !== undefined ? req.body.payments : req.body;
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    db.prepare(`
      INSERT INTO store_settings (key, value, updated_at)
      VALUES ('payments', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).run(valueStr);

    syncToSupabase('payments', valueStr);

    res.json({ message: 'Payment gateway configurations saved successfully', payments: value });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save payment settings' });
  }
};
router.put('/payments', requirePermission('settings.manage'), savePaymentsHandler);
router.post('/payments', requirePermission('settings.manage'), savePaymentsHandler);

// Dedicated Shipping Zones endpoint
router.get('/shipping-zones', requirePermission('settings.manage'), (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM store_settings WHERE key = 'shipping_zones'").get();
    const zones = row ? JSON.parse(row.value) : [];
    res.json({ zones });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shipping zones' });
  }
});

const saveShippingZonesHandler = (req, res) => {
  try {
    const value = req.body.zones !== undefined ? req.body.zones : req.body;
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    db.prepare(`
      INSERT INTO store_settings (key, value, updated_at)
      VALUES ('shipping_zones', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).run(valueStr);

    syncToSupabase('shipping_zones', valueStr);

    res.json({ message: 'Shipping zones saved successfully', zones: value });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save shipping zones' });
  }
};
router.put('/shipping-zones', requirePermission('settings.manage'), saveShippingZonesHandler);
router.post('/shipping-zones', requirePermission('settings.manage'), saveShippingZonesHandler);

// Update specific setting key
router.put('/:key', requirePermission('settings.manage'), (req, res) => {
  try {
    const { key } = req.params;
    const value = req.body;
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

    db.prepare(`
      INSERT INTO store_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).run(key, valueStr);

    syncToSupabase(key, valueStr);

    res.json({ message: `Store configuration '${key}' saved successfully` });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update store settings' });
  }
});

module.exports = router;
