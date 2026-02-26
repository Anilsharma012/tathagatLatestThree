import React, { useState, useEffect } from 'react';
import AdminLayout from '../AdminLayout/AdminLayout';
import axios from 'axios';
import { FaUserPlus, FaSearch, FaFileInvoice, FaCheckCircle, FaTimesCircle, FaHistory, FaChevronDown, FaChevronUp, FaPlus, FaRupeeSign, FaBookOpen } from 'react-icons/fa';
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

const formatINR = (n) => Number(n || 0).toLocaleString('en-IN');

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

  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const [addPaymentFor, setAddPaymentFor] = useState(null);
  const [addPaymentForm, setAddPaymentForm] = useState({
    paymentMethod: 'cash', amount: '', referenceNumber: '', paymentNote: ''
  });
  const [addPaymentLoading, setAddPaymentLoading] = useState(false);

  const [paymentHistory, setPaymentHistory] = useState([]);
  const [previouslyPaid, setPreviouslyPaid] = useState(0);

  const token = localStorage.getItem('adminToken');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (activeTab === 'ledger') fetchLedger();
  }, [activeTab, ledgerPage]);

  useEffect(() => {
    if (form.phone && form.phone.length === 10 && form.courseId && phoneChecked) {
      fetchPaymentHistory();
    } else {
      setPaymentHistory([]);
      setPreviouslyPaid(0);
    }
  }, [form.phone, form.courseId, phoneChecked]);

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

  const fetchLedger = async () => {
    setLedgerLoading(true);
    try {
      const res = await axios.get('/api/offline-admissions/student-ledger', {
        headers,
        params: { page: ledgerPage, limit: 20, search: searchTerm }
      });
      if (res.data.success) {
        setLedger(res.data.ledger);
        setLedgerTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
    }
    setLedgerLoading(false);
  };

  const fetchPaymentHistory = async () => {
    try {
      const res = await axios.get('/api/offline-admissions/payment-history', {
        headers,
        params: { phone: form.phone, courseId: form.courseId }
      });
      if (res.data.success) {
        setPaymentHistory(res.data.payments || []);
        setPreviouslyPaid(res.data.totalPaid || 0);
      }
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
    }
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
    setPaymentHistory([]);
    setPreviouslyPaid(0);
  };

  const toggleExpand = (key) => {
    setExpandedRow(expandedRow === key ? null : key);
    setAddPaymentFor(null);
  };

  const openAddPayment = (entry) => {
    setAddPaymentFor(`${entry.userId}_${entry.courseId}`);
    setAddPaymentForm({
      paymentMethod: 'cash',
      amount: entry.remainingBalance > 0 ? entry.remainingBalance.toString() : '',
      referenceNumber: '',
      paymentNote: ''
    });
  };

  const handleAddPayment = async (entry) => {
    if (!addPaymentForm.amount || Number(addPaymentForm.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setAddPaymentLoading(true);
    try {
      const res = await axios.post('/api/offline-admissions/add-payment', {
        userId: entry.userId,
        courseId: entry.courseId,
        paymentMethod: addPaymentForm.paymentMethod,
        amount: addPaymentForm.amount,
        referenceNumber: addPaymentForm.referenceNumber,
        paymentNote: addPaymentForm.paymentNote,
      }, { headers });

      if (res.data.success) {
        alert(`Payment of \u20B9${formatINR(addPaymentForm.amount)} recorded! Invoice: ${res.data.data.invoiceNumber}`);
        setAddPaymentFor(null);
        fetchLedger();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    }
    setAddPaymentLoading(false);
  };

  const selectedCourse = courses.find(c => c._id === form.courseId);

  const extractMethodFromNotes = (notes) => {
    if (!notes) return '-';
    const match = notes.match(/Method:\s*(\w+)/);
    return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : '-';
  };

  const extractRefFromNotes = (notes) => {
    if (!notes) return '';
    const match = notes.match(/Ref:\s*([^|]+)/);
    return match ? match[1].trim() : '';
  };

  if (successData) {
    return (
      <AdminLayout>
        <div className="oa-container">
          <div className="oa-success-card">
            <div className="oa-success-icon">
              <FaCheckCircle />
            </div>
            <h2>Payment Recorded Successfully!</h2>
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
              {successData.invoiceNumber && (
                <div className="oa-detail-row">
                  <span>Invoice No.</span>
                  <strong>{successData.invoiceNumber}</strong>
                </div>
              )}
              <div className="oa-detail-row">
                <span>Total Paid</span>
                <strong>&#8377;{successData.totalPaid?.toLocaleString('en-IN')}</strong>
              </div>
              {successData.remainingBalance > 0 && (
                <div className="oa-detail-row" style={{ color: '#e74c3c' }}>
                  <span>Remaining Balance</span>
                  <strong>&#8377;{successData.remainingBalance?.toLocaleString('en-IN')}</strong>
                </div>
              )}
              {successData.remainingBalance === 0 && (
                <div className="oa-detail-row" style={{ color: '#27ae60' }}>
                  <span>Status</span>
                  <strong>Fully Paid</strong>
                </div>
              )}
              <div className="oa-detail-row">
                <span>Enrollment</span>
                <strong>{successData.isNewUser ? 'New Student Created & Enrolled' : 'Student Enrolled'}</strong>
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
          <p>Add students, record payments, and generate invoices</p>
        </div>

        <div className="oa-tabs">
          <button
            className={`oa-tab ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            New Admission / Payment
          </button>
          <button
            className={`oa-tab ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            Payment Records
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
                    {selectedCourse.studyMaterialPrice > 0 && (
                      <div className="oa-course-detail">
                        <span>Study Material:</span>
                        <strong>&#8377;{selectedCourse.studyMaterialPrice?.toLocaleString('en-IN')} (No GST)</strong>
                      </div>
                    )}
                    {selectedCourse.tuitionFeesPrice > 0 && (
                      <div className="oa-course-detail">
                        <span>Tuition Fees:</span>
                        <strong>&#8377;{selectedCourse.tuitionFeesPrice?.toLocaleString('en-IN')} (With GST)</strong>
                      </div>
                    )}
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

              {paymentHistory.length > 0 && (
                <div className="oa-payment-history">
                  <h4><FaHistory style={{ marginRight: 6 }} /> Previous Payments for this Course</h4>
                  <div className="oa-history-summary">
                    <span>Total Previously Paid:</span>
                    <strong>&#8377;{previouslyPaid.toLocaleString('en-IN')}</strong>
                    {selectedCourse && (
                      <>
                        <span style={{ marginLeft: 20 }}>Remaining:</span>
                        <strong style={{ color: (selectedCourse.price - previouslyPaid) > 0 ? '#e74c3c' : '#27ae60' }}>
                          &#8377;{Math.max(0, selectedCourse.price - previouslyPaid).toLocaleString('en-IN')}
                        </strong>
                      </>
                    )}
                  </div>
                  <table className="oa-history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Invoice</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map(p => (
                        <tr key={p._id}>
                          <td>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                          <td>&#8377;{p.amount?.toLocaleString('en-IN')}</td>
                          <td>{p.invoiceNumber ? p.invoiceNumber : p.receiptNumber || '-'}</td>
                          <td>
                            <button type="button" className="oa-btn-sm" onClick={() => openInvoice(p._id)}>
                              <FaFileInvoice /> Invoice
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                  {previouslyPaid > 0 && selectedCourse && (
                    <span className="oa-field-hint">
                      Remaining balance: &#8377;{Math.max(0, selectedCourse.price - previouslyPaid).toLocaleString('en-IN')}
                    </span>
                  )}
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
                {loading ? 'Processing...' : (paymentHistory.length > 0 ? 'Record Additional Payment' : 'Add Student & Record Payment')}
              </button>
              <button type="button" className="oa-btn oa-btn-secondary" onClick={resetForm}>
                Reset
              </button>
            </div>
          </form>
        )}

        {activeTab === 'ledger' && (
          <div className="oa-ledger-section">
            <div className="oa-list-header">
              <div className="oa-search-box">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search by name, phone, course..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchLedger()}
                />
                <button onClick={fetchLedger}>Search</button>
              </div>
            </div>

            {ledgerLoading ? (
              <div className="oa-loading">Loading...</div>
            ) : ledger.length === 0 ? (
              <div className="oa-empty">No payment records found</div>
            ) : (
              <>
                <div className="oa-ledger-list">
                  {ledger.map(entry => {
                    const key = `${entry.userId}_${entry.courseId}`;
                    const isExpanded = expandedRow === key;
                    const isAddingPayment = addPaymentFor === key;

                    return (
                      <div key={key} className={`oa-ledger-card ${isExpanded ? 'expanded' : ''}`}>
                        <div className="oa-ledger-card-header" onClick={() => toggleExpand(key)}>
                          <div className="oa-ledger-student">
                            <strong>{entry.studentName}</strong>
                            <span>{entry.studentPhone}</span>
                          </div>
                          <div className="oa-ledger-course">
                            <span className="oa-ledger-course-name">{entry.courseName}</span>
                          </div>
                          <div className="oa-ledger-amounts">
                            <div className="oa-ledger-amount-item">
                              <span className="oa-ledger-label">Fee</span>
                              <strong>&#8377;{formatINR(entry.effectiveFee || entry.coursePrice)}</strong>
                            </div>
                            <div className="oa-ledger-amount-item paid">
                              <span className="oa-ledger-label">Paid</span>
                              <strong>&#8377;{formatINR(entry.totalPaid)}</strong>
                            </div>
                            <div className={`oa-ledger-amount-item ${entry.remainingBalance > 0 ? 'pending' : 'done'}`}>
                              <span className="oa-ledger-label">Pending</span>
                              <strong>&#8377;{formatINR(entry.remainingBalance)}</strong>
                            </div>
                          </div>
                          <div className={`oa-ledger-status ${entry.paymentStatus}`}>
                            {entry.paymentStatus === 'fully_paid' ? 'Paid' : 'Partial'}
                          </div>
                          <div className="oa-ledger-expand">
                            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="oa-ledger-detail">
                            <div className="oa-ledger-detail-grid">
                              <div className="oa-ledger-info-card">
                                <h4><FaBookOpen style={{ marginRight: 6 }} /> Course Fee Breakdown</h4>
                                <div className="oa-info-row">
                                  <span>Course MRP</span>
                                  <strong>&#8377;{formatINR(entry.coursePrice)}</strong>
                                </div>
                                {entry.discountApplied > 0 && (
                                  <div className="oa-info-row" style={{ color: '#2e7d32' }}>
                                    <span>Discount {entry.couponUsed ? `(${entry.couponUsed})` : ''}</span>
                                    <strong>- &#8377;{formatINR(entry.discountApplied)}</strong>
                                  </div>
                                )}
                                {entry.discountApplied > 0 && (
                                  <div className="oa-info-row" style={{ fontWeight: 600 }}>
                                    <span>Effective Fee</span>
                                    <strong style={{ color: '#1a237e' }}>&#8377;{formatINR(entry.effectiveFee)}</strong>
                                  </div>
                                )}
                                {entry.studyMaterialPrice > 0 && (
                                  <div className="oa-info-row">
                                    <span>Study Material (HSN 4901 - No GST)</span>
                                    <strong>&#8377;{formatINR(entry.studyMaterialPrice)}</strong>
                                  </div>
                                )}
                                {entry.tuitionFeesPrice > 0 && (
                                  <div className="oa-info-row">
                                    <span>Tuition Fees (HSN 999293 - 18% GST)</span>
                                    <strong>&#8377;{formatINR(entry.tuitionFeesPrice)}</strong>
                                  </div>
                                )}
                                {entry.studyMaterialPrice === 0 && entry.tuitionFeesPrice === 0 && (
                                  <div className="oa-info-row" style={{color: '#999', fontStyle: 'italic'}}>
                                    <span>Split pricing not configured for this course</span>
                                  </div>
                                )}
                              </div>

                              <div className="oa-ledger-info-card">
                                <h4><FaRupeeSign style={{ marginRight: 6 }} /> Payment Summary</h4>
                                <div className="oa-info-row">
                                  <span>Total Paid ({entry.paymentCount} payment{entry.paymentCount > 1 ? 's' : ''})</span>
                                  <strong style={{ color: '#2e7d32' }}>&#8377;{formatINR(entry.totalPaid)}</strong>
                                </div>
                                <div className="oa-info-row">
                                  <span>Remaining Balance</span>
                                  <strong style={{ color: entry.remainingBalance > 0 ? '#e74c3c' : '#2e7d32' }}>
                                    &#8377;{formatINR(entry.remainingBalance)}
                                  </strong>
                                </div>
                                <div className="oa-info-row">
                                  <span>Status</span>
                                  <strong style={{ color: entry.paymentStatus === 'fully_paid' ? '#2e7d32' : '#f57c00' }}>
                                    {entry.paymentStatus === 'fully_paid' ? 'Fully Paid' : 'Partial Payment'}
                                  </strong>
                                </div>
                                {entry.studentEmail && (
                                  <div className="oa-info-row">
                                    <span>Email</span>
                                    <strong>{entry.studentEmail}</strong>
                                  </div>
                                )}
                                {entry.studentCity && (
                                  <div className="oa-info-row">
                                    <span>City</span>
                                    <strong>{entry.studentCity}{entry.studentState ? `, ${entry.studentState}` : ''}</strong>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="oa-ledger-payments-section">
                              <div className="oa-ledger-payments-header">
                                <h4><FaHistory style={{ marginRight: 6 }} /> Payment History</h4>
                                {entry.remainingBalance > 0 && (
                                  <button
                                    className="oa-btn oa-btn-add-payment"
                                    onClick={(e) => { e.stopPropagation(); openAddPayment(entry); }}
                                  >
                                    <FaPlus /> Add Payment
                                  </button>
                                )}
                              </div>

                              <table className="oa-ledger-payments-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Reference</th>
                                    <th>Invoice</th>
                                    <th>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entry.payments.map((p, idx) => (
                                    <tr key={p._id}>
                                      <td>{idx + 1}</td>
                                      <td>{new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                      <td><strong>&#8377;{formatINR(p.amount)}</strong></td>
                                      <td>{extractMethodFromNotes(p.notes)}</td>
                                      <td>{extractRefFromNotes(p.notes) || '-'}</td>
                                      <td>{p.invoiceNumber ? `${entry.invoicePrefix || 'STX'}${p.invoiceNumber}` : (p.receiptNumber || '-')}</td>
                                      <td>
                                        <button className="oa-btn-sm" onClick={() => openInvoice(p._id)}>
                                          <FaFileInvoice /> Invoice
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {isAddingPayment && (
                              <div className="oa-add-payment-section">
                                <h4><FaPlus style={{ marginRight: 6 }} /> Record New Payment</h4>
                                <div className="oa-add-payment-grid">
                                  <div className="oa-field">
                                    <label>Amount (&#8377;) <span className="req">*</span></label>
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder="Amount"
                                      value={addPaymentForm.amount}
                                      onChange={e => setAddPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                                    />
                                  </div>
                                  <div className="oa-field">
                                    <label>Payment Method <span className="req">*</span></label>
                                    <select
                                      value={addPaymentForm.paymentMethod}
                                      onChange={e => setAddPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                    >
                                      {PAYMENT_METHODS.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="oa-field">
                                    <label>Reference / Transaction No.</label>
                                    <input
                                      type="text"
                                      placeholder="UTR, Cheque No, etc."
                                      value={addPaymentForm.referenceNumber}
                                      onChange={e => setAddPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                                    />
                                  </div>
                                  <div className="oa-field">
                                    <label>Note</label>
                                    <input
                                      type="text"
                                      placeholder="Any note"
                                      value={addPaymentForm.paymentNote}
                                      onChange={e => setAddPaymentForm(prev => ({ ...prev, paymentNote: e.target.value }))}
                                    />
                                  </div>
                                </div>
                                <div className="oa-add-payment-actions">
                                  <button
                                    className="oa-btn oa-btn-primary"
                                    disabled={addPaymentLoading}
                                    onClick={() => handleAddPayment(entry)}
                                  >
                                    {addPaymentLoading ? 'Recording...' : 'Record Payment'}
                                  </button>
                                  <button
                                    className="oa-btn oa-btn-secondary"
                                    onClick={() => setAddPaymentFor(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {ledgerTotalPages > 1 && (
                  <div className="oa-pagination">
                    <button
                      disabled={ledgerPage === 1}
                      onClick={() => setLedgerPage(p => p - 1)}
                    >
                      Previous
                    </button>
                    <span>Page {ledgerPage} of {ledgerTotalPages}</span>
                    <button
                      disabled={ledgerPage === ledgerTotalPages}
                      onClick={() => setLedgerPage(p => p + 1)}
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
