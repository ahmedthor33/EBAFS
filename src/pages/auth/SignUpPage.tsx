import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AuthPages.css';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signUp(email.trim(), password, fullName.trim(), mobileNumber.trim());
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Account created successfully! Redirecting...');
        setTimeout(() => navigate('/account'), 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="container auth-container">
        <div className="auth-card">
          <div className="auth-card-header">
            <span className="auth-eyebrow">JOIN THE STUDIO</span>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Register to enjoy bespoke tailoring consultations, expedited checkout, and order tracking.</p>
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
              <label className="form-label">Full Name *</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-icon" />
                <input
                  type="text"
                  placeholder="e.g. Fatima Ali / Hamza Malik"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="auth-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-icon" />
                <input
                  type="email"
                  placeholder="yourname@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="auth-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number (Active for SMS/Courier) *</label>
              <div className="auth-input-wrap">
                <Phone size={16} className="auth-icon" />
                <input
                  type="tel"
                  placeholder="0300 1234567"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                  className="auth-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
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
              <label className="form-label">Confirm Password *</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-icon" />
                <input
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="auth-input"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Creating Account...' : 'Create Account'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="auth-card-footer">
            <p>
              Already registered with EBA?{' '}
              <Link to="/signin" className="auth-switch-link">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
