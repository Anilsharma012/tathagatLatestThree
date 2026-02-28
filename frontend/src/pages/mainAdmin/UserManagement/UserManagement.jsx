import React, { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "../AdminLayout/AdminLayout";
import axios from "axios";
import {
  FaUserPlus, FaSearch, FaBookOpen, FaTimes, FaCheck, FaEdit, FaTrash,
  FaBan, FaUnlock, FaUpload, FaDownload, FaEye, FaRupeeSign, FaCheckCircle,
  FaTimesCircle, FaHourglassHalf, FaChevronLeft, FaUsers, FaClock, FaMoneyBillWave
} from "react-icons/fa";
import "./UserManagement.css";

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState(null);
  const [banReason, setBanReason] = useState("");
  const fileInputRef = useRef(null);

  const [newUser, setNewUser] = useState({
    name: "", email: "", phoneNumber: "", gender: "", city: "", state: "",
    selectedCategory: "CAT", selectedExam: "", targetYear: "", dob: "",
  });

  const [editUser, setEditUser] = useState({});

  const [enrollData, setEnrollData] = useState({
    courseId: "", validityMonths: 12,
  });

  const getHeaders = () => {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/admin/all-users-list", {
        headers: getHeaders(),
        params: { search: searchTerm, page, limit: 30 },
      });
      if (res.data.success) {
        setUsers(res.data.users);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page]);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await axios.get("/api/admin/all-courses-list", { headers: getHeaders() });
      if (res.data.success) setCourses(res.data.courses);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    }
  }, []);

  const fetchPendingRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/admin/pending-registrations", {
        headers: getHeaders(),
        params: { search: searchTerm, page, limit: 30 },
      });
      if (res.data.success) {
        setPendingUsers(res.data.users);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch pending:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page]);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/admin/all-payments", {
        headers: getHeaders(),
        params: { status: paymentFilter, search: searchTerm, page, limit: 30 },
      });
      if (res.data.success) {
        setPayments(res.data.payments);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page, paymentFilter]);

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    else if (activeTab === "pending") fetchPendingRegistrations();
    else if (activeTab === "payments") fetchPayments();
  }, [activeTab, fetchUsers, fetchPendingRegistrations, fetchPayments]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  useEffect(() => { setPage(1); }, [activeTab]);

  const fetchUserDetail = async (userId) => {
    try {
      const res = await axios.get(`/api/admin/user-detail/${userId}`, { headers: getHeaders() });
      if (res.data.success) {
        setUserDetail(res.data);
        setShowDetailPanel(true);
      }
    } catch (err) {
      showToast("Failed to load user details", "error");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await axios.post("/api/admin/create-user", newUser, { headers: getHeaders() });
      if (res.data.success) {
        showToast("User created successfully!");
        setShowCreateModal(false);
        setNewUser({ name: "", email: "", phoneNumber: "", gender: "", city: "", state: "", selectedCategory: "CAT", selectedExam: "", targetYear: "", dob: "" });
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create user", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await axios.put(`/api/admin/update-user/${editUser._id}`, editUser, { headers: getHeaders() });
      if (res.data.success) {
        showToast("User updated successfully!");
        setShowEditModal(false);
        fetchUsers();
        if (showDetailPanel && userDetail?.user?._id === editUser._id) {
          fetchUserDetail(editUser._id);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update user", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete "${userName}"? This will also remove all their enrollments and payments.`)) return;
    try {
      const res = await axios.delete(`/api/admin/delete-user/${userId}`, { headers: getHeaders() });
      if (res.data.success) {
        showToast("User deleted successfully");
        fetchUsers();
        if (showDetailPanel && userDetail?.user?._id === userId) setShowDetailPanel(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete user", "error");
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/admin/ban-user/${selectedUser._id}`, { reason: banReason }, { headers: getHeaders() });
      if (res.data.success) {
        showToast("User banned successfully");
        setShowBanModal(false);
        setBanReason("");
        fetchUsers();
      }
    } catch (err) {
      showToast("Failed to ban user", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async (userId) => {
    if (!window.confirm("Unban this user?")) return;
    try {
      const res = await axios.post(`/api/admin/unban-user/${userId}`, {}, { headers: getHeaders() });
      if (res.data.success) {
        showToast("User unbanned successfully");
        fetchUsers();
      }
    } catch (err) {
      showToast("Failed to unban user", "error");
    }
  };

  const handleEnrollUser = async (e) => {
    e.preventDefault();
    if (!selectedUser || !enrollData.courseId) {
      showToast("Please select a course", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.post("/api/admin/enroll-user", {
        userId: selectedUser._id, courseId: enrollData.courseId, validityMonths: enrollData.validityMonths,
      }, { headers: getHeaders() });
      if (res.data.success) {
        showToast(res.data.message);
        setShowEnrollModal(false);
        setEnrollData({ courseId: "", validityMonths: 12 });
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to enroll user", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveEnrollment = async (userId, courseId, courseName) => {
    if (!window.confirm(`Remove enrollment for "${courseName}"?`)) return;
    try {
      const res = await axios.post("/api/admin/remove-enrollment", { userId, courseId }, { headers: getHeaders() });
      if (res.data.success) {
        showToast("Enrollment removed");
        fetchUsers();
        if (showDetailPanel) fetchUserDetail(userId);
      }
    } catch (err) {
      showToast("Failed to remove enrollment", "error");
    }
  };

  const handleApprovePayment = async (paymentId) => {
    if (!window.confirm("Approve this payment and unlock the course?")) return;
    try {
      const res = await axios.put(`/api/admin/approve-payment/${paymentId}`, {}, { headers: getHeaders() });
      if (res.data.success) {
        showToast("Payment approved and course unlocked");
        fetchPayments();
      }
    } catch (err) {
      showToast("Failed to approve payment", "error");
    }
  };

  const handleRejectPayment = async (paymentId) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    try {
      const res = await axios.put(`/api/admin/reject-payment/${paymentId}`, { reason }, { headers: getHeaders() });
      if (res.data.success) {
        showToast("Payment rejected");
        fetchPayments();
      }
    } catch (err) {
      showToast("Failed to reject payment", "error");
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setActionLoading(true);
    setBulkUploadResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post("/api/admin/bulk-upload-users", formData, {
        headers: { ...getHeaders(), "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        setBulkUploadResult(res.data.results);
        showToast(res.data.message);
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Bulk upload failed", "error");
    } finally {
      setActionLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadCsvTemplate = () => {
    const csv = "name,email,phone,gender,city,category,exam\nJohn Doe,john@example.com,9876543210,Male,Mumbai,CAT,CAT 2026\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "user_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const openEnrollModal = (user) => {
    setSelectedUser(user);
    setEnrollData({ courseId: "", validityMonths: 12 });
    setShowEnrollModal(true);
  };

  const openEditModal = (user) => {
    setEditUser({ ...user });
    setShowEditModal(true);
  };

  const openBanModal = (user) => {
    setSelectedUser(user);
    setBanReason("");
    setShowBanModal(true);
  };

  const getEnrolledCourseIds = (user) => {
    return (user.enrolledCourses || [])
      .filter((e) => e.status === "unlocked" && e.courseId)
      .map((e) => (typeof e.courseId === "object" ? e.courseId._id : e.courseId));
  };

  const availableCoursesForUser = selectedUser
    ? courses.filter((c) => !getEnrolledCourseIds(selectedUser).includes(c._id))
    : courses;

  const selectedCourse = enrollData.courseId ? courses.find((c) => c._id === enrollData.courseId) : null;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const formatAmount = (a) => a ? `₹${(a / 100).toLocaleString("en-IN")}` : "—";
  const courseTypeLabel = (t) => {
    const map = { full_course: "Full Course", recorded_classes: "Recorded", mock_tests: "Mock Tests" };
    return map[t] || t || "—";
  };
  const statusBadge = (status) => {
    const map = {
      paid: { cls: "um-status-paid", icon: <FaCheckCircle /> },
      created: { cls: "um-status-pending", icon: <FaHourglassHalf /> },
      pending_offline: { cls: "um-status-pending", icon: <FaHourglassHalf /> },
      failed: { cls: "um-status-failed", icon: <FaTimesCircle /> },
      rejected: { cls: "um-status-failed", icon: <FaTimesCircle /> },
      refunded: { cls: "um-status-refunded", icon: <FaTimesCircle /> },
    };
    const s = map[status] || { cls: "um-status-pending", icon: <FaHourglassHalf /> };
    return <span className={`um-status-badge ${s.cls}`}>{s.icon} {status}</span>;
  };

  return (
    <AdminLayout>
      <div className="um-container">
        {toast && (
          <div className={`um-toast ${toast.type}`}>
            {toast.type === "success" ? <FaCheck /> : <FaTimes />}
            {toast.message}
          </div>
        )}

        <div className="um-header">
          <div>
            <h1>User Management</h1>
            <p>Create users, manage enrollments, payments & registrations</p>
          </div>
          <div className="um-header-actions">
            <button className="um-btn um-btn-outline" onClick={() => setShowBulkUploadModal(true)}>
              <FaUpload /> Bulk Upload
            </button>
            <button className="um-btn um-btn-primary" onClick={() => setShowCreateModal(true)}>
              <FaUserPlus /> Create User
            </button>
          </div>
        </div>

        <div className="um-tabs">
          <button className={`um-tab ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>
            <FaUsers /> All Users
          </button>
          <button className={`um-tab ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>
            <FaClock /> Pending Registration
          </button>
          <button className={`um-tab ${activeTab === "payments" ? "active" : ""}`} onClick={() => setActiveTab("payments")}>
            <FaMoneyBillWave /> Payments
          </button>
        </div>

        <div className="um-filters-row">
          <div className="um-search-bar">
            <FaSearch className="um-search-icon" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>
          {activeTab === "payments" && (
            <select className="um-payment-filter" value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}>
              <option value="">All Payments</option>
              <option value="pending_offline">Pending Approval</option>
              <option value="paid">Paid</option>
              <option value="created">Created</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
              <option value="refunded">Refunded</option>
            </select>
          )}
        </div>

        {loading ? (
          <div className="um-loading"><div className="um-spinner"></div><p>Loading...</p></div>
        ) : (
          <>
            {activeTab === "users" && (
              <div className="um-table-wrapper">
                <table className="um-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Enrolled Courses</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan="7" className="um-empty">No users found</td></tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user._id} className={user.isBanned ? "um-row-banned" : ""}>
                          <td className="um-name um-clickable" onClick={() => fetchUserDetail(user._id)}>
                            {user.name || "—"}
                            {user.isBanned && <span className="um-banned-tag">BANNED</span>}
                          </td>
                          <td>{user.email || "—"}</td>
                          <td>{user.phoneNumber || "—"}</td>
                          <td>{user.selectedExam || "—"}</td>
                          <td>
                            <div className="um-verification-badges">
                              {user.isEmailVerified && <span className="um-v-badge verified">Email</span>}
                              {user.isPhoneVerified && <span className="um-v-badge verified">Phone</span>}
                              {!user.isEmailVerified && !user.isPhoneVerified && <span className="um-v-badge unverified">Unverified</span>}
                            </div>
                          </td>
                          <td>
                            <div className="um-enrolled-list">
                              {(user.enrolledCourses || [])
                                .filter((e) => e.status === "unlocked" && e.courseId)
                                .map((e, i) => {
                                  const course = typeof e.courseId === "object" ? e.courseId : null;
                                  return (
                                    <span key={i} className="um-course-badge">
                                      {course ? course.name : "Course"}
                                      <button className="um-badge-remove" title="Remove" onClick={() => handleRemoveEnrollment(user._id, course ? course._id : e.courseId, course ? course.name : "this course")}>
                                        <FaTimes />
                                      </button>
                                    </span>
                                  );
                                })}
                              {(user.enrolledCourses || []).filter((e) => e.status === "unlocked").length === 0 && (
                                <span className="um-no-courses">No courses</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="um-action-btns">
                              <button className="um-icon-btn um-icon-view" title="View Details" onClick={() => fetchUserDetail(user._id)}><FaEye /></button>
                              <button className="um-icon-btn um-icon-enroll" title="Enroll" onClick={() => openEnrollModal(user)}><FaBookOpen /></button>
                              <button className="um-icon-btn um-icon-edit" title="Edit" onClick={() => openEditModal(user)}><FaEdit /></button>
                              {user.isBanned ? (
                                <button className="um-icon-btn um-icon-unban" title="Unban" onClick={() => handleUnbanUser(user._id)}><FaUnlock /></button>
                              ) : (
                                <button className="um-icon-btn um-icon-ban" title="Ban" onClick={() => openBanModal(user)}><FaBan /></button>
                              )}
                              <button className="um-icon-btn um-icon-delete" title="Delete" onClick={() => handleDeleteUser(user._id, user.name)}><FaTrash /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "pending" && (
              <div className="um-table-wrapper">
                <table className="um-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Email Verified</th>
                      <th>Phone Verified</th>
                      <th>Onboarding</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.length === 0 ? (
                      <tr><td colSpan="7" className="um-empty">No pending registrations</td></tr>
                    ) : (
                      pendingUsers.map((user) => (
                        <tr key={user._id}>
                          <td className="um-name um-clickable" onClick={() => fetchUserDetail(user._id)}>{user.name || "—"}</td>
                          <td>{user.email || "—"}</td>
                          <td>{user.phoneNumber || "—"}</td>
                          <td>{user.isEmailVerified ? <FaCheckCircle className="um-icon-green" /> : <FaTimesCircle className="um-icon-red" />}</td>
                          <td>{user.isPhoneVerified ? <FaCheckCircle className="um-icon-green" /> : <FaTimesCircle className="um-icon-red" />}</td>
                          <td>{user.isOnboardingComplete ? <FaCheckCircle className="um-icon-green" /> : <FaTimesCircle className="um-icon-red" />}</td>
                          <td>{formatDate(user.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "payments" && (
              <div className="um-table-wrapper">
                <table className="um-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Course</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan="7" className="um-empty">No payments found</td></tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p._id}>
                          <td className="um-name">{p.userId?.name || "—"}<br/><small>{p.userId?.email || ""}</small></td>
                          <td>{p.courseId?.name || "—"}</td>
                          <td className="um-amount">{formatAmount(p.amount)}</td>
                          <td>{p.paymentMethod || "—"}</td>
                          <td>{statusBadge(p.status)}</td>
                          <td>{formatDate(p.createdAt)}</td>
                          <td>
                            <div className="um-action-btns">
                              {(p.status === "pending_offline" || p.status === "created") && (
                                <>
                                  <button className="um-icon-btn um-icon-approve" title="Approve" onClick={() => handleApprovePayment(p._id)}><FaCheckCircle /></button>
                                  <button className="um-icon-btn um-icon-reject" title="Reject" onClick={() => handleRejectPayment(p._id)}><FaTimesCircle /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="um-pagination">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <span>Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}

        {showDetailPanel && userDetail && (
          <div className="um-detail-overlay" onClick={() => setShowDetailPanel(false)}>
            <div className="um-detail-panel" onClick={(e) => e.stopPropagation()}>
              <div className="um-detail-header">
                <button className="um-detail-back" onClick={() => setShowDetailPanel(false)}><FaChevronLeft /> Back</button>
                <h2>User Details</h2>
              </div>
              <div className="um-detail-content">
                <div className="um-detail-section">
                  <h3>Personal Information</h3>
                  <div className="um-detail-grid">
                    <div className="um-detail-item"><label>Name</label><span>{userDetail.user.name || "—"}</span></div>
                    <div className="um-detail-item"><label>Email</label><span>{userDetail.user.email || "—"}</span></div>
                    <div className="um-detail-item"><label>Phone</label><span>{userDetail.user.phoneNumber || "—"}</span></div>
                    <div className="um-detail-item"><label>Gender</label><span>{userDetail.user.gender || "—"}</span></div>
                    <div className="um-detail-item"><label>City</label><span>{userDetail.user.city || "—"}</span></div>
                    <div className="um-detail-item"><label>State</label><span>{userDetail.user.state || "—"}</span></div>
                    <div className="um-detail-item"><label>DOB</label><span>{userDetail.user.dob || "—"}</span></div>
                    <div className="um-detail-item"><label>Category</label><span>{userDetail.user.selectedCategory || "—"}</span></div>
                    <div className="um-detail-item"><label>Target Exam</label><span>{userDetail.user.selectedExam || "—"}</span></div>
                    <div className="um-detail-item"><label>Target Year</label><span>{userDetail.user.targetYear || "—"}</span></div>
                    <div className="um-detail-item"><label>Email Verified</label><span>{userDetail.user.isEmailVerified ? "Yes" : "No"}</span></div>
                    <div className="um-detail-item"><label>Phone Verified</label><span>{userDetail.user.isPhoneVerified ? "Yes" : "No"}</span></div>
                    <div className="um-detail-item"><label>Onboarding</label><span>{userDetail.user.isOnboardingComplete ? "Complete" : "Incomplete"}</span></div>
                    <div className="um-detail-item"><label>Status</label><span>{userDetail.user.isBanned ? "Banned" : "Active"}</span></div>
                    <div className="um-detail-item"><label>Registered</label><span>{formatDate(userDetail.user.createdAt)}</span></div>
                  </div>
                </div>

                <div className="um-detail-section">
                  <h3>Enrolled Courses ({(userDetail.user.enrolledCourses || []).filter(e => e.status === "unlocked").length})</h3>
                  {(userDetail.user.enrolledCourses || []).filter(e => e.status === "unlocked" && e.courseId).length === 0 ? (
                    <p className="um-detail-empty">No active enrollments</p>
                  ) : (
                    <div className="um-detail-courses">
                      {(userDetail.user.enrolledCourses || []).filter(e => e.status === "unlocked" && e.courseId).map((e, i) => {
                        const c = typeof e.courseId === "object" ? e.courseId : null;
                        return (
                          <div key={i} className="um-detail-course-card">
                            <div className="um-detail-course-info">
                              <strong>{c?.name || "Course"}</strong>
                              <div className="um-detail-course-meta">
                                {c?.price && <span><FaRupeeSign /> {c.price}</span>}
                                {c?.courseType && <span>{courseTypeLabel(c.courseType)}</span>}
                                {c?.validityMonths && <span>{c.validityMonths} months</span>}
                              </div>
                            </div>
                            <button className="um-btn um-btn-sm um-btn-danger" onClick={() => handleRemoveEnrollment(userDetail.user._id, c?._id || e.courseId, c?.name || "Course")}>
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="um-detail-section">
                  <h3>Payment History ({(userDetail.payments || []).length})</h3>
                  {(userDetail.payments || []).length === 0 ? (
                    <p className="um-detail-empty">No payment records</p>
                  ) : (
                    <div className="um-detail-payments">
                      {(userDetail.payments || []).map((p, i) => (
                        <div key={i} className="um-detail-payment-card">
                          <div className="um-detail-payment-info">
                            <strong>{p.courseId?.name || "Course"}</strong>
                            <div className="um-detail-payment-meta">
                              <span>{formatAmount(p.amount)}</span>
                              <span>{p.paymentMethod}</span>
                              {statusBadge(p.status)}
                              <span>{formatDate(p.createdAt)}</span>
                            </div>
                          </div>
                          {(p.status === "pending_offline" || p.status === "created") && (
                            <div className="um-detail-payment-actions">
                              <button className="um-btn um-btn-sm um-btn-success" onClick={() => handleApprovePayment(p._id)}>Approve</button>
                              <button className="um-btn um-btn-sm um-btn-danger" onClick={() => handleRejectPayment(p._id)}>Reject</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="um-detail-section">
                  <h3>Enrollment Records ({(userDetail.enrollments || []).length})</h3>
                  {(userDetail.enrollments || []).length === 0 ? (
                    <p className="um-detail-empty">No enrollment records</p>
                  ) : (
                    <table className="um-mini-table">
                      <thead>
                        <tr><th>Course</th><th>Status</th><th>Valid Till</th><th>Joined</th></tr>
                      </thead>
                      <tbody>
                        {(userDetail.enrollments || []).map((e, i) => (
                          <tr key={i}>
                            <td>{e.courseId?.name || "—"}</td>
                            <td><span className={`um-e-status ${e.status}`}>{e.status}</span></td>
                            <td>{formatDate(e.validTill)}</td>
                            <td>{formatDate(e.joinedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="um-detail-footer">
                <button className="um-btn um-btn-enroll" onClick={() => { setShowDetailPanel(false); openEnrollModal(userDetail.user); }}><FaBookOpen /> Enroll in Course</button>
                <button className="um-btn um-btn-outline" onClick={() => { setShowDetailPanel(false); openEditModal(userDetail.user); }}><FaEdit /> Edit User</button>
              </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="um-modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="um-modal um-modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="um-modal-header">
                <h2>Create New User</h2>
                <button className="um-modal-close" onClick={() => setShowCreateModal(false)}><FaTimes /></button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="um-form-grid">
                  <div className="um-form-group">
                    <label>Name *</label>
                    <input type="text" required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Full name" />
                  </div>
                  <div className="um-form-group">
                    <label>Email</label>
                    <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email address" />
                  </div>
                  <div className="um-form-group">
                    <label>Phone Number</label>
                    <input type="text" value={newUser.phoneNumber} onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })} placeholder="10-digit phone" maxLength={10} />
                  </div>
                  <div className="um-form-group">
                    <label>Gender</label>
                    <select value={newUser.gender} onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="um-form-group">
                    <label>DOB</label>
                    <input type="date" value={newUser.dob} onChange={(e) => setNewUser({ ...newUser, dob: e.target.value })} />
                  </div>
                  <div className="um-form-group">
                    <label>City</label>
                    <input type="text" value={newUser.city} onChange={(e) => setNewUser({ ...newUser, city: e.target.value })} placeholder="City" />
                  </div>
                  <div className="um-form-group">
                    <label>State</label>
                    <input type="text" value={newUser.state} onChange={(e) => setNewUser({ ...newUser, state: e.target.value })} placeholder="State" />
                  </div>
                  <div className="um-form-group">
                    <label>Category</label>
                    <select value={newUser.selectedCategory} onChange={(e) => setNewUser({ ...newUser, selectedCategory: e.target.value })}>
                      <option value="CAT">CAT</option>
                      <option value="XAT">XAT</option>
                      <option value="SNAP">SNAP</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="um-form-group">
                    <label>Target Exam</label>
                    <input type="text" value={newUser.selectedExam} onChange={(e) => setNewUser({ ...newUser, selectedExam: e.target.value })} placeholder="e.g. CAT 2026" />
                  </div>
                  <div className="um-form-group">
                    <label>Target Year</label>
                    <input type="text" value={newUser.targetYear} onChange={(e) => setNewUser({ ...newUser, targetYear: e.target.value })} placeholder="e.g. 2026" />
                  </div>
                </div>
                <p className="um-form-note">* Name and at least one of email or phone is required. User will verify via OTP on first login.</p>
                <div className="um-modal-actions">
                  <button type="button" className="um-btn um-btn-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="um-btn um-btn-primary" disabled={actionLoading}>{actionLoading ? "Creating..." : "Create User"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && editUser._id && (
          <div className="um-modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="um-modal um-modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="um-modal-header">
                <h2>Edit User</h2>
                <button className="um-modal-close" onClick={() => setShowEditModal(false)}><FaTimes /></button>
              </div>
              <form onSubmit={handleUpdateUser}>
                <div className="um-form-grid">
                  <div className="um-form-group">
                    <label>Name</label>
                    <input type="text" value={editUser.name || ""} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} />
                  </div>
                  <div className="um-form-group">
                    <label>Email</label>
                    <input type="email" value={editUser.email || ""} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
                  </div>
                  <div className="um-form-group">
                    <label>Phone</label>
                    <input type="text" value={editUser.phoneNumber || ""} onChange={(e) => setEditUser({ ...editUser, phoneNumber: e.target.value })} maxLength={10} />
                  </div>
                  <div className="um-form-group">
                    <label>Gender</label>
                    <select value={editUser.gender || ""} onChange={(e) => setEditUser({ ...editUser, gender: e.target.value })}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="um-form-group">
                    <label>DOB</label>
                    <input type="date" value={editUser.dob || ""} onChange={(e) => setEditUser({ ...editUser, dob: e.target.value })} />
                  </div>
                  <div className="um-form-group">
                    <label>City</label>
                    <input type="text" value={editUser.city || ""} onChange={(e) => setEditUser({ ...editUser, city: e.target.value })} />
                  </div>
                  <div className="um-form-group">
                    <label>State</label>
                    <input type="text" value={editUser.state || ""} onChange={(e) => setEditUser({ ...editUser, state: e.target.value })} />
                  </div>
                  <div className="um-form-group">
                    <label>Category</label>
                    <select value={editUser.selectedCategory || ""} onChange={(e) => setEditUser({ ...editUser, selectedCategory: e.target.value })}>
                      <option value="">Select</option>
                      <option value="CAT">CAT</option>
                      <option value="XAT">XAT</option>
                      <option value="SNAP">SNAP</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="um-form-group">
                    <label>Target Exam</label>
                    <input type="text" value={editUser.selectedExam || ""} onChange={(e) => setEditUser({ ...editUser, selectedExam: e.target.value })} />
                  </div>
                  <div className="um-form-group">
                    <label>Target Year</label>
                    <input type="text" value={editUser.targetYear || ""} onChange={(e) => setEditUser({ ...editUser, targetYear: e.target.value })} />
                  </div>
                </div>
                <div className="um-modal-actions">
                  <button type="button" className="um-btn um-btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="um-btn um-btn-primary" disabled={actionLoading}>{actionLoading ? "Saving..." : "Save Changes"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEnrollModal && selectedUser && (
          <div className="um-modal-overlay" onClick={() => setShowEnrollModal(false)}>
            <div className="um-modal" onClick={(e) => e.stopPropagation()}>
              <div className="um-modal-header">
                <h2>Enroll User in Course</h2>
                <button className="um-modal-close" onClick={() => setShowEnrollModal(false)}><FaTimes /></button>
              </div>
              <div className="um-enroll-user-info">
                <strong>{selectedUser.name || "Unnamed"}</strong>
                <span>{selectedUser.email || selectedUser.phoneNumber || ""}</span>
              </div>
              <form onSubmit={handleEnrollUser}>
                <div className="um-form-group">
                  <label>Select Course *</label>
                  <select required value={enrollData.courseId} onChange={(e) => setEnrollData({ ...enrollData, courseId: e.target.value })}>
                    <option value="">-- Select a course --</option>
                    {availableCoursesForUser.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.name} - ₹{course.price} ({courseTypeLabel(course.courseType)})
                      </option>
                    ))}
                  </select>
                  {courses.length === 0 && <p className="um-form-note um-form-warn">No courses available. Please create courses first from the Add Courses section.</p>}
                  {availableCoursesForUser.length === 0 && courses.length > 0 && <p className="um-form-note">All courses are already enrolled</p>}
                </div>

                {selectedCourse && (
                  <div className="um-course-details-card">
                    <h4>{selectedCourse.name}</h4>
                    <div className="um-course-details-grid">
                      <div><label>Price</label><span>₹{selectedCourse.price}</span></div>
                      {selectedCourse.oldPrice && <div><label>Old Price</label><span className="um-old-price">₹{selectedCourse.oldPrice}</span></div>}
                      <div><label>Type</label><span>{courseTypeLabel(selectedCourse.courseType)}</span></div>
                      <div><label>Validity</label><span>{selectedCourse.validityMonths || 12} months</span></div>
                      {selectedCourse.startDate && <div><label>Start Date</label><span>{formatDate(selectedCourse.startDate)}</span></div>}
                      {selectedCourse.endDate && <div><label>End Date</label><span>{formatDate(selectedCourse.endDate)}</span></div>}
                      <div><label>Published</label><span>{selectedCourse.published ? "Yes" : "No"}</span></div>
                      <div><label>Status</label><span>{selectedCourse.isActive ? "Active" : "Inactive"}</span></div>
                    </div>
                  </div>
                )}

                <div className="um-form-group">
                  <label>Validity (Months)</label>
                  <input type="number" min="1" max="60" value={enrollData.validityMonths} onChange={(e) => setEnrollData({ ...enrollData, validityMonths: parseInt(e.target.value) || 12 })} />
                </div>
                <div className="um-modal-actions">
                  <button type="button" className="um-btn um-btn-cancel" onClick={() => setShowEnrollModal(false)}>Cancel</button>
                  <button type="submit" className="um-btn um-btn-primary" disabled={actionLoading || !enrollData.courseId}>{actionLoading ? "Enrolling..." : "Enroll Now"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showBanModal && selectedUser && (
          <div className="um-modal-overlay" onClick={() => setShowBanModal(false)}>
            <div className="um-modal um-modal-sm" onClick={(e) => e.stopPropagation()}>
              <div className="um-modal-header">
                <h2>Ban User</h2>
                <button className="um-modal-close" onClick={() => setShowBanModal(false)}><FaTimes /></button>
              </div>
              <p className="um-ban-warning">You are about to ban <strong>{selectedUser.name}</strong>. This will prevent them from accessing the platform.</p>
              <div className="um-form-group">
                <label>Reason for ban</label>
                <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Enter reason..." rows={3} />
              </div>
              <div className="um-modal-actions">
                <button type="button" className="um-btn um-btn-cancel" onClick={() => setShowBanModal(false)}>Cancel</button>
                <button type="button" className="um-btn um-btn-danger" onClick={handleBanUser} disabled={actionLoading}>{actionLoading ? "Banning..." : "Ban User"}</button>
              </div>
            </div>
          </div>
        )}

        {showBulkUploadModal && (
          <div className="um-modal-overlay" onClick={() => setShowBulkUploadModal(false)}>
            <div className="um-modal" onClick={(e) => e.stopPropagation()}>
              <div className="um-modal-header">
                <h2>Bulk Upload Users</h2>
                <button className="um-modal-close" onClick={() => { setShowBulkUploadModal(false); setBulkUploadResult(null); }}><FaTimes /></button>
              </div>
              <div className="um-bulk-content">
                <p>Upload a CSV file with user details. Required columns: <strong>name</strong>, and at least one of <strong>email</strong> or <strong>phone</strong>.</p>
                <p>Optional columns: gender, city, category, exam</p>
                <button className="um-btn um-btn-outline um-btn-sm" onClick={downloadCsvTemplate}><FaDownload /> Download CSV Template</button>
                <div className="um-bulk-upload-area">
                  <input type="file" accept=".csv" ref={fileInputRef} onChange={handleBulkUpload} style={{ display: "none" }} />
                  <button className="um-btn um-btn-primary" onClick={() => fileInputRef.current?.click()} disabled={actionLoading}>
                    {actionLoading ? "Uploading..." : <><FaUpload /> Select CSV File</>}
                  </button>
                </div>
                {bulkUploadResult && (
                  <div className="um-bulk-result">
                    <div className="um-bulk-summary">
                      <span className="um-bulk-success">{bulkUploadResult.created} created</span>
                      <span className="um-bulk-error">{bulkUploadResult.skipped} skipped</span>
                    </div>
                    {bulkUploadResult.errors.length > 0 && (
                      <div className="um-bulk-errors">
                        <h4>Errors:</h4>
                        {bulkUploadResult.errors.slice(0, 10).map((err, i) => (
                          <div key={i} className="um-bulk-error-item">Row {err.row}: {err.message}</div>
                        ))}
                        {bulkUploadResult.errors.length > 10 && <p>...and {bulkUploadResult.errors.length - 10} more</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UserManagement;
