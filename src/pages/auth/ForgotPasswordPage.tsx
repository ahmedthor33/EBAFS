import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AuthPages.css';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await resetPassword(email.trim());
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSent(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="container auth-container">
        <div className="auth-card">
          <div className="auth-card-header">
            <span className="auth-eyebrow">RECOVERY</span>
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">Enter your registered email address and we'll send you a secure password reset link.</p>
          </div>

          {errorMsg && (
            <div className="auth-alert error">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {sent ? (
            <div className="auth-alert success">
              <Check size={16} />
              <span>Password reset instructions have been dispatched to your email.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Account Email Address</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-icon" />
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="auth-input"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Sending Link...' : 'Send Recovery Link'}</span>
              </button>
            </form>
          )}

          <div className="auth-card-footer">
            <Link to="/signin" className="back-link">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
