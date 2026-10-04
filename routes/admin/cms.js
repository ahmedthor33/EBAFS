const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { requirePermission } = require('../../middleware/auth');

// Get all CMS blocks
router.get('/', requirePermission('homepage.manage'), (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value, updated_at FROM cms_content').all();
    const cms = {};
    for (const r of rows) {
      try {
        cms[r.key] = JSON.parse(r.value);
      } catch (e) {
        cms[r.key] = r.value;
      }
    }
    res.json({ cms });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch CMS content' });
  }
});

// Update single CMS block
router.put('/:key', requirePermission('homepage.manage'), (req, res) => {
  try {
    const { key } = req.params;
    const value = req.body;

    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

    db.prepare(`
      INSERT INTO cms_content (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).run(key, valueStr);

    // Sync to Supabase Cloud
    try {
      const { supabase } = require('../../db/supabase');
      supabase.from('cms_content').upsert({ key, value: valueStr }, { onConflict: 'key' }).then(() => {}).catch(e => console.warn('Supabase CMS sync note:', e.message));
    } catch(e) {}

    res.json({ message: `CMS section '${key}' updated successfully` });
  } catch (err) {
    console.error('Update CMS error:', err);
    res.status(500).json({ error: 'Failed to update CMS section' });
  }
});

module.exports = router;
