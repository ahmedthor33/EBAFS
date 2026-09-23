import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, saveSupabaseConfig, clearSupabaseConfig, supabaseUrl } from '../../lib/supabase';
import { Database, ShieldCheck, CheckCircle2, AlertCircle, Key, RefreshCw, X, ExternalLink } from 'lucide-react';
import './SupabaseAssistant.css';

interface SupabaseAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseAssistant: React.FC<SupabaseAssistantProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [tableStatus, setTableStatus] = useState<{
    profiles: boolean;
    products: boolean;
    brands: boolean;
    orders: boolean;
  }>({ profiles: false, products: false, brands: false, orders: false });

  const isConfigured = isSupabaseConfigured();

  const testConnection = async () => {
    setTestStatus('testing');
    setErrorMessage('');

    if (!isConfigured) {
      setTestStatus('error');
      setErrorMessage('Please provide valid Supabase Project URL and Anon Key.');
      return;
    }

    try {
      // Test basic connection by querying site_settings or products
      const { data: prodData, error: prodErr } = await supabase.from('products').select('id').limit(1);
      const { data: profData, error: profErr } = await supabase.from('profiles').select('id').limit(1);
      const { data: brandData, error: brandErr } = await supabase.from('brands').select('id').limit(1);
      const { data: orderData, error: orderErr } = await supabase.from('orders').select('id').limit(1);

      setTableStatus({
        products: !prodErr && Boolean(prodData),
        profiles: !profErr && Boolean(profData),
        brands: !brandErr && Boolean(brandData),
        orders: !orderErr && Boolean(orderData),
      });

      if (prodErr && prodErr.code === '42P01') {
        setTestStatus('connected');
        setErrorMessage('Connected to Supabase, but schema tables are not created yet. Please execute the SQL migrations in supabase/migrations/ in your Supabase SQL Editor.');
      } else if (prodErr) {
        setTestStatus('error');
        setErrorMessage(prodErr.message || 'Connection test returned an error.');
      } else {
        setTestStatus('connected');
      }
    } catch (err: any) {
      setTestStatus('error');
      setErrorMessage(err.message || 'Failed to connect to Supabase.');
    }
  };

  useEffect(() => {
    if (isOpen && isConfigured) {
      testConnection();
    }
  }, [isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith('https://')) {
      setErrorMessage('Supabase URL must start with https://');
      return;
    }
    saveSupabaseConfig(url, anonKey);
  };

  if (!isOpen) return null;

  return (
    <div className="assistant-modal-backdrop">
      <div className="assistant-modal">
        <div className="assistant-header">
          <div className="assistant-title-group">
            <Database className="assistant-icon" />
            <div>
              <h3>Supabase Backend Architecture</h3>
              <p className="assistant-subtitle">Database, Row Level Security, Auth & Storage</p>
            </div>
          </div>
          <button className="assistant-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="assistant-body">
          {isConfigured ? (
            <div className="configured-card">
              <div className="status-badge-row">
                <span className={`status-pill ${testStatus}`}>
                  {testStatus === 'connected' && <CheckCircle2 size={15} />}
                  {testStatus === 'testing' && <RefreshCw size={15} className="spin" />}
                  {testStatus === 'error' && <AlertCircle size={15} />}
                  {testStatus === 'connected' ? 'Connected to Supabase' : testStatus === 'testing' ? 'Verifying...' : 'Attention Required'}
                </span>
                <button className="btn-refresh" onClick={testConnection}>
                  <RefreshCw size={13} /> Re-test
                </button>
              </div>

              <div className="config-info-row">
                <span className="info-label">Active Project URL:</span>
                <code className="info-code">{supabaseUrl}</code>
              </div>

              {errorMessage && (
                <div className="assistant-alert error">
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="tables-checklist">
                <h4>Database Tables Status:</h4>
                <div className="checklist-grid">
                  <div className={`check-item ${tableStatus.products ? 'ready' : 'pending'}`}>
                    <span className="dot" />
                    <span>products</span>
                  </div>
                  <div className={`check-item ${tableStatus.profiles ? 'ready' : 'pending'}`}>
                    <span className="dot" />
                    <span>profiles</span>
                  </div>
                  <div className={`check-item ${tableStatus.brands ? 'ready' : 'pending'}`}>
                    <span className="dot" />
                    <span>brands</span>
                  </div>
                  <div className={`check-item ${tableStatus.orders ? 'ready' : 'pending'}`}>
                    <span className="dot" />
                    <span>orders</span>
                  </div>
                </div>
              </div>

              <div className="migration-helper">
                <h4>SQL Migrations Ready:</h4>
                <p>Execute the following scripts in your Supabase SQL Editor:</p>
                <ol className="migration-list">
                  <li><code>supabase/migrations/20260923000000_schema.sql</code> (17 Tables & Indexes)</li>
                  <li><code>supabase/migrations/20260923000001_rls.sql</code> (Security & RLS Policies)</li>
                  <li><code>supabase/migrations/20260923000002_seed.sql</code> (Luxury Pakistani Seed Catalog)</li>
                </ol>
              </div>

              <div className="action-row">
                <button className="btn-clear" onClick={clearSupabaseConfig}>
                  Clear Saved Credentials
                </button>
                <button className="btn btn-primary btn-sm" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="unconfigured-card">
              <div className="setup-banner">
                <Key className="setup-banner-icon" />
                <div>
                  <h4>Connect Your Supabase Project</h4>
                  <p>
                    Provide your Supabase Project URL and Anon/Publishable Key below, or define them in <code>.env.local</code>.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSave} className="assistant-form">
                <div className="form-group">
                  <label className="form-label">Supabase Project URL</label>
                  <input
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supabase Anon / Public Key</label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={e => setAnonKey(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                {errorMessage && (
                  <p className="form-error">{errorMessage}</p>
                )}

                <div className="assistant-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                    Use Offline Seed Catalog
                  </button>
                  <button type="submit" className="btn btn-gold btn-sm">
                    Connect & Save
                  </button>
                </div>
              </form>

              <div className="supabase-guide">
                <p>Don't have a Supabase project yet?</p>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="guide-link"
                >
                  Create free Supabase project <ExternalLink size={13} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
