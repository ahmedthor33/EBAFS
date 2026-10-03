const express = require('express');
const router = express.Router();
const { supabase, projectId, supabaseUrl, checkSupabaseHealth } = require('../db/supabase');

/**
 * GET /api/supabase/status
 * Returns connection and schema health with the connected Supabase instance
 */
router.get('/status', async (req, res) => {
  try {
    const health = await checkSupabaseHealth();
    
    // Check if tables are migrated
    let tablesReady = false;
    let tableError = null;

    try {
      const { data, error } = await supabase.from('products').select('id').limit(1);
      if (!error) {
        tablesReady = true;
      } else {
        tableError = error.message;
      }
    } catch (e) {
      tableError = e.message;
    }

    res.json({
      success: true,
      projectId,
      supabaseUrl,
      connected: health.connected,
      version: health.version,
      authService: health.authService,
      tablesReady,
      tableError,
      setupSqlFile: '/supabase/setup.sql',
      dashboardUrl: `https://supabase.com/dashboard/project/${projectId}`,
      sqlEditorUrl: `https://supabase.com/dashboard/project/${projectId}/sql/new`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
