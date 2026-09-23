import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, Check, ArrowRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import './AuthPages.css';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }
      setSuccessMsg('Your password has been reset successfully. Redirecting to your account...');
      setTimeout(() => navigate('/account'), 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="container auth-container">
        <div className="auth-card">
          <div className="auth-card-header">
            <span className="auth-eyebrow">NEW CREDENTIALS</span>
            <h1 className="auth-title">Create New Password</h1>
            <p className="auth-subtitle">Please enter your new secure password below.</p>
          </div>

          {errorMsg && (
            <div className="auth-alert error">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert success">
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-icon" />
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-icon" />
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="auth-input"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Updating...' : 'Update Password'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
