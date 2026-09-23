import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Role } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const AdminAdmins: React.FC = () => {
  const { isOwner } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  // Add/Assign role modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('MANAGER');

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const list = await adminService.getAdminUsers();
      setAdmins(list);
    } catch (err) {
      console.error('Error loading admins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return;

    const newAdmin = {
      id: `admin_${Date.now()}`,
      email: userEmail.trim().toLowerCase(),
      role: selectedRole,
      created_at: new Date().toISOString(),
    };

    setAdmins(prev => [...prev, newAdmin]);
    await adminService.logActivity('Assigned Staff Role', 'AdminRole', newAdmin.id, { email: userEmail, role: selectedRole });

    setIsModalOpen(false);
    setUserEmail('');
    setActionMsg(`Role ${selectedRole} assigned to ${userEmail}.`);
    setTimeout(() => setActionMsg(''), 4000);
  };

  if (!isOwner) {
    return (
      <div className="empty-state">
        <Shield size={48} className="empty-state-icon" />
        <h3 className="empty-state-title">Owner Access Restricted</h3>
        <p className="empty-state-desc">Only the authenticated OWNER role is authorized to manage staff roles and database permissions.</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-heading">Staff & Role-Based Access Control</h1>
          <p className="admin-page-sub">
            Configure administrative privileges and assign roles across the studio management system.
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm">
          <UserPlus size={16} />
          <span>Assign Staff Role</span>
        </button>
      </div>

      {actionMsg && (
        <div className="admin-action-alert success">
          <CheckCircle2 size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Role Definitions Card */}
      <div className="admin-form-section" style={{ marginBottom: '24px' }}>
        <h3 className="section-title">Database Role Hierarchy & Permissions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', fontSize: '12px' }}>
          <div style={{ padding: '10px', background: 'var(--color-ivory)', borderRadius: '4px' }}>
            <strong style={{ color: 'var(--color-gold-dark)', display: 'block', marginBottom: '4px' }}>OWNER</strong>
            <p>Supreme authority. Full database schema access, financial revenue metrics, and role management.</p>
          </div>
          <div style={{ padding: '10px', background: 'var(--color-ivory)', borderRadius: '4px' }}>
            <strong style={{ color: 'var(--color-black-deep)', display: 'block', marginBottom: '4px' }}>MANAGER</strong>
            <p>General operations. Can manage catalog, fulfillment, shipping rates, and customer inquiries.</p>
          </div>
          <div style={{ padding: '10px', background: 'var(--color-ivory)', borderRadius: '4px' }}>
            <strong style={{ color: 'var(--color-black-deep)', display: 'block', marginBottom: '4px' }}>ORDER_MANAGER</strong>
            <p>Fulfillment operations. Dispatches packages, updates courier tracking numbers, verifies payments.</p>
          </div>
          <div style={{ padding: '10px', background: 'var(--color-ivory)', borderRadius: '4px' }}>
            <strong style={{ color: 'var(--color-black-deep)', display: 'block', marginBottom: '4px' }}>CONTENT_MANAGER</strong>
            <p>Catalog curator. Manages products, photography uploads, brands, and categories.</p>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="admin-card-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Staff User Identifier</th>
              <th>Assigned RBAC Role</th>
              <th>Security Level</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((adm) => (
              <tr key={adm.id}>
                <td>
                  <strong className="table-title">{adm.email}</strong>
                </td>
                <td>
                  <span className={`badge ${adm.role === 'OWNER' ? 'badge-gold' : 'badge-gender'}`}>
                    {adm.role}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: '11px', color: '#666' }}>
                    {adm.role === 'OWNER' ? 'Tier 1 - Master Database Authority' : 'Tier 2 - Operational Admin'}
                  </span>
                </td>
                <td>
                  <span className="badge badge-success">Active Authorized</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="assistant-modal-backdrop">
          <div className="assistant-modal" style={{ maxWidth: '440px' }}>
            <div className="assistant-header">
              <h3>Assign Staff Privilege</h3>
              <button className="assistant-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAssignRole} className="assistant-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">User Email Address *</label>
                <input
                  type="email"
                  placeholder="staff@ebafashionstudio.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role Assignment *</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="form-select"
                >
                  <option value="MANAGER">MANAGER</option>
                  <option value="ORDER_MANAGER">ORDER_MANAGER</option>
                  <option value="CONTENT_MANAGER">CONTENT_MANAGER</option>
                  <option value="OWNER">OWNER</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Grant Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
