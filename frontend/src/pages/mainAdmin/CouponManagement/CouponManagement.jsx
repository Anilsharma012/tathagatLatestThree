import React, { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout/AdminLayout";
import axios from "axios";
import "./CouponManagement.css";

const CouponManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountPercent: "",
    applicableTo: "all",
    courses: [],
    maxUses: "",
    maxUsesPerUser: "1",
    expiryDate: "",
    description: "",
  });

  const token = localStorage.getItem("adminToken");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchCoupons = async () => {
    try {
      const res = await axios.get("/api/coupons/all", { headers });
      setCoupons(res.data.coupons || []);
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await axios.get("/api/courses/student/published-courses");
      setCourses(res.data.courses || []);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchCourses();
  }, []);

  const resetForm = () => {
    setForm({
      code: "",
      discountPercent: "",
      applicableTo: "all",
      courses: [],
      maxUses: "",
      maxUsesPerUser: "1",
      expiryDate: "",
      description: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!form.code || !form.discountPercent) {
      alert("Coupon code and discount % are required");
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await axios.put(`/api/coupons/${editingId}`, form, { headers });
      } else {
        await axios.post("/api/coupons/create", form, { headers });
      }
      fetchCoupons();
      setShowModal(false);
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save coupon");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (coupon) => {
    setForm({
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      applicableTo: coupon.applicableTo,
      courses: coupon.courses?.map((c) => c._id || c) || [],
      maxUses: coupon.maxUses || "",
      maxUsesPerUser: coupon.maxUsesPerUser || "1",
      expiryDate: coupon.expiryDate ? coupon.expiryDate.split("T")[0] : "",
      description: coupon.description || "",
    });
    setEditingId(coupon._id);
    setShowModal(true);
  };

  const handleToggle = async (id) => {
    try {
      await axios.patch(`/api/coupons/${id}/toggle`, {}, { headers });
      fetchCoupons();
    } catch (err) {
      alert("Failed to toggle coupon status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await axios.delete(`/api/coupons/${id}`, { headers });
      fetchCoupons();
    } catch (err) {
      alert("Failed to delete coupon");
    }
  };

  const handleCourseToggle = (courseId) => {
    setForm((prev) => ({
      ...prev,
      courses: prev.courses.includes(courseId)
        ? prev.courses.filter((c) => c !== courseId)
        : [...prev.courses, courseId],
    }));
  };

  return (
    <AdminLayout>
      <div className="coupon-page">
        <div className="coupon-header">
          <h1 className="page-title">Coupon Management</h1>
          <button
            className="create-coupon-btn"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            + Create Coupon
          </button>
        </div>

        <div className="coupon-table-wrapper">
          <table className="coupon-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Code</th>
                <th>Discount</th>
                <th>Applicable To</th>
                <th>Used / Max</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon, i) => (
                <tr key={coupon._id}>
                  <td>{i + 1}</td>
                  <td>
                    <span className="coupon-code-badge">{coupon.code}</span>
                  </td>
                  <td>{coupon.discountPercent}%</td>
                  <td>
                    {coupon.applicableTo === "all" ? (
                      <span className="scope-badge all">All Courses</span>
                    ) : (
                      <span className="scope-badge specific">
                        {coupon.courses?.map((c) => c.name || "Course").join(", ") || "Specific"}
                      </span>
                    )}
                  </td>
                  <td>
                    {coupon.usedCount} / {coupon.maxUses || "Unlimited"}
                  </td>
                  <td>
                    {coupon.expiryDate
                      ? new Date(coupon.expiryDate).toLocaleDateString()
                      : "No Expiry"}
                  </td>
                  <td>
                    <span className={`status-badge ${coupon.isActive ? "active" : "inactive"}`}>
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="coupon-actions">
                    <button
                      className={`toggle-btn ${coupon.isActive ? "deactivate" : "activate"}`}
                      onClick={() => handleToggle(coupon._id)}
                    >
                      {coupon.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button className="edit-btn" onClick={() => handleEdit(coupon)}>
                      Edit
                    </button>
                    <button className="del-btn" onClick={() => handleDelete(coupon._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                    No coupons created yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="coupon-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="coupon-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Edit Coupon" : "Create New Coupon"}</h2>

            <div className="form-group">
              <label>Coupon Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. CAT2026"
              />
            </div>

            <div className="form-group">
              <label>Discount Percentage (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                placeholder="e.g. 20"
              />
            </div>

            <div className="form-group">
              <label>Applicable To</label>
              <select
                value={form.applicableTo}
                onChange={(e) => setForm({ ...form, applicableTo: e.target.value })}
              >
                <option value="all">All Courses</option>
                <option value="specific">Specific Courses</option>
              </select>
            </div>

            {form.applicableTo === "specific" && (
              <div className="form-group">
                <label>Select Courses</label>
                <div className="course-checkboxes">
                  {courses.map((c) => (
                    <label key={c._id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.courses.includes(c._id)}
                        onChange={() => handleCourseToggle(c._id)}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Max Total Uses (0 = unlimited)</label>
                <input
                  type="number"
                  min="0"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Max Uses Per User</label>
                <input
                  type="number"
                  min="1"
                  value={form.maxUsesPerUser}
                  onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Expiry Date (optional)</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Description (optional)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Internal note about this coupon"
              />
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => { setShowModal(false); resetForm(); }}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? "Saving..." : editingId ? "Update Coupon" : "Create Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default CouponManagement;
