import React, { useState } from 'react';
import { Mail, Phone, MapPin, Check, Send, ShieldCheck, Clock } from 'lucide-react';
import './StaticPages.css';

export const AboutPage: React.FC = () => (
  <div className="static-page">
    <section className="static-hero">
      <div className="container">
        <span className="static-eyebrow">OUR HERITAGE & VISION</span>
        <h1 className="static-title">About EBA Fashion Studio</h1>
      </div>
    </section>

    <div className="container static-content">
      <div className="editorial-story-block">
        <h2>The Art of Pakistani Luxury Fashion</h2>
        <p>
          Established with an uncompromising passion for authentic Pakistani craftsmanship, <strong>EBA Fashion Studio</strong> represents the pinnacle of luxury unstitched designer wear. We bring together Pakistan's premier fashion houses—from avant-garde pioneers like Hussain Rehar and timeless couturiers like Maria-B and Baroque, to gentlemen’s benchmarks like J. and Bin Faisal.
        </p>
        <p>
          In an era of mass commercialism, we celebrate the bespoke tradition of unstitched fabrics. An unstitched ensemble is a blank canvas of majestic silk, Swiss lawn, organza, and pure Australian Merino wool—tailored exclusively to celebrate individuality.
        </p>
      </div>

      <div className="static-values-grid">
        <div className="static-value-card">
          <h3>Uncompromised Authenticity</h3>
          <p>Every piece is sourced directly from original design houses with official seals, tags, and packaging.</p>
        </div>
        <div className="static-value-card">
          <h3>Curated Distinction</h3>
          <p>We hand-select only the finest cuts, ensuring perfection in embroidery tension, dye fastness, and motif placement.</p>
        </div>
        <div className="static-value-card">
          <h3>Patron Concierge</h3>
          <p>Our dedicated styling advisors assist with tailoring advice, unstitched suit lengths, and express deliveries.</p>
        </div>
      </div>
    </div>
  </div>
);

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="static-page">
      <section className="static-hero">
        <div className="container">
          <span className="static-eyebrow">CONCIERGE & INQUIRIES</span>
          <h1 className="static-title">Contact The Studio</h1>
        </div>
      </section>

      <div className="container static-content">
        <div className="contact-grid">
          <div className="contact-info-panel">
            <h2>We Are at Your Service</h2>
            <p className="contact-lead">
              For order inquiries, fabric consultations, or bespoke bridal bookings, connect directly with our studio advisors.
            </p>

            <div className="contact-methods">
              <div className="method-item">
                <Phone className="method-icon" />
                <div>
                  <strong>WhatsApp Concierge & Phone</strong>
                  <p>+92 300 1234567</p>
                  <span>Mon – Sat: 11:00 AM – 8:00 PM PKT</span>
                </div>
              </div>

              <div className="method-item">
                <Mail className="method-icon" />
                <div>
                  <strong>Client Assistance Email</strong>
                  <p>concierge@ebafashionstudio.com</p>
                </div>
              </div>

              <div className="method-item">
                <MapPin className="method-icon" />
                <div>
                  <strong>Studio Office</strong>
                  <p>Main Boulevard, Gulberg III, Lahore, Pakistan</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-panel">
            {submitted ? (
              <div className="contact-success-card">
                <Check size={48} className="success-icon" />
                <h3>Inquiry Received</h3>
                <p>Thank you, {name}. A style concierge representative will respond to your message promptly via WhatsApp or email.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <h3>Send a Message</h3>
                <div className="form-group">
                  <label className="form-label">Your Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">WhatsApp / Phone *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Your Message / Inquiry *</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    className="form-textarea"
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-full">
                  <span>Send Message</span>
                  <Send size={15} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ShippingPolicyPage: React.FC = () => (
  <div className="static-page">
    <section className="static-hero">
      <div className="container">
        <h1 className="static-title">Shipping & Delivery Policy</h1>
      </div>
    </section>
    <div className="container static-content policy-text">
      <h2>Nationwide Delivery in Pakistan</h2>
      <p>
        EBA Fashion Studio dispatches all customer orders via premium tracked courier partners (TCS, Leopard, and Trax).
      </p>
      <h3>Shipping Rates & Thresholds</h3>
      <ul>
        <li><strong>Complimentary Nationwide Delivery:</strong> Valid on all orders with a merchandise subtotal of PKR 5,000 or greater.</li>
        <li><strong>Punjab & Capital Territory:</strong> PKR 250 flat fee (2 - 3 business days).</li>
        <li><strong>Sindh:</strong> PKR 300 flat fee (3 - 4 business days).</li>
        <li><strong>KPK & Northern Areas:</strong> PKR 350 flat fee (3 - 5 business days).</li>
        <li><strong>Balochistan & Remote Regions:</strong> PKR 400 flat fee (4 - 7 business days).</li>
      </ul>
      <h3>Order Confirmation & Tracking</h3>
      <p>
        Upon order placement, you will receive an SMS and email containing your order reference and real-time courier tracking number once dispatched.
      </p>
    </div>
  </div>
);

export const ReturnPolicyPage: React.FC = () => (
  <div className="static-page">
    <section className="static-hero">
      <div className="container">
        <h1 className="static-title">Returns & Exchange Policy</h1>
      </div>
    </section>
    <div className="container static-content policy-text">
      <h2>7-Day Exchange Privilege</h2>
      <p>
        We want you to treasure your designer acquisition. If an item arrives damaged or differs from your order, we gladly offer exchange or credit within 7 calendar days of receipt.
      </p>
      <h3>Conditions for Return / Exchange</h3>
      <ul>
        <li>The fabric must remain unstitched, uncut, and unaltered in original delivered condition.</li>
        <li>All designer tags, labels, and original brand box packaging must be intact.</li>
        <li>Proof of purchase (order number or invoice) must be provided.</li>
      </ul>
      <h3>Non-Returnable Items</h3>
      <p>Sale items and tailored/custom-stitched garments cannot be refunded or exchanged.</p>
    </div>
  </div>
);

export const TermsPage: React.FC = () => (
  <div className="static-page">
    <section className="static-hero">
      <div className="container">
        <h1 className="static-title">Terms & Conditions</h1>
      </div>
    </section>
    <div className="container static-content policy-text">
      <h2>Terms of Service</h2>
      <p>
        By accessing and placing an order on EBA Fashion Studio, you agree to comply with our commercial terms and operational policies. All prices are listed in Pakistani Rupees (PKR) and are inclusive of standard local levies.
      </p>
      <h3>Product Authenticity & Color Accuracy</h3>
      <p>
        While we make every effort to display true fabric hues, lighting variations during designer photoshoots and screen calibrations may yield slight subtle tonal variances.
      </p>
    </div>
  </div>
);

export const PrivacyPolicyPage: React.FC = () => (
  <div className="static-page">
    <section className="static-hero">
      <div className="container">
        <h1 className="static-title">Privacy Policy</h1>
      </div>
    </section>
    <div className="container static-content policy-text">
      <h2>Data Protection & Privacy</h2>
      <p>
        EBA Fashion Studio respects your privacy. We collect customer contact data (name, email, shipping address, mobile number) solely to process your orders and coordinate courier delivery. We will never sell, lease, or expose your private information to third-party advertisers.
      </p>
    </div>
  </div>
);
