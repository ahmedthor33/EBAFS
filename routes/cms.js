const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  try {
    const cmsRows = db.prepare('SELECT key, value FROM cms_content').all();
    const cms = {};
    for (const row of cmsRows) {
      try {
        cms[row.key] = JSON.parse(row.value);
      } catch (e) {
        cms[row.key] = row.value;
      }
    }

    const settingsRows = db.prepare('SELECT key, value FROM store_settings').all();
    const settings = {};
    for (const row of settingsRows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch (e) {
        settings[row.key] = row.value;
      }
    }

    res.json({
      cms,
      settings
    });
  } catch (err) {
    console.error('CMS fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve CMS content' });
  }
});

module.exports = router;
