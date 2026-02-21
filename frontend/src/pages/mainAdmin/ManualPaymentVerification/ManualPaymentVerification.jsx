import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import AdminLayout from "../AdminLayout/AdminLayout";
import "./ManualPaymentVerification.css";

const ManualPaymentVerification = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [adminNote, setAdminNote] = useState("");

  const getToken = () => localStorage.getItem("adminToken");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/manual-payment/requests", {
        params: { status: statusFilter, page, limit: 20, search },
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.data.success) {
        setRequests(res.data.requests);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch requests", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleVerify = async (id, action) => {
    if (action === "rejected" && !adminNote.trim()) {
      alert("Please add a note explaining the rejection reason");
      return;
    }
    setActionLoading(id);
    try {
      const res = await axios.put(
        `/api/manual-payment/verify/${id}`,
        { action, adminNote },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (res.data.success) {
        alert(`Payment ${action} successfully!`);
        setSelectedRequest(null);
        setAdminNote("");
        fetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to process");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const statusBadge = (s) => {
    const colors = { pending: "#f59e0b", verified: "#10b981", rejected: "#ef4444" };
    return (
      <span className="mpv-status-badge" style={{ background: colors[s] || "#999" }}>
        {s.charAt(0).toUpperCase() + s.slice(1)}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="mpv-page">
        <div className="mpv-header">
          <h2>Manual Payment Verification</h2>
          <p>Review and verify UPI payment requests from students</p>
        </div>

        <div className="mpv-controls">
          <div className="mpv-tabs">
            {["pending", "verified", "rejected", "all"].map((s) => (
              <button
                key={s}
                className={`mpv-tab ${statusFilter === s ? "active" : ""}`}
                onClick={() => { setStatusFilter(s); setPage(1); }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by name, phone, UTR..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="mpv-search"
          />
        </div>

        {loading ? (
          <p style={{ padding: "20px" }}>Loading...</p>
        ) : requests.length === 0 ? (
          <div className="mpv-empty">No payment requests found</div>
        ) : (
          <div className="mpv-table-wrap">
            <table className="mpv-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Amount</th>
                  <th>UTR Number</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div className="mpv-student-info">
                        <strong>{r.userId?.name || "N/A"}</strong>
                        <span>{r.userId?.phone || r.userId?.email || ""}</span>
                      </div>
                    </td>
                    <td>{r.courseId?.name || "N/A"}</td>
                    <td style={{ fontWeight: 600 }}>
                      &#8377;{r.amount}
                      {r.couponCode && (
                        <div style={{ fontSize: "11px", color: "#059669" }}>{r.couponCode} ({r.discountPercent}% off)</div>
                      )}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{r.utrNumber}</td>
                    <td style={{ fontSize: "13px" }}>{formatDate(r.createdAt)}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td>
                      <button className="mpv-view-btn" onClick={() => { setSelectedRequest(r); setAdminNote(""); }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mpv-pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}

        {selectedRequest && (
          <div className="mpv-modal-overlay" onClick={() => setSelectedRequest(null)}>
            <div className="mpv-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mpv-modal-header">
                <h3>Payment Details</h3>
                <button onClick={() => setSelectedRequest(null)} className="mpv-modal-close">&times;</button>
              </div>
              <div className="mpv-modal-body">
                <div className="mpv-detail-row">
                  <span>Student:</span>
                  <strong>{selectedRequest.userId?.name || "N/A"}</strong>
                </div>
                <div className="mpv-detail-row">
                  <span>Phone:</span>
                  <strong>{selectedRequest.userId?.phone || "N/A"}</strong>
                </div>
                <div className="mpv-detail-row">
                  <span>Course:</span>
                  <strong>{selectedRequest.courseId?.name || "N/A"}</strong>
                </div>
                <div className="mpv-detail-row">
                  <span>Amount:</span>
                  <strong>&#8377;{selectedRequest.amount}</strong>
                </div>
                {selectedRequest.couponCode && (
                  <div className="mpv-detail-row">
                    <span>Coupon:</span>
                    <strong>{selectedRequest.couponCode} ({selectedRequest.discountPercent}% off)</strong>
                  </div>
                )}
                <div className="mpv-detail-row">
                  <span>UTR Number:</span>
                  <strong style={{ fontFamily: "monospace" }}>{selectedRequest.utrNumber}</strong>
                </div>
                <div className="mpv-detail-row">
                  <span>Submitted:</span>
                  <strong>{formatDate(selectedRequest.createdAt)}</strong>
                </div>
                <div className="mpv-detail-row">
                  <span>Status:</span>
                  {statusBadge(selectedRequest.status)}
                </div>

                {selectedRequest.screenshotUrl && (
                  <div className="mpv-screenshot-section">
                    <p style={{ fontWeight: 600, marginBottom: "8px" }}>Payment Screenshot:</p>
                    <a href={selectedRequest.screenshotUrl} target="_blank" rel="noopener noreferrer">
                      <img src={selectedRequest.screenshotUrl} alt="Payment Screenshot" className="mpv-screenshot-img" />
                    </a>
                  </div>
                )}

                {selectedRequest.status === "pending" && (
                  <div className="mpv-action-section">
                    <textarea
                      placeholder="Admin note (required for rejection)"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="mpv-admin-note"
                    />
                    <div className="mpv-action-buttons">
                      <button
                        className="mpv-verify-btn"
                        onClick={() => handleVerify(selectedRequest._id, "verified")}
                        disabled={actionLoading === selectedRequest._id}
                      >
                        {actionLoading === selectedRequest._id ? "Processing..." : "Verify & Unlock Course"}
                      </button>
                      <button
                        className="mpv-reject-btn"
                        onClick={() => handleVerify(selectedRequest._id, "rejected")}
                        disabled={actionLoading === selectedRequest._id}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {selectedRequest.adminNote && (
                  <div className="mpv-detail-row" style={{ marginTop: "12px" }}>
                    <span>Admin Note:</span>
                    <strong>{selectedRequest.adminNote}</strong>
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

export default ManualPaymentVerification;
