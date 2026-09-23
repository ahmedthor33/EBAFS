import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Edit, Building2 } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { adminService } from '../../services/adminService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { PaymentMethod } from '../../types';

export const AdminPayments: React.FC = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  // Form state
  const [instructions, setInstructions] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [isActive, setIsActive] = useState(true);

  const loadMethods = async () => {
    setLoading(true);
    try {
      const list = await orderService.getAllPaymentMethodsAdmin();
      setMethods(list);
    } catch (err) {
      console.error('Error loading payment methods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, []);

  const openEdit = (m: PaymentMethod) => {
    setEditingMethod(m);
    setInstructions(m.instructions || '');
    setBankName(m.account_details?.bank_name || '');
    setAccountTitle(m.account_details?.account_title || '');
    setAccountNumber(m.account_details?.account_number || '');
    setIban(m.account_details?.iban || '');
    setIsActive(m.is_active);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;

    const newAccountDetails = {
      ...editingMethod.account_details,
      account_title: accountTitle,
      account_number: accountNumber,
      ...(editingMethod.code === 'BANK_TRANSFER' ? { bank_name: bankName, iban } : {}),
      ...(editingMethod.code === 'JAZZCASH' ? { mobile_number: accountNumber } : {}),
    };

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('payment_methods').update({
          instructions,
          is_active: isActive,
          account_details: newAccountDetails,
        }).eq('id', editingMethod.id);

        if (error) {
          console.warn('Supabase payment method update note:', error.message);
        }
      } catch (err) {
        console.warn('Supabase payment method update error:', err);
      }
    }

    const updated = methods.map((m) => {
      if (m.id === editingMethod.id) {
        return {
          ...m,
          instructions,
          is_active: isActive,
          account_details: newAccountDetails,
        };
      }
      return m;
    });

    setMethods(updated);
    localStorage.setItem('eba_payment_methods', JSON.stringify(updated));
    setEditingMethod(null);
    setActionMsg(`Payment method "${editingMethod.name}" updated successfully.`);
    setTimeout(() => setActionMsg(''), 4000);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-heading">Payment Gateways & Methods</h1>
          <p className="admin-page-sub">
            Configure Cash on Delivery and direct Pakistani inter-bank IBFT account credentials.
          </p>
        </div>
      </div>

      {actionMsg && (
        <div className="admin-action-alert success">
          <CheckCircle2 size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      <div className="admin-categories-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {methods.map((method) => (
          <div key={method.id} className="admin-form-section" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CreditCard size={20} color="var(--color-gold-dark)" />
                <strong style={{ fontSize: '16px' }}>{method.name}</strong>
                <span className={`badge ${method.is_active ? 'badge-success' : 'badge-danger'}`}>
                  {method.is_active ? 'Enabled' : 'Disabled'}
                </span>
                <code style={{ fontSize: '11px', color: '#888' }}>CODE: {method.code}</code>
              </div>

              <button onClick={() => openEdit(method)} className="btn btn-secondary btn-sm">
                <Edit size={14} /> Configure
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>{method.instructions}</p>

            {method.code === 'BANK_TRANSFER' && method.account_details && (
              <div style={{ background: 'var(--color-ivory)', padding: '12px', borderRadius: '4px', fontSize: '12px' }}>
                <p><strong>Bank:</strong> {method.account_details.bank_name}</p>
                <p><strong>Title:</strong> {method.account_details.account_title}</p>
                <p><strong>Account #:</strong> {method.account_details.account_number}</p>
                <p><strong>IBAN:</strong> {method.account_details.iban}</p>
              </div>
            )}

            {method.code === 'JAZZCASH' && method.account_details && (
              <div style={{ background: '#fffbeb', borderLeft: '3px solid #d97706', padding: '12px', borderRadius: '4px', fontSize: '12px' }}>
                <p><strong>Account Title:</strong> {method.account_details.account_title}</p>
                <p><strong>JazzCash Mobile #:</strong> {method.account_details.mobile_number || method.account_details.account_number}</p>
                <p><strong>Instructions:</strong> {method.account_details.note}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {editingMethod && (
        <div className="assistant-modal-backdrop">
          <div className="assistant-modal" style={{ maxWidth: '500px' }}>
            <div className="assistant-header">
              <h3>Configure: {editingMethod.name}</h3>
              <button className="assistant-close" onClick={() => setEditingMethod(null)}>×</button>
            </div>

            <form onSubmit={handleSave} className="assistant-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Customer Instructions</label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="form-textarea"
                />
              </div>

              {editingMethod.code === 'BANK_TRANSFER' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Title</label>
                    <input
                      type="text"
                      value={accountTitle}
                      onChange={(e) => setAccountTitle(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">IBAN</label>
                    <input
                      type="text"
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </>
              )}

              {editingMethod.code === 'JAZZCASH' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Account Title</label>
                    <input
                      type="text"
                      value={accountTitle}
                      onChange={(e) => setAccountTitle(e.target.value)}
                      className="form-input"
                      placeholder="e.g. EBA Fashion Studio"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">JazzCash Mobile / Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="form-input"
                      placeholder="e.g. 0300 1234567"
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span>Active Payment Method on Checkout</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingMethod(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
