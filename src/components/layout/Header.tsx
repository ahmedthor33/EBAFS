import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Heart, ShoppingBag, User as UserIcon, Menu, X, ChevronRight, LogOut, Shield } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { SearchOverlay } from '../common/SearchOverlay';
import { adminService } from '../../services/adminService';
import './Header.css';

export const Header: React.FC = () => {
  const location = useLocation();
  const { itemCount, setIsCartOpen } = useCart();
  const { wishlist } = useWishlist();
  const { user, profile, isAdmin, signOut } = useAuth();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [siteSettings, setSiteSettings] = useState<{
    announcement_text: string;
    whatsapp_number: string;
    currency: string;
  }>({
    announcement_text: 'Complimentary Nationwide Express Shipping on Orders Above PKR 5,000',
    whatsapp_number: '+92 300 1234567',
    currency: 'PKR',
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await adminService.getSiteSettings();
        if (s) {
          setSiteSettings({
            announcement_text: s.announcement_text || 'Complimentary Nationwide Express Shipping on Orders Above PKR 5,000',
            whatsapp_number: s.whatsapp_number || '+92 300 1234567',
            currency: s.currency || 'PKR',
          });
        }
      } catch (e) {}
    };
    loadSettings();

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setSiteSettings({
          announcement_text: e.detail.announcement_text || 'Complimentary Nationwide Express Shipping on Orders Above PKR 5,000',
          whatsapp_number: e.detail.whatsapp_number || '+92 300 1234567',
          currency: e.detail.currency || 'PKR',
        });
      }
    };
    window.addEventListener('eba_settings_updated', handleUpdate);
    return () => window.removeEventListener('eba_settings_updated', handleUpdate);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const wishlistCount = wishlist.length;

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="announcement-bar">
        <div className="container announcement-content">
          <span>{siteSettings.announcement_text}</span>
          <div className="announcement-meta">
            <span className="currency-pill">{siteSettings.currency}</span>
            <a
              href={`https://wa.me/${siteSettings.whatsapp_number.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="whatsapp-help"
            >
              WhatsApp Concierge: {siteSettings.whatsapp_number}
            </a>
          </div>
        </div>
      </div>

      {/* Main Luxury Header */}
      <header className={`site-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container header-container">
          {/* Mobile Menu Toggle */}
          <button
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Navigation Menu"
          >
            <Menu size={24} />
          </button>

          {/* Desktop Navigation Left */}
          <nav className="desktop-nav">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
              Home
            </Link>
            <Link to="/men" className={`nav-link ${location.pathname.startsWith('/men') ? 'active' : ''}`}>
              Men
            </Link>
            <Link to="/women" className={`nav-link ${location.pathname.startsWith('/women') ? 'active' : ''}`}>
              Women
            </Link>
            <Link to="/shop" className={`nav-link ${location.pathname === '/shop' ? 'active' : ''}`}>
              Shop All
            </Link>
            <Link to="/brands" className={`nav-link ${location.pathname.startsWith('/brand') ? 'active' : ''}`}>
              Brands
            </Link>
          </nav>

          {/* Luxury Brand Logo */}
          <Link to="/" className="brand-logo-wrap" aria-label="EBA Fashion Studio">
            {!logoError ? (
              <img
                src="/assets/logo/eba-logo.png"
                alt="EBA Fashion Studio"
                className="brand-logo-img"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="brand-logo-text">
                EBA <span className="logo-sub">FASHION STUDIO</span>
              </span>
            )}
          </Link>

          {/* Header Actions Right */}
          <div className="header-actions">
            {/* Global Search Button */}
            <button
              className="action-btn search-trigger"
              onClick={() => setSearchOpen(true)}
              aria-label="Search Collection"
            >
              <Search size={20} />
            </button>

            {/* Wishlist */}
            <Link to="/wishlist" className="action-btn" aria-label="Wishlist">
              <Heart size={20} />
              {wishlistCount > 0 && <span className="action-badge">{wishlistCount}</span>}
            </Link>

            {/* Shopping Bag / Cart */}
            <button
              className="action-btn cart-btn"
              onClick={() => setIsCartOpen(true)}
              aria-label="Shopping Bag"
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && <span className="action-badge">{itemCount}</span>}
            </button>

            {/* Customer Account */}
            {user ? (
              <div className="account-dropdown-wrap">
                <Link to="/account" className="action-btn user-btn" aria-label="My Account">
                  <UserIcon size={20} />
                  <span className="user-firstname-desktop">
                    {profile?.full_name?.split(' ')[0] || 'Account'}
                  </span>
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="admin-quick-badge" title="Owner Admin Portal">
                    <Shield size={13} />
                  </Link>
                )}
              </div>
            ) : (
              <Link to="/signin" className="action-btn signin-btn" aria-label="Sign In">
                <UserIcon size={20} />
                <span className="signin-text">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div
        className={`drawer-backdrop ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-brand">
            <span>EBA FASHION STUDIO</span>
          </div>
          <button
            className="drawer-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Menu"
          >
            <X size={22} />
          </button>
        </div>

        <div className="drawer-content">
          <nav className="drawer-nav">
            <Link to="/" className="drawer-link">
              <span>Home</span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/men" className="drawer-link highlight">
              <span>Men's Unstitched & Shawls</span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/women" className="drawer-link highlight">
              <span>Women's Luxury Lawn & Formals</span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/shop" className="drawer-link">
              <span>Browse All Collections</span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/brands" className="drawer-link">
              <span>Designer Pakistani Brands</span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/wishlist" className="drawer-link">
              <span>Saved Wishlist ({wishlistCount})</span>
              <ChevronRight size={16} />
            </Link>
          </nav>

          <div className="drawer-footer">
            {user ? (
              <div className="drawer-user-section">
                <div className="drawer-user-info">
                  <p className="user-name">{profile?.full_name || user.email}</p>
                  <p className="user-role-label">Customer Portal</p>
                </div>
                <div className="drawer-user-links">
                  <Link to="/account" className="btn btn-secondary btn-sm btn-full">
                    My Account & Orders
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="btn btn-gold btn-sm btn-full">
                      Admin Management Portal
                    </Link>
                  )}
                  <button onClick={signOut} className="drawer-signout-btn">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="drawer-auth-buttons">
                <Link to="/signin" className="btn btn-primary btn-full">
                  Sign In
                </Link>
                <Link to="/signup" className="btn btn-secondary btn-full">
                  Create Account
                </Link>
              </div>
            )}

            <div className="drawer-concierge">
              <span>Customer Care & Orders:</span>
              <a href="https://wa.me/923001234567" target="_blank" rel="noreferrer">
                WhatsApp: +92 300 1234567
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Global Search Overlay */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
