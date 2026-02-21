import React, { useState, useEffect } from 'react';
import AdminLayout from '../AdminLayout/AdminLayout';
import axios from 'axios';
import { FaUserPlus, FaSearch, FaFileInvoice, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './OfflineAdmission.css';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card (Debit/Credit)' },
  { value: 'bank_transfer', label: 'Bank Transfer / NEFT / RTGS' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
];

const OfflineAdmission = () => {
  const [activeTab, setActiveTab] = useState('form');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [existingUser, setExistingUser] = useState(null);
  const [phoneChecked, setPhoneChecked] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', city: '', state: '', gender: '', dob: '',
    courseId: '', paymentMethod: 'cash', amount: '', referenceNumber: '', paymentNote: '',
    couponCode: ''
  });

  const [couponStatus, setCouponStatus] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [successData, setSuccessData] = useState(null);

  const [admissions, setAdmissions] = useState([]);
  const [admissionsLoading, setAdmissionsLoading] = useState(false);
  const [admissionsPage, setAdmissionsPage] = useState(1);
  const [admissionsTotalPages, setAdmissionsTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const token = localStorage.getItem('adminToken');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (activeTab === 'list') fetchAdmissions();
  }, [activeTab, admissionsPage]);

  const fetchCourses = async () => {
    try {
      const res = await axios.get('/api/courses', { headers });
      if (res.data.success || res.data.courses) {
        setCourses(res.data.courses || []);
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  };

  const fetchAdmissions = async () => {
    setAdmissionsLoading(true);
    try {
      const res = await axios.get('/api/offline-admissions', {
        headers,
        params: { page: admissionsPage, limit: 20, search: searchTerm }
      });
      if (res.data.success) {
        setAdmissions(res.data.admissions);
        setAdmissionsTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch admissions:', err);
    }
    setAdmissionsLoading(false);
  };

  const checkExistingUser = async () => {
    if (!form.phone || form.phone.length !== 10) return;
    try {
      const res = await axios.get(`/api/admin/all-users-list?search=${form.phone}&limit=5`, { headers });
      if (res.data.users && res.data.users.length > 0) {
        const u = res.data.users[0];
        if (u.phoneNumber === form.phone) {
          setExistingUser(u);
          setForm(prev => ({
            ...prev,
            name: u.name || prev.name,
            email: u.email || prev.email,
            city: u.city || prev.city,
            state: u.state || prev.state,
            gender: u.gender || prev.gender,
          }));
        } else {
          setExistingUser(null);
        }
      } else {
        setExistingUser(null);
      }
      setPhoneChecked(true);
    } catch (err) {
      setExistingUser(null);
      setPhoneChecked(true);
    }
  };

  const handleCourseChange = (courseId) => {
    setForm(prev => ({ ...prev, courseId }));
    const course = courses.find(c => c._id === courseId);
    if (course) {
      let price = course.price || 0;
      if (couponDiscount > 0) {
        price = Math.round(price - (price * couponDiscount / 100));
      }
      setForm(prev => ({ ...prev, amount: price.toString() }));
    }
    setCouponStatus(null);
    setCouponDiscount(0);
    setForm(prev => ({ ...prev, couponCode: '' }));
  };

  const applyCoupon = async () => {
    if (!form.couponCode.trim() || !form.courseId) {
      setCouponStatus({ type: 'error', message: 'Enter a coupon code and select a course first' });
      return;
    }
    try {
      const res = await axios.get('/api/coupons/all', { headers });
      if (res.data.success) {
        const coupon = res.data.coupons?.find(c => c.code === form.couponCode.toUpperCase().trim() && c.isActive);
        if (!coupon) {
          setCouponStatus({ type: 'error', message: 'Invalid or inactive coupon code' });
          setCouponDiscount(0);
          return;
        }
        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
          setCouponStatus({ type: 'error', message: 'This coupon has expired' });
          setCouponDiscount(0);
          return;
        }
        if (coupon.applicableTo === 'specific') {
          const courseIds = coupon.courses?.map(c => c._id || c) || [];
          if (!courseIds.includes(form.courseId)) {
            setCouponStatus({ type: 'error', message: 'Coupon not applicable for this course' });
            setCouponDiscount(0);
            return;
          }
        }
        const discount = coupon.discountPercent;
        setCouponDiscount(discount);
        setCouponStatus({ type: 'success', message: `${discount}% discount applied!` });
        const course = courses.find(c => c._id === form.courseId);
        if (course) {
          const newPrice = Math.round(course.price - (course.price * discount / 100));
          setForm(prev => ({ ...prev, amount: newPrice.toString() }));
        }
      }
    } catch (err) {
      setCouponStatus({
        type: 'error',
        message: err.response?.data?.message || 'Failed to validate coupon'
      });
      setCouponDiscount(0);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setCouponStatus(null);
    const course = courses.find(c => c._id === form.courseId);
    if (course) {
      setForm(prev => ({ ...prev, amount: course.price.toString(), couponCode: '' }));
    } else {
      setForm(prev => ({ ...prev, couponCode: '' }));
    }
  };

  const setCouponCode = (val) => {
    setForm(prev => ({ ...prev, couponCode: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!form.name || !form.phone || !form.courseId || !form.amount || !form.paymentMethod) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      setLoading(false);
      return;
    }

    if (!/^\d{10}$/.test(form.phone)) {
      setMessage({ type: 'error', text: 'Phone number must be 10 digits' });
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post('/api/offline-admissions', form, { headers });
      if (res.data.success) {
        setSuccessData(res.data.data);
        setMessage({ type: 'success', text: res.data.message });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to process admission'
      });
    }
    setLoading(false);
  };

  const openInvoice = (paymentId) => {
    const adminToken = localStorage.getItem('adminToken');
    window.open(`/api/offline-admissions/invoice/${paymentId}?token=${adminToken}`, '_blank');
  };

  const resetForm = () => {
    setForm({
      name: '', phone: '', email: '', city: '', state: '', gender: '', dob: '',
      courseId: '', paymentMethod: 'cash', amount: '', referenceNumber: '', paymentNote: '',
      couponCode: ''
    });
    setSuccessData(null);
    setMessage(null);
    setExistingUser(null);
    setPhoneChecked(false);
    setCouponStatus(null);
    setCouponDiscount(0);
  };

  const selectedCourse = courses.find(c => c._id === form.courseId);

  if (successData) {
    return (
      <AdminLayout>
        <div className="oa-container">
          <div className="oa-success-card">
            <div className="oa-success-icon">
              <FaCheckCircle />
            </div>
            <h2>Admission Successful!</h2>
            <p className="oa-success-msg">{message?.text}</p>

            <div className="oa-success-details">
              <div className="oa-detail-row">
                <span>Student</span>
                <strong>{successData.studentName}</strong>
              </div>
              <div className="oa-detail-row">
                <span>Phone</span>
                <strong>{successData.studentPhone}</strong>
              </div>
              <div className="oa-detail-row">
                <span>Course</span>
                <strong>{successData.courseName}</strong>
              </div>
              <div className="oa-detail-row">
                <span>Amount Paid</span>
                <strong>&#8377;{successData.amountPaid?.toLocaleString('en-IN')}</strong>
              </div>
              <div className="oa-detail-row">
                <span>Receipt</span>
                <strong>{successData.receiptNumber}</strong>
              </div>
              <div className="oa-detail-row">
                <span>Status</span>
                <strong>{successData.isNewUser ? 'New Student Created & Enrolled' : 'Existing Student Enrolled'}</strong>
              </div>
            </div>

            <div className="oa-success-actions">
              <button className="oa-btn oa-btn-primary" onClick={() => openInvoice(successData.paymentId)}>
                <FaFileInvoice /> View / Download Invoice
              </button>
              <button className="oa-btn oa-btn-secondary" onClick={resetForm}>
                <FaUserPlus /> New Admission
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="oa-container">
        <div className="oa-header">
          <h1><FaUserPlus style={{ marginRight: 10 }} /> Offline Admission</h1>
          <p>Add students and record payments directly from the admin panel</p>
        </div>

        <div className="oa-tabs">
          <button
            className={`oa-tab ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            New Admission
          </button>
          <button
            className={`oa-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Recent Admissions
          </button>
        </div>

        {activeTab === 'form' && (
          <form onSubmit={handleSubmit} className="oa-form">
            {message && (
              <div className={`oa-message ${message.type}`}>{message.text}</div>
            )}

            <div className="oa-section">
              <h3>Student Details</h3>
              <div className="oa-form-grid">
                <div className="oa-field phone-field">
                  <label>Phone Number <span className="req">*</span></label>
                  <div className="oa-phone-input">
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="10 digit number"
                      value={form.phone}
                      onChange={e => {
                        setForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }));
                        setPhoneChecked(false);
                        setExistingUser(null);
                      }}
                    />
                    <button type="button" className="oa-btn-check" onClick={checkExistingUser}>
                      <FaSearch /> Check
                    </button>
                  </div>
                  {phoneChecked && existingUser && (
                    <span className="oa-phone-status existing">Existing student: {existingUser.name}</span>
                  )}
                  {phoneChecked && !existingUser && form.phone.length === 10 && (
                    <span className="oa-phone-status new">New student - will be created</span>
                  )}
                </div>

                <div className="oa-field">
                  <label>Full Name <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="Student's full name"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="oa-field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="oa-field">
                  <label>City</label>
                  <input
                    type="text"
                    placeholder="City"
                    value={form.city}
                    onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>

                <div className="oa-field">
                  <label>State</label>
                  <select
                    value={form.state}
                    onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="oa-field">
                  <label>Gender</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="oa-field">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={e => setForm(prev => ({ ...prev, dob: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="oa-section">
              <h3>Course Selection</h3>
              <div className="oa-form-grid">
                <div className="oa-field full-width">
                  <label>Select Course <span className="req">*</span></label>
                  <select
                    value={form.courseId}
                    onChange={e => handleCourseChange(e.target.value)}
                    required
                  >
                    <option value="">-- Select a Course --</option>
                    {courses.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} - &#8377;{c.price?.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCourse && (
                  <div className="oa-course-info">
                    <div className="oa-course-detail">
                      <span>Course Price:</span>
                      <strong>&#8377;{selectedCourse.price?.toLocaleString('en-IN')}</strong>
                    </div>
                    {selectedCourse.validityMonths && (
                      <div className="oa-course-detail">
                        <span>Validity:</span>
                        <strong>{selectedCourse.validityMonths} months</strong>
                      </div>
                    )}
                    {selectedCourse.courseType && (
                      <div className="oa-course-detail">
                        <span>Type:</span>
                        <strong>{selectedCourse.courseType.replace(/_/g, ' ')}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="oa-section">
              <h3>Payment Details</h3>
              <div className="oa-form-grid">
                <div className="oa-field">
                  <label>Payment Method <span className="req">*</span></label>
                  <select
                    value={form.paymentMethod}
                    onChange={e => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    required
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="oa-field">
                  <label>Amount (&#8377;) <span className="req">*</span></label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount in Rupees"
                    value={form.amount}
                    onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>

                <div className="oa-field">
                  <label>Reference / Transaction Number</label>
                  <input
                    type="text"
                    placeholder="UTR, Cheque No, Transaction ID"
                    value={form.referenceNumber}
                    onChange={e => setForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  />
                </div>

                <div className="oa-field">
                  <label>Payment Note</label>
                  <input
                    type="text"
                    placeholder="Any additional note"
                    value={form.paymentNote}
                    onChange={e => setForm(prev => ({ ...prev, paymentNote: e.target.value }))}
                  />
                </div>

                <div className="oa-field coupon-field">
                  <label>Coupon Code</label>
                  <div className="oa-coupon-input">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={form.couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      disabled={couponDiscount > 0}
                    />
                    {couponDiscount > 0 ? (
                      <button type="button" className="oa-btn-coupon remove" onClick={removeCoupon}>
                        <FaTimesCircle /> Remove
                      </button>
                    ) : (
                      <button type="button" className="oa-btn-coupon apply" onClick={applyCoupon}>
                        Apply
                      </button>
                    )}
                  </div>
                  {couponStatus && (
                    <span className={`oa-coupon-status ${couponStatus.type}`}>
                      {couponStatus.message}
                    </span>
                  )}
                </div>
              </div>

              {form.amount && (
                <div className="oa-amount-summary">
                  {couponDiscount > 0 && selectedCourse && (
                    <>
                      <div className="oa-summary-row">
                        <span>Original Price:</span>
                        <span>&#8377;{selectedCourse.price?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="oa-summary-row discount">
                        <span>Discount ({couponDiscount}%):</span>
                        <span>- &#8377;{Math.round(selectedCourse.price * couponDiscount / 100).toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )}
                  <div className="oa-summary-row total">
                    <span>Amount to Collect:</span>
                    <span>&#8377;{Number(form.amount).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="oa-form-actions">
              <button type="submit" className="oa-btn oa-btn-primary" disabled={loading}>
                {loading ? 'Processing...' : 'Add Student & Record Payment'}
              </button>
              <button type="button" className="oa-btn oa-btn-secondary" onClick={resetForm}>
                Reset
              </button>
            </div>
          </form>
        )}

        {activeTab === 'list' && (
          <div className="oa-list-section">
            <div className="oa-list-header">
              <div className="oa-search-box">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search by name, phone, course..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchAdmissions()}
                />
                <button onClick={fetchAdmissions}>Search</button>
              </div>
            </div>

            {admissionsLoading ? (
              <div className="oa-loading">Loading...</div>
            ) : admissions.length === 0 ? (
              <div className="oa-empty">No offline admissions found</div>
            ) : (
              <>
                <div className="oa-table-wrapper">
                  <table className="oa-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Student</th>
                        <th>Phone</th>
                        <th>Course</th>
                        <th>Amount</th>
                        <th>Receipt</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admissions.map(a => (
                        <tr key={a._id}>
                          <td>{new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td>{a.userId?.name || '-'}</td>
                          <td>{a.userId?.phoneNumber || '-'}</td>
                          <td>{a.courseId?.name || '-'}</td>
                          <td>&#8377;{(a.amount / 100).toLocaleString('en-IN')}</td>
                          <td>{a.receiptNumber || '-'}</td>
                          <td>
                            <button className="oa-btn-invoice" onClick={() => openInvoice(a._id)}>
                              <FaFileInvoice /> Invoice
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {admissionsTotalPages > 1 && (
                  <div className="oa-pagination">
                    <button
                      disabled={admissionsPage <= 1}
                      onClick={() => setAdmissionsPage(prev => prev - 1)}
                    >
                      Previous
                    </button>
                    <span>Page {admissionsPage} of {admissionsTotalPages}</span>
                    <button
                      disabled={admissionsPage >= admissionsTotalPages}
                      onClick={() => setAdmissionsPage(prev => prev + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default OfflineAdmission;
