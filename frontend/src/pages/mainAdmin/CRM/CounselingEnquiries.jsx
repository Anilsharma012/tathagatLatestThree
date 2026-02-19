import React, { useState, useEffect } from 'react';
import AdminLayout from '../AdminLayout/AdminLayout';
import axios from 'axios';
import { toast } from 'react-toastify';
import './crm.css';

const enquiryStatuses = [
  { value: 'pending', label: 'Pending', color: '#d97706', bg: '#fef3c7' },
  { value: 'contacted', label: 'Contacted', color: '#0369a1', bg: '#e0f2fe' },
  { value: 'hot_lead', label: 'Hot Lead', color: '#dc2626', bg: '#fee2e2' },
  { value: 'cold_lead', label: 'Cold Lead', color: '#475569', bg: '#e2e8f0' },
  { value: 'response_pending', label: 'Response Pending', color: '#d97706', bg: '#fff7ed' },
  { value: 'follow_up', label: 'Follow Up', color: '#7c3aed', bg: '#ede9fe' },
  { value: 'not_interested', label: 'Not Interested', color: '#9ca3af', bg: '#f3f4f6' },
  { value: 'converted', label: 'Converted', color: '#16a34a', bg: '#dcfce7' },
  { value: 'closed', label: 'Closed', color: '#ef4444', bg: '#fee2e2' }
];

const getStatusInfo = (status) => {
  return enquiryStatuses.find(s => s.value === status) || enquiryStatuses[0];
};

const CounselingEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [remarksModal, setRemarksModal] = useState(null);
  const [remarksText, setRemarksText] = useState('');

  const getToken = () => localStorage.getItem('adminToken') || localStorage.getItem('token');

  const fetchEnquiries = async () => {
    try {
      const token = getToken();
      const { data } = await axios.get('/api/enquiries', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setEnquiries(data.enquiries);
      }
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      toast.error('Failed to fetch enquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = getToken();
      const { data } = await axios.put(`/api/enquiries/${id}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setEnquiries(prev => prev.map(e => e._id === id ? { ...e, status: newStatus } : e));
        toast.success('Status updated');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const saveRemarks = async () => {
    if (!remarksModal) return;
    try {
      const token = getToken();
      const { data } = await axios.put(`/api/enquiries/${remarksModal}`,
        { remarks: remarksText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setEnquiries(prev => prev.map(e => e._id === remarksModal ? { ...e, remarks: remarksText } : e));
        toast.success('Remarks saved');
      }
      setRemarksModal(null);
    } catch (error) {
      toast.error('Failed to save remarks');
    }
  };

  return (
    <AdminLayout>
      <div className="crm-container">
        <div className="crm-header" style={{ marginBottom: '20px' }}>
          <h1>Counseling Enquiries</h1>
          <p className="muted">Enquiries from the "Free Counseling" button on the home page</p>
        </div>
        {loading ? (
          <div className="ph-banner" role="status">Loading...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>City</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Action</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enquiry) => {
                  const statusInfo = getStatusInfo(enquiry.status);
                  return (
                    <tr key={enquiry._id}>
                      <td><strong>{enquiry.name}</strong></td>
                      <td>{enquiry.phone}</td>
                      <td>{enquiry.email}</td>
                      <td>{enquiry.address}</td>
                      <td title={enquiry.message} style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {enquiry.message}
                      </td>
                      <td>
                        <span className="lead-status-badge" style={{
                          background: statusInfo.bg,
                          color: statusInfo.color,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>
                        <div className="action-cell">
                          <select
                            className="action-select"
                            value={enquiry.status || 'pending'}
                            onChange={(e) => handleStatusChange(enquiry._id, e.target.value)}
                          >
                            {enquiryStatuses.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          <button
                            className="remarks-btn"
                            title={enquiry.remarks || 'Add remarks'}
                            onClick={() => { setRemarksModal(enquiry._id); setRemarksText(enquiry.remarks || ''); }}
                          >
                            {enquiry.remarks ? '📝' : '💬'}
                          </button>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{new Date(enquiry.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
                {enquiries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="muted" style={{ textAlign: 'center', padding: '20px' }}>
                      No enquiries found
                    </td>
                  </tr>
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
                  placeholder="Add notes... e.g. Called on 15th, interested in CAT batch..."
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

export default CounselingEnquiries;
