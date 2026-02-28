import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import AdminLayout from "../AdminLayout/AdminLayout";
import "./AdminProfile.css";
import { FaUser, FaEnvelope, FaPhone, FaCalendarAlt, FaCamera, FaLock, FaEdit, FaSave, FaTimes, FaShieldAlt, FaSignOutAlt } from "react-icons/fa";

const AdminProfile = () => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', email: '' });
  const [changeMode, setChangeMode] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  const fetchAdmin = async () => {
    const token = localStorage.getItem("adminToken");
    try {
      const res = await axios.get("/api/admin/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdmin(res.data.admin);
      setEditData({
        name: res.data.admin?.name || '',
        phone: res.data.admin?.phone || '',
        email: res.data.admin?.email || ''
      });
    } catch (err) {
      console.error("Failed to fetch admin profile", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmin();
  }, []);

  const handleEditToggle = () => {
    if (editMode) {
      setEditData({
        name: admin?.name || '',
        phone: admin?.phone || '',
        email: admin?.email || ''
      });
    }
    setEditMode(!editMode);
    setMessage(null);
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleProfileUpdate = async () => {
    setSaving(true);
    setMessage(null);
    const token = localStorage.getItem("adminToken");
    try {
      const res = await axios.put("/api/admin/profile", editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmin(res.data.admin);
      setEditMode(false);
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePic', file);

    setUploading(true);
    const token = localStorage.getItem("adminToken");
    try {
      const res = await axios.post("/api/admin/upload-profile", formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setAdmin(prev => ({ ...prev, profilePic: res.data.profilePic }));
      setMessage({ type: "success", text: "Profile picture updated!" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to upload picture" });
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordInput = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    
    setSaving(true);
    setMessage(null);
    const token = localStorage.getItem("adminToken");
    try {
      const res = await axios.put("/api/admin/change-password", passwords, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: "success", text: res.data.message });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setChangeMode(false);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to change password" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    window.location.href = "/admin/login";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getInitials = (name) => {
    if (!name) return 'AD';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-profile-container">
        <div className="profile-header">
          <h1><FaShieldAlt /> Admin Profile</h1>
          <p>Manage your account settings and preferences</p>
        </div>

        <div className="profile-content">
          <div className="profile-sidebar">
            <div className="profile-avatar-section">
              <div className="avatar-wrapper">
                {admin?.profilePic ? (
                  <img 
                    src={admin.profilePic} 
                    alt={admin.name || 'Admin'} 
                    className="profile-avatar-img"
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {getInitials(admin?.name)}
                  </div>
                )}
                <button 
                  className="avatar-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <FaCamera />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicUpload}
                  style={{ display: 'none' }}
                />
              </div>
              {uploading && <p className="uploading-text">Uploading...</p>}
              <h2 className="profile-name">{admin?.name || 'Admin'}</h2>
              <span className="profile-role">Administrator</span>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>

          <div className="profile-main">
            {message && (
              <div className={`profile-message ${message.type}`}>
                {message.text}
              </div>
            )}

            <div className="profile-card">
              <div className="card-header">
                <h3><FaUser /> Personal Information</h3>
                <button 
                  className={`edit-toggle-btn ${editMode ? 'cancel' : ''}`}
                  onClick={handleEditToggle}
                >
                  {editMode ? <><FaTimes /> Cancel</> : <><FaEdit /> Edit</>}
                </button>
              </div>
              
              <div className="profile-fields">
                <div className="field-group">
                  <label><FaUser /> Full Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      name="name"
                      value={editData.name}
                      onChange={handleEditChange}
                      placeholder="Enter your name"
                    />
                  ) : (
                    <p>{admin?.name || 'Not set'}</p>
                  )}
                </div>

                <div className="field-group">
                  <label><FaEnvelope /> Email Address</label>
                  {editMode ? (
                    <input
                      type="email"
                      name="email"
                      value={editData.email}
                      onChange={handleEditChange}
                      placeholder="Enter your email"
                    />
                  ) : (
                    <p>{admin?.email || 'Not set'}</p>
                  )}
                </div>

                <div className="field-group">
                  <label><FaPhone /> Phone Number</label>
                  {editMode ? (
                    <input
                      type="tel"
                      name="phone"
                      value={editData.phone}
                      onChange={handleEditChange}
                      placeholder="Enter your phone"
                    />
                  ) : (
                    <p>{admin?.phone || 'Not set'}</p>
                  )}
                </div>

                {editMode && (
                  <button 
                    className="save-profile-btn"
                    onClick={handleProfileUpdate}
                    disabled={saving}
                  >
                    <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>

            <div className="profile-card security-card">
              <div className="card-header">
                <h3><FaLock /> Security Settings</h3>
                <button 
                  className={`edit-toggle-btn ${changeMode ? 'cancel' : ''}`}
                  onClick={() => {
                    setChangeMode(!changeMode);
                    setMessage(null);
                    setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                >
                  {changeMode ? <><FaTimes /> Cancel</> : <><FaEdit /> Change Password</>}
                </button>
              </div>

              {changeMode ? (
                <div className="password-change-form">
                  <div className="field-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwords.currentPassword}
                      onChange={handlePasswordInput}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="field-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwords.newPassword}
                      onChange={handlePasswordInput}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="field-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwords.confirmPassword}
                      onChange={handlePasswordInput}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <button 
                    className="save-profile-btn"
                    onClick={handlePasswordChange}
                    disabled={saving}
                  >
                    <FaLock /> {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              ) : (
                <div className="security-info">
                  <p>Your password is securely encrypted. Click "Change Password" to update your credentials.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
