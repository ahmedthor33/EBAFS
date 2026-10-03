const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://ydycwzcfptlbfvzbyzlb.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeWN3emNmcHRsYmZ2emJ5emxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMzU5MTUsImV4cCI6MjEwNjYxMTkxNX0.ut6c3mQb629R744VWAEFBTYzCXShFoFyPpmta8_8rWA';
const projectId = process.env.SUPABASE_PROJECT_ID || 'ydycwzcfptlbfvzbyzlb';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

/**
 * Check connection status to Supabase instance
 */
async function checkSupabaseHealth() {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseAnonKey }
    });
    if (res.ok) {
      const data = await res.json();
      return {
        connected: true,
        projectId,
        supabaseUrl,
        authService: data.name || 'GoTrue',
        version: data.version
      };
    }
    return {
      connected: false,
      projectId,
      supabaseUrl,
      error: `Supabase returned HTTP ${res.status}`
    };
  } catch (err) {
    return {
      connected: false,
      projectId,
      supabaseUrl,
      error: err.message
    };
  }
}

module.exports = {
  supabase,
  supabaseUrl,
  supabaseAnonKey,
  projectId,
  checkSupabaseHealth
};
