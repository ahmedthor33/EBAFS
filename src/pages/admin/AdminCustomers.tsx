import React, { useState, useEffect } from 'react';
import { Search, Users, Mail, Phone, Calendar } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { formatPKR, formatDate } from '../../lib/supabase';

export const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const list = await adminService.getCustomersList();
        setCustomers(list);
      } catch (err) {
        console.error('Customer list error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-heading">Customer Directory</h1>
          <p className="admin-page-sub">
            Verified patrons, contact records, order volumes, and lifetime value.
          </p>
        </div>
      </div>

      <div className="admin-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by customer name, email, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-search-input"
          />
        </div>
      </div>

      <div className="admin-card-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Contact Details</th>
              <th>Total Orders</th>
              <th>Lifetime Spend</th>
              <th>Recent Purchase Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>Loading customers...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>No customers found.</td>
              </tr>
            ) : (
              filtered.map((cust, idx) => (
                <tr key={idx}>
                  <td>
                    <strong className="table-title">{cust.name}</strong>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={11} /> {cust.email}
                      </span>
                      <span style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={11} /> {cust.phone}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-gold">{cust.totalOrders} Orders</span>
                  </td>
                  <td className="font-semibold">{formatPKR(cust.totalSpent)}</td>
                  <td>{formatDate(cust.lastOrderDate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
