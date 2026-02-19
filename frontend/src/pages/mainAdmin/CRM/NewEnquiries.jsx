import React, { useState, useEffect } from 'react';
import AdminLayout from '../AdminLayout/AdminLayout';
import crm from '../../../utils/crmApi';
import { toast } from 'react-toastify';
import './crm.css';

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

const NewEnquiries = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [remarksModal, setRemarksModal] = useState(null);
  const [remarksText, setRemarksText] = useState('');

  const fetchItems = async () => {
    try {
      const { data } = await crm.get('/crm/leads', { params: { stage: 'New', limit: 50 } });
      if (data.success) setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const getCurrentStatus = (lead) => {
    if (lead.leadStatus) return lead.leadStatus;
    if (lead.tags?.includes('hot')) return 'hot_lead';
    if (lead.tags?.includes('cold')) return 'cold_lead';
    const stageToStatus = { 'New': 'new', 'Contacted': 'contacted', 'Demo Scheduled': 'demo_scheduled', 'Won': 'converted', 'Lost': 'lost' };
    return stageToStatus[lead.stage] || 'new';
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
        const lead = items.find(l => l._id === leadId);
        updateData.tags = [...(lead?.tags || []).filter(t => t !== 'hot' && t !== 'cold'), 'hot'];
      } else if (value === 'cold_lead') {
        const lead = items.find(l => l._id === leadId);
        updateData.tags = [...(lead?.tags || []).filter(t => t !== 'hot' && t !== 'cold'), 'cold'];
      }

      const { data } = await crm.put(`/crm/leads/${leadId}`, updateData);
      if (data.success) {
        setItems(prev => prev.map(l => l._id === leadId ? { ...l, ...data.lead } : l));
        toast.success('Status updated');
      }
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const saveRemarks = async () => {
    if (!remarksModal) return;
    try {
      const { data } = await crm.put(`/crm/leads/${remarksModal}`, { notes: remarksText });
      if (data.success) {
        setItems(prev => prev.map(l => l._id === remarksModal ? { ...l, notes: remarksText } : l));
        toast.success('Remarks saved');
      }
      setRemarksModal(null);
    } catch (err) {
      toast.error('Failed to save remarks');
    }
  };

  return (
    <AdminLayout>
      <div className="crm-container">
        <div className="crm-header">
          <h1>New Enquiries</h1>
          <p className="muted">Website and FAQ enquiries (latest 50)</p>
        </div>
        {loading ? (
          <div className="ph-banner" role="status">Loading...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Interest</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Action</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((l) => {
                  const statusInfo = getStatusStyle(l);
                  return (
                    <tr key={l._id}>
                      <td><strong>{l.name}</strong></td>
                      <td>{l.mobile || ''}</td>
                      <td>{l.email || ''}</td>
                      <td>{l.courseInterest || ''}</td>
                      <td>{l.source || ''}</td>
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
                {items.length === 0 && (
                  <tr><td colSpan={8} className="muted" style={{ textAlign: 'center', padding: '40px' }}>No enquiries</td></tr>
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
                  placeholder="Add notes about this enquiry..."
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

export default NewEnquiries;
