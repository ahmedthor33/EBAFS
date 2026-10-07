const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Public endpoint for active payment methods
router.get('/payment-methods', (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM store_settings WHERE key = 'payments'").get();
    if (!row) {
      return res.json({ methods: [] });
    }
    const payments = JSON.parse(row.value);
    const active = [];

    if (payments.cod?.enabled) {
      active.push({
        id: 'cod',
        name: payments.cod.title || 'Cash on Delivery (COD)',
        description: payments.cod.description || 'Pay with cash upon delivery',
        handling_fee: payments.cod.handling_fee || 0
      });
    }

    if (payments.bank_transfer?.enabled) {
      active.push({
        id: 'bank_transfer',
        name: payments.bank_transfer.title || 'Direct Bank Transfer / IBAN',
        bank_name: payments.bank_transfer.bank_name,
        account_title: payments.bank_transfer.account_title,
        account_number: payments.bank_transfer.account_number,
        iban: payments.bank_transfer.iban,
        branch: payments.bank_transfer.branch,
        instructions: payments.bank_transfer.instructions
      });
    }

    if (payments.jazzcash?.enabled) {
      active.push({
        id: 'jazzcash',
        name: payments.jazzcash.title || 'JazzCash Mobile Account',
        merchant_id: payments.jazzcash.merchant_id,
        merchant_name: payments.jazzcash.merchant_name,
        account_number: payments.jazzcash.account_number,
        instructions: payments.jazzcash.instructions
      });
    }

    if (payments.easypaisa?.enabled) {
      active.push({
        id: 'easypaisa',
        name: payments.easypaisa.title || 'Easypaisa Mobile Account',
        till_id: payments.easypaisa.till_id,
        account_title: payments.easypaisa.account_title,
        account_number: payments.easypaisa.account_number,
        instructions: payments.easypaisa.instructions
      });
    }

    res.json({ methods: active });
  } catch (err) {
    console.error('Fetch payment methods error:', err);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Public endpoint for active shipping zones
router.get('/shipping-zones', (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM store_settings WHERE key = 'shipping_zones'").get();
    if (!row) {
      return res.json({ zones: [] });
    }
    const zones = JSON.parse(row.value);
    res.json({ zones: zones.filter(z => z.is_active !== false) });
  } catch (err) {
    console.error('Fetch shipping zones error:', err);
    res.status(500).json({ error: 'Failed to fetch shipping zones' });
  }
});

// Public endpoint for Meta Pixel configuration
router.get('/pixel', (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM store_settings WHERE key = 'meta_pixel'").get();
    if (!row) {
      return res.json({
        pixel: {
          enabled: false,
          pixel_id: '',
          test_event_code: '',
          track_pageview: true,
          track_view_content: true,
          track_add_to_cart: true,
          track_initiate_checkout: true,
          track_purchase: true,
          track_search: true,
          currency: 'PKR'
        }
      });
    }
    const pixel = JSON.parse(row.value);
    res.json({ pixel });
  } catch (err) {
    console.error('Fetch Meta Pixel config error:', err);
    res.status(500).json({ error: 'Failed to fetch Meta Pixel settings' });
  }
});
router.get('/meta-pixel', (req, res) => {
  const row = db.prepare("SELECT value FROM store_settings WHERE key = 'meta_pixel'").get();
  const pixel = row ? JSON.parse(row.value) : { enabled: false };
  res.json({ pixel });
});

module.exports = router;

