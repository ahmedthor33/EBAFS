import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AuthPages.css';

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, isAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const from = (location.state as any)?.from?.pathname || (isAdmin ? '/admin' : '/account');

  // If already logged in, redirect immediately to account or admin panel
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await signIn(email.trim(), password);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="container auth-container">
        <div className="auth-card">
          <div className="auth-card-header">
            <span className="auth-eyebrow">EBA FASHION STUDIO</span>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to access your curated wishlist, order history, and account settings.</p>
          </div>

          {errorMsg && (
            <div className="auth-alert error">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
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

            <div className="form-group">
              <div className="label-row">
                <label className="form-label">Password</label>
                <Link to="/forgot-password" className="forgot-link">
                  Forgot Password?
                </Link>
              </div>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-icon" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="auth-card-footer">
            <p>
              Don't have an EBA account yet?{' '}
              <Link to="/signup" className="auth-switch-link">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
