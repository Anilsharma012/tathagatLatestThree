import React, { useState, useEffect } from 'react';
import AdminLayout from '../AdminLayout/AdminLayout';
import crm from '../../../utils/crmApi';
import { toast } from 'react-toastify';
import './crm.css';

const formTypes = [
  { key: 'all', label: 'All Inquiries', color: '#6366f1' },
  { key: 'contact', label: 'Contact Form', color: '#10b981' },
  { key: 'demo_reservation', label: 'Demo Reservation', color: '#f59e0b' },
  { key: 'guide_form', label: 'Guide Form', color: '#3b82f6' },
  { key: 'faq_question', label: 'FAQ Questions', color: '#ef4444' },
  { key: 'other', label: 'Other', color: '#6b7280' }
];

const leadStatuses = [
  { value: 'new', label: 'New', color: '#6366f1', bg: '#eef2ff' },
  { value: 'contacted', label: 'Contacted', color: '#0369a1', bg: '#e0f2fe' },
  { value: 'hot_lead', label: 'Hot Lead', color: '#dc2626', bg: '#fee2e2' },
  { value: 'cold_lead', label: 'Cold Lead', color: '#475569', bg: '#e2e8f0' },
  { value: 'response_pending', label: 'Response Pending', color: '#d97706', bg: '#fef3c7' },
  { value: 'follow_up', label: 'Follow Up', color: '#7c3aed', bg: '#ede9fe' },
  { value: 'not_interested', label: 'Not Interested', color: '#9ca3af', bg: '#f3f4f6' },
  { value: 'demo_scheduled', label: 'Demo Scheduled', color: '#7c3aed', bg: '#ede9fe' },
  { value: 'converted', label: 'Converted', color: '#16a34a', bg: '#dcfce7' },
  { value: 'lost', label: 'Lost', color: '#dc2626', bg: '#fee2e2' }
];

const getStatusStyle = (lead) => {
  const status = lead.leadStatus || 'new';
  return leadStatuses.find(s => s.value === status) || leadStatuses[0];
};

const InquiryManagement = () => {
  const [activeType, setActiveType] = useState('all');
  const [leads, setLeads] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [remarksModal, setRemarksModal] = useState(null);
  const [remarksText, setRemarksText] = useState('');

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [activeType, search]);

  const fetchCounts = async () => {
    try {
      const { data } = await crm.get('/crm/leads/form-type-counts');
      if (data.success) {
        const total = Object.values(data.counts).reduce((a, b) => a + b, 0);
        setCounts({ ...data.counts, all: total });
      }
    } catch (err) {
      console.error('Error fetching counts:', err);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      let url = '/crm/leads';
      let params = { limit: 100 };
      
      if (activeType !== 'all') {
        url = `/crm/leads/by-type/${activeType}`;
      }
      if (search) params.search = search;
      
      const { data } = await crm.get(url, { params });
      if (data.success) {
        setLeads(data.leads || data.items || []);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leadId, value) => {
    try {
      const stageMap = {
        'new': 'New',
        'contacted': 'Contacted',
        'hot_lead': 'Contacted',
        'cold_lead': 'Contacted',
        'response_pending': 'Contacted',
        'follow_up': 'Contacted',
        'not_interested': 'Lost',
        'demo_scheduled': 'Demo Scheduled',
        'converted': 'Won',
        'lost': 'Lost'
      };
      
      const updateData = { 
        leadStatus: value,
        stage: stageMap[value] || 'New'
      };
      
      if (value === 'hot_lead') {
        const lead = leads.find(l => l._id === leadId);
        updateData.tags = [...(lead?.tags || []).filter(t => t !== 'hot' && t !== 'cold'), 'hot'];
      } else if (value === 'cold_lead') {
        const lead = leads.find(l => l._id === leadId);
        updateData.tags = [...(lead?.tags || []).filter(t => t !== 'hot' && t !== 'cold'), 'cold'];
      }

      const { data } = await crm.put(`/crm/leads/${leadId}`, updateData);
      if (data.success) {
        setLeads(prev => prev.map(l => l._id === leadId ? { ...l, ...data.lead } : l));
        toast.success('Status updated');
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const saveRemarks = async () => {
    if (!remarksModal) return;
    try {
      const { data } = await crm.put(`/crm/leads/${remarksModal}`, { notes: remarksText });
      if (data.success) {
        setLeads(prev => prev.map(l => l._id === remarksModal ? { ...l, notes: remarksText } : l));
        toast.success('Remarks saved');
      }
      setRemarksModal(null);
    } catch (err) {
      toast.error('Failed to save remarks');
    }
  };

  const getCurrentStatus = (lead) => {
    if (lead.leadStatus) return lead.leadStatus;
    if (lead.tags?.includes('hot')) return 'hot_lead';
    if (lead.tags?.includes('cold')) return 'cold_lead';
    const stageToStatus = { 'New': 'new', 'Contacted': 'contacted', 'Demo Scheduled': 'demo_scheduled', 'Won': 'converted', 'Lost': 'lost' };
    return stageToStatus[lead.stage] || 'new';
  };

  const exportCSV = () => {
    if (leads.length === 0) return;
    const headers = ['Name', 'Mobile', 'Email', 'Course Interest', 'Message', 'Form Type', 'Status', 'Date'];
    const rows = leads.map(l => [
      l.name || '',
      l.mobile || '',
      l.email || '',
      l.courseInterest || '',
      (l.message || l.notes || '').replace(/,/g, ' '),
      l.formType || '',
      getCurrentStatus(l),
      new Date(l.createdAt).toLocaleString()
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inquiries_${activeType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <AdminLayout>
      <div className="crm-container">
        <div className="crm-header">
          <h1>Inquiry Management</h1>
          <p className="muted">View and manage all form submissions from the website</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {formTypes.map(ft => (
            <button
              key={ft.key}
              onClick={() => setActiveType(ft.key)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: activeType === ft.key ? `2px solid ${ft.color}` : '1px solid #e5e7eb',
                background: activeType === ft.key ? ft.color : '#fff',
                color: activeType === ft.key ? '#fff' : '#374151',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {ft.label}
              <span style={{
                background: activeType === ft.key ? 'rgba(255,255,255,0.3)' : '#f3f4f6',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {counts[ft.key] || 0}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
          />
          <button onClick={exportCSV} className="btn" style={{ background: '#10b981', color: '#fff' }}>
            Export CSV
          </button>
        </div>

        {loading ? (
          <div className="ph-banner" role="status">Loading inquiries...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Interest</th>
                  <th>Message</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Action</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  const statusInfo = getStatusStyle(l);
                  return (
                    <tr key={l._id}>
                      <td><strong>{l.name}</strong></td>
                      <td>{l.mobile || '-'}</td>
                      <td>{l.email || '-'}</td>
                      <td>{l.courseInterest || '-'}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.message || l.notes || '-'}
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          background: formTypes.find(f => f.key === l.formType)?.color || '#6b7280',
                          color: '#fff'
                        }}>
                          {l.formType || 'other'}
                        </span>
                      </td>
                      <td>
                        <span className="lead-status-badge" style={{
                          background: statusInfo?.bg || '#f3f4f6',
                          color: statusInfo?.color || '#374151',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}>
                          {statusInfo?.label || l.stage}
                        </span>
                      </td>
                      <td>
                        <div className="action-cell">
                          <select
                            className="action-select"
                            value={getCurrentStatus(l)}
                            onChange={(e) => handleStatusChange(l._id, e.target.value)}
                          >
                            {leadStatuses.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          <button
                            className="remarks-btn"
                            title={l.notes || 'Add remarks'}
                            onClick={() => { setRemarksModal(l._id); setRemarksText(l.notes || ''); }}
                          >
                            {l.notes ? '📝' : '💬'}
                          </button>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{new Date(l.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
                {leads.length === 0 && (
                  <tr><td colSpan={9} className="muted" style={{ textAlign: 'center', padding: '40px' }}>No inquiries found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {remarksModal && (
          <div className="modal-overlay" onClick={() => setRemarksModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>Add Remarks / Notes</h3>
                <button className="close" onClick={() => setRemarksModal(null)}>&times;</button>
              </div>
              <div className="modal-body">
                <textarea
                  value={remarksText}
                  onChange={e => setRemarksText(e.target.value)}
                  placeholder="Add notes about this inquiry... e.g. Called on 15th Feb, interested in CAT course..."
                  rows={4}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', resize: 'vertical' }}
                />
              </div>
              <div className="modal-footer">
                <button className="btn" style={{ background: '#6b7280' }} onClick={() => setRemarksModal(null)}>Cancel</button>
                <button className="btn" onClick={saveRemarks}>Save Remarks</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default InquiryManagement;
