import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, Heart, LogOut, Shield, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AccountPages.css';

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, role, isAdmin, signOut, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!user) {
    navigate('/signin');
    return null;
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedbackMsg('');

    const res = await updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
    setIsSaving(false);
    if (res.error) {
      setFeedbackMsg(`Error: ${res.error}`);
    } else {
      setFeedbackMsg('Profile updated successfully.');
      setTimeout(() => setFeedbackMsg(''), 4000);
    }
  };

  return (
    <div className="account-page">
      <section className="account-header-banner">
        <div className="container">
          <span className="account-eyebrow">VALUED CLIENT PORTAL</span>
          <h1 className="account-title">My Account</h1>
          <p className="account-subtitle">
            Welcome back, {profile?.full_name || user.email}. Manage your profile and luxury orders.
          </p>
        </div>
      </section>

      <div className="container account-layout">
        {/* Navigation Sidebar */}
        <aside className="account-sidebar">
          <div className="account-profile-summary">
            <div className="profile-avatar-circle">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div>
              <h3 className="profile-name">{profile?.full_name || 'EBA Patron'}</h3>
              <span className="profile-role-tag">{role || 'CUSTOMER'}</span>
            </div>
          </div>

          <nav className="account-nav-list">
            <Link to="/account" className="account-nav-item active">
              <User size={16} />
              <span>Profile Settings</span>
            </Link>
            <Link to="/orders" className="account-nav-item">
              <Package size={16} />
              <span>My Orders</span>
            </Link>
            <Link to="/wishlist" className="account-nav-item">
              <Heart size={16} />
              <span>My Wishlist</span>
            </Link>
            {isAdmin && (
              <Link to="/admin" className="account-nav-item admin-link">
                <Shield size={16} />
                <span>Admin Management System</span>
              </Link>
            )}
            <button onClick={signOut} className="account-nav-item signout">
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </nav>
        </aside>

        {/* Main Settings Form */}
        <main className="account-main">
          <div className="account-card">
            <h2 className="card-title">Personal Profile & Contact</h2>
            <p className="card-desc">Keep your contact details up to date for courier delivery notifications.</p>

            {feedbackMsg && (
              <div className={`feedback-alert ${feedbackMsg.startsWith('Error') ? 'error' : 'success'}`}>
                {feedbackMsg.startsWith('Error') ? <AlertCircle size={16} /> : <Check size={16} />}
                <span>{feedbackMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="profile-form">
              <div className="form-group">
                <label className="form-label">Email Address (Registered)</label>
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="form-input disabled"
                />
                <span className="input-hint">Email address cannot be modified once verified.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Primary Mobile Number</label>
                <input
                  type="tel"
                  placeholder="0300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};
