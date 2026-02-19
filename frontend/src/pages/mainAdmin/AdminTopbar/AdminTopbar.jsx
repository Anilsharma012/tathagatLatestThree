import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminTopbar.css";
import { FaUser, FaSignOutAlt, FaCog, FaChevronDown } from "react-icons/fa";

const AdminTopbar = () => {
  const [admin, setAdmin] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdmin = async () => {
      const token = localStorage.getItem("adminToken");
      if (!token) return;
      
      try {
        const res = await axios.get("/api/admin/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAdmin(res.data.admin);
      } catch (err) {
        console.error("Failed to fetch admin", err);
      }
    };

    fetchAdmin();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  const getInitials = (name) => {
    if (!name) return 'AD';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="admin-topbar">
      <h2 className="topbar-title">Welcome, {admin?.name || 'Admin'}</h2>
      <div className="topbar-actions">
        <div className="topbar-profile-wrapper" ref={dropdownRef}>
          <button 
            className="topbar-profile-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {admin?.profilePic ? (
              <img 
                src={admin.profilePic} 
                alt={admin.name || 'Admin'} 
                className="topbar-avatar"
              />
            ) : (
              <div className="topbar-avatar-placeholder">
                {getInitials(admin?.name)}
              </div>
            )}
            <span className="topbar-admin-name">{admin?.name || 'Admin'}</span>
            <FaChevronDown className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="topbar-dropdown">
              <div className="dropdown-header">
                {admin?.profilePic ? (
                  <img 
                    src={admin.profilePic} 
                    alt={admin.name || 'Admin'} 
                    className="dropdown-avatar"
                  />
                ) : (
                  <div className="dropdown-avatar-placeholder">
                    {getInitials(admin?.name)}
                  </div>
                )}
                <div className="dropdown-info">
                  <span className="dropdown-name">{admin?.name || 'Admin'}</span>
                  <span className="dropdown-email">{admin?.email || ''}</span>
                  <span className="dropdown-role">Administrator</span>
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <button 
                className="dropdown-item"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate("/admin/profile");
                }}
              >
                <FaUser /> My Profile
              </button>
              <button 
                className="dropdown-item"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate("/admin/settings");
                }}
              >
                <FaCog /> Settings
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout" onClick={handleLogout}>
                <FaSignOutAlt /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTopbar;
