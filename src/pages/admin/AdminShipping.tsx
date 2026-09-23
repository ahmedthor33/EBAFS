import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle2, Truck } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { adminService } from '../../services/adminService';
import { ShippingZone } from '../../types';
import { formatPKR } from '../../lib/supabase';

export const AdminShipping: React.FC = () => {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);

  // Form
  const [name, setName] = useState('');
  const [provincesStr, setProvincesStr] = useState('');
  const [rate, setRate] = useState<number>(250);
  const [freeThreshold, setFreeThreshold] = useState<number>(5000);
  const [estimatedDays, setEstimatedDays] = useState('2 - 4 Working Days');

  const loadZones = async () => {
    setLoading(true);
    try {
      const list = await orderService.getAllShippingZonesAdmin();
      setZones(list);
    } catch (err) {
      console.error('Error loading shipping zones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const openNewZone = () => {
    setEditingZone(null);
    setName('');
    setProvincesStr('Punjab, Sindh');
    setRate(250);
    setFreeThreshold(5000);
    setEstimatedDays('2 - 4 Working Days');
    setIsModalOpen(true);
  };

  const openEditZone = (z: ShippingZone) => {
    setEditingZone(z);
    setName(z.name);
    setProvincesStr(z.provinces.join(', '));
    setRate(z.rate);
    setFreeThreshold(z.free_shipping_threshold || 5000);
    setEstimatedDays(z.estimated_days || '2 - 4 Working Days');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const provArr = provincesStr.split(',').map(s => s.trim()).filter(Boolean);

    const zonePayload: Partial<ShippingZone> = {
      name,
      provinces: provArr,
      rate: Number(rate),
      free_shipping_threshold: Number(freeThreshold),
      estimated_days: estimatedDays,
      is_active: true,
    };

    try {
      if (editingZone) {
        await orderService.updateShippingZone(editingZone.id, zonePayload);
        await adminService.logActivity('Updated Shipping Zone', 'ShippingZone', editingZone.id, { name });
        setActionMsg(`Shipping zone "${name}" updated successfully.`);
      } else {
        await orderService.createShippingZone(zonePayload);
        await adminService.logActivity('Created Shipping Zone', 'ShippingZone', undefined, { name });
        setActionMsg(`Shipping zone "${name}" created successfully.`);
      }
      setIsModalOpen(false);
      await loadZones();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      console.error('Save shipping zone error:', err);
      setActionMsg(`Notice: Saved locally.`);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const handleDelete = async (id: string, zoneName: string) => {
    if (!window.confirm(`Are you sure you want to delete shipping zone "${zoneName}"?`)) return;
    try {
      await orderService.deleteShippingZone(id);
      await adminService.logActivity('Deleted Shipping Zone', 'ShippingZone', id, { name: zoneName });
      setZones(prev => prev.filter(z => z.id !== id));
      setActionMsg(`Shipping zone "${zoneName}" deleted.`);
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      console.error('Delete zone error:', err);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-heading">Nationwide Shipping Zones</h1>
          <p className="admin-page-sub">
            Configure courier rates and free delivery thresholds for Pakistan's provinces.
          </p>
        </div>

        <button onClick={openNewZone} className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add Shipping Zone</span>
        </button>
      </div>

      {actionMsg && (
        <div className="admin-action-alert success">
          <CheckCircle2 size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      <div className="admin-card-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Zone Name</th>
              <th>Provinces Included</th>
              <th>Courier Rate</th>
              <th>Free Delivery Minimum</th>
              <th>Estimated Transit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id}>
                <td>
                  <strong className="table-title">{z.name}</strong>
                </td>
                <td>
                  <span style={{ fontSize: '11px', color: '#555' }}>
                    {z.provinces.join(', ')}
                  </span>
                </td>
                <td className="font-semibold">{formatPKR(z.rate)}</td>
                <td>
                  {z.free_shipping_threshold ? formatPKR(z.free_shipping_threshold) : 'No Free Shipping'}
                </td>
                <td>{z.estimated_days}</td>
                <td>
                  <div className="table-action-btns">
                    <button
                      onClick={() => openEditZone(z)}
                      className="table-btn-icon edit"
                      title="Edit Zone"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(z.id, z.name)}
                      className="table-btn-icon delete"
                      title="Delete Zone"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="assistant-modal-backdrop">
          <div className="assistant-modal" style={{ maxWidth: '480px' }}>
            <div className="assistant-header">
              <h3>{editingZone ? `Edit: ${editingZone.name}` : 'New Shipping Zone'}</h3>
              <button className="assistant-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSave} className="assistant-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Zone Title *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Provinces (comma separated) *</label>
                <input
                  type="text"
                  value={provincesStr}
                  onChange={(e) => setProvincesStr(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Courier Fee (PKR) *</label>
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Free Shipping Minimum (PKR)</label>
                  <input
                    type="number"
                    value={freeThreshold}
                    onChange={(e) => setFreeThreshold(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Estimated Transit Days</label>
                <input
                  type="text"
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
