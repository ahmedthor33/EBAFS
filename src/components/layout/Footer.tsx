import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Phone, ShieldCheck, Database, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { SupabaseAssistant } from '../common/SupabaseAssistant';
import './Footer.css';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setIsSubscribing(true);
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('newsletter_subscribers').insert([{ email: email.trim().toLowerCase() }]);
      } catch (err) {
        console.warn('Newsletter subscribe warning:', err);
      }
    }
    setIsSubscribing(false);
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 5000);
  };

  return (
    <>
      <footer className="site-footer">
        {/* Value Proposition Highlights Banner */}
        <div className="footer-highlights">
          <div className="container highlights-grid">
            <div className="highlight-item">
              <div className="highlight-icon">✨</div>
              <div className="highlight-text">
                <h4>100% Authentic Designer Wear</h4>
                <p>Curated directly from Pakistan's most prestigious luxury fashion houses.</p>
              </div>
            </div>
            <div className="highlight-item">
              <div className="highlight-icon">🚚</div>
              <div className="highlight-text">
                <h4>Complimentary Express Shipping</h4>
                <p>Free tracked courier shipping across Pakistan on orders over PKR 5,000.</p>
              </div>
            </div>
            <div className="highlight-item">
              <div className="highlight-icon">💬</div>
              <div className="highlight-text">
                <h4>Dedicated Style Concierge</h4>
                <p>Personalized WhatsApp order assistance and fabric tailoring consultations.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer Links & Newsletter */}
        <div className="container footer-main">
          <div className="footer-grid">
            {/* Brand Column */}
            <div className="footer-col brand-col">
              <span className="footer-brand-title">EBA FASHION STUDIO</span>
              <p className="footer-brand-desc">
                The premier destination for luxury Pakistani fashion. Specializing in high-end unstitched designer lawn, hand-embroidered wedding formals, and pure Australian merino wool shawls for gentlemen.
              </p>
              <div className="footer-social-links">
                <a href="https://instagram.com/ebafashionstudio" target="_blank" rel="noreferrer" aria-label="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
                <a href="https://facebook.com/ebafashionstudio" target="_blank" rel="noreferrer" aria-label="Facebook">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </a>
                <a href="https://wa.me/923001234567" target="_blank" rel="noreferrer" aria-label="WhatsApp Concierge">
                  <Phone size={18} />
                </a>
              </div>
            </div>

            {/* Shop Column */}
            <div className="footer-col">
              <h4 className="footer-col-title">COLLECTIONS</h4>
              <ul className="footer-links">
                <li><Link to="/women">Women's Luxury Lawn</Link></li>
                <li><Link to="/women">Chiffon & Festive Formals</Link></li>
                <li><Link to="/men">Men's Superfine Unstitched</Link></li>
                <li><Link to="/men">Royal Pure Wool Shawls</Link></li>
                <li><Link to="/brands">Designer Brands</Link></li>
                <li><Link to="/shop?sale=true">Curated Sale</Link></li>
              </ul>
            </div>

            {/* Customer Care */}
            <div className="footer-col">
              <h4 className="footer-col-title">CUSTOMER CARE</h4>
              <ul className="footer-links">
                <li><Link to="/orders">Order Tracking</Link></li>
                <li><Link to="/shipping-policy">Shipping Policy</Link></li>
                <li><Link to="/return-policy">Returns & Exchange</Link></li>
                <li><Link to="/contact">Contact Concierge</Link></li>
                <li><Link to="/about">About EBA Studio</Link></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
              </ul>
            </div>

            {/* Newsletter Column */}
            <div className="footer-col newsletter-col">
              <h4 className="footer-col-title">THE EDITORIAL NEWSLETTER</h4>
              <p className="newsletter-desc">
                Receive private invitations to seasonal designer launches, exclusive lawn previews, and heritage updates.
              </p>
              <form onSubmit={handleSubscribe} className="newsletter-form">
                <div className="newsletter-input-group">
                  <input
                    type="email"
                    placeholder="Enter your email address..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="newsletter-input"
                  />
                  <button
                    type="submit"
                    className="newsletter-submit-btn"
                    disabled={isSubscribing}
                    aria-label="Subscribe to newsletter"
                  >
                    {isSubscribing ? '...' : <ArrowRight size={16} />}
                  </button>
                </div>
                {subscribed && (
                  <p className="newsletter-success">
                    <Check size={14} /> Thank you for subscribing to EBA Fashion Studio.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div className="container bottom-container">
            <p className="copyright-text">
              © {new Date().getFullYear()} EBA Fashion Studio. All Rights Reserved. Luxury Pakistani Fashion.
            </p>

            <div className="bottom-meta">
              <span className="currency-indicator">Currency: PKR (₨)</span>
              {/* Development / Setup database status chip */}
              <button
                className="database-status-chip"
                onClick={() => setAssistantOpen(true)}
                title="Supabase Database & Architecture Status"
              >
                <Database size={12} />
                <span>{isSupabaseConfigured() ? 'Supabase Connected' : 'Supabase Setup'}</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Database Assistant Modal */}
      <SupabaseAssistant isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </>
  );
};
