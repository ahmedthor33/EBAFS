import React, { useState, useEffect } from 'react';
import { Activity, Clock } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AdminActivityLog } from '../../types';
import { formatDate } from '../../lib/supabase';

export const AdminActivity: React.FC = () => {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const list = await adminService.getActivityLogs();
        setLogs(list);
      } catch (err) {
        console.error('Activity logs error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-heading">Administrative Activity & Audit Log</h1>
          <p className="admin-page-sub">
            Traceable log of catalog changes, fulfillment modifications, and administrative operations.
          </p>
        </div>
      </div>

      <div className="admin-card-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Staff User</th>
              <th>Action Executed</th>
              <th>Entity</th>
              <th>Entity ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>Loading audit logs...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>No administrative activity recorded yet.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} color="#888" /> {formatDate(log.created_at)} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontSize: '11px' }}>{log.admin_email || 'Owner / Administrator'}</strong>
                  </td>
                  <td>
                    <span className="badge badge-gold">{log.action}</span>
                  </td>
                  <td>{log.entity}</td>
                  <td className="mono" style={{ fontSize: '11px' }}>{log.entity_id || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
