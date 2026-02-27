import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../../utils/axiosConfig";
import "./StudentProfile.css";

const StudentProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("personal");
  
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    gender: "",
    dob: "",
    city: "",
    state: "",
    profilePic: "",
    selectedCategory: "",
    selectedExam: "",
    targetYear: "",
    // streak and points no longer displayed on profile
  });

  const examTypes = {
    MBA: ["CAT", "XAT", "SNAP", "MAT", "CMAT", "NMAT", "IIFT"],
    After12: ["CUET", "IPMAT", "NPAT", "SET"],
    GMAT: ["GMAT", "GRE"],
    Govt: ["UPSC", "SSC", "Bank PO", "RBI Grade B"]
  };

  const states = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal"
  ];

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/auth/login");
        return;
      }

      const response = await axios.get("/api/user/verify-token", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const user = response.data.user;
      setUserData({
        name: user.name || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        gender: user.gender || "",
        dob: user.dob ? user.dob.split("T")[0] : "",
        city: user.city || "",
        state: user.state || "",
        profilePic: user.profilePic || "",
        selectedCategory: user.selectedCategory || "",
        selectedExam: user.selectedExam || "",
        targetYear: user.targetYear || "",
        // streak/points omitted
        notificationPreferences: user.notificationPreferences || {
          email: true,
          sms: true,
          analytics: true
        }
      });
    } catch (err) {
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("authToken");
      await axios.post(
        "/api/user/update-details",
        userData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedUser = {
        ...JSON.parse(localStorage.getItem("user") || "{}"),
        ...userData
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.response?.data?.msg || err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("profilePic", file);

      const token = localStorage.getItem("authToken");
      const response = await axios.post(
        "/api/user/upload-profile",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
          }
        }
      );

      const imageUrl = response.data.profilePic || response.data.url;
      setUserData(prev => ({ ...prev, profilePic: imageUrl }));
      setSuccess("Profile picture updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/auth/login");
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="loader"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>My Profile</h1>
          <p>Manage your account settings and preferences</p>
        </div>

        {(error || success) && (
          <div className="profile-alerts">
            {error && <div className="profile-error">{error}</div>}
            {success && <div className="profile-success">{success}</div>}
          </div>
        )}

        <div className="profile-content">
          <div className="profile-sidebar">
            <div className="profile-hero-card">
              <div className="profile-avatar-wrapper" onClick={() => fileInputRef.current?.click()}>
                <img
                  src={userData.profilePic?.startsWith("/uploads/") 
                    ? userData.profilePic 
                    : userData.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || "User")}&background=0b1f3a&color=fff&size=120&bold=true`
                  }
                  alt="Profile"
                  className="profile-avatar"
                />
                <div className="avatar-overlay">
                  {uploading ? "..." : "📷"}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  style={{ display: "none" }}
                />
              </div>
              <h2>{userData.name || "Student"}</h2>
              <p className="profile-email">{userData.email || userData.phoneNumber}</p>
              
              {/* profile-stats removed as not needed anymore */}
            </div>

            <div className="section-nav">
              <div className="section-tabs">
                <button 
                  className={`section-tab ${activeSection === "personal" ? "active" : ""}`}
                  onClick={() => setActiveSection("personal")}
                >
                  <span className="tab-icon">👤</span>
                  Personal Info
                </button>
                <button 
                  className={`section-tab ${activeSection === "exam" ? "active" : ""}`}
                  onClick={() => setActiveSection("exam")}
                >
                  <span className="tab-icon">🎯</span>
                  Exam Preferences
                </button>

                {/* 🔕 NOTIFICATIONS TAB (COMMENTED AS PER SCREENSHOT) */}
                {/*
                <button 
                  className={`section-tab ${activeSection === "notifications" ? "active" : ""}`}
                  onClick={() => setActiveSection("notifications")}
                >
                  <span className="tab-icon">🔔</span>
                  Notifications
                </button>
                */}
              </div>
            </div>
          </div>

          <div className="profile-main">
            <div className="profile-form-card">
              {activeSection === "personal" && (
                <div className="form-section">
                  <div className="form-section-header">
                    <div className="form-section-icon">👤</div>
                    <div>
                      <h3>Personal Information</h3>
                      <p>Update your personal details here</p>
                    </div>
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label><span className="label-icon">📝</span> Full Name</label>
                      <input
                        type="text"
                        value={userData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="form-group">
                      <label><span className="label-icon">📧</span> Email Address</label>
                      <input
                        type="email"
                        value={userData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        placeholder="Enter your email"
                      />
                    </div>

                    <div className="form-group">
                      <label><span className="label-icon">📱</span> Phone Number</label>
                      <input
                        type="tel"
                        value={userData.phoneNumber}
                        disabled
                        className="disabled"
                        placeholder="Phone number"
                      />
                    </div>

                    <div className="form-group">
                      <label><span className="label-icon">👥</span> Gender</label>
                      <select
                        value={userData.gender}
                        onChange={(e) => handleChange("gender", e.target.value)}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label><span className="label-icon">🎂</span> Date of Birth</label>
                      <input
                        type="date"
                        value={userData.dob}
                        onChange={(e) => handleChange("dob", e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label><span className="label-icon">🏙️</span> City</label>
                      <input
                        type="text"
                        value={userData.city}
                        onChange={(e) => handleChange("city", e.target.value)}
                        placeholder="Enter your city"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label><span className="label-icon">📍</span> State</label>
                      <select
                        value={userData.state}
                        onChange={(e) => handleChange("state", e.target.value)}
                      >
                        <option value="">Select State</option>
                        {states.map((state) => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "exam" && (
                <div className="form-section">
                  <div className="form-section-header">
                    <div className="form-section-icon">🎯</div>
                    <div>
                      <h3>Exam Preferences</h3>
                      <p>Set your target exam and preparation goals</p>
                    </div>
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label><span className="label-icon">📚</span> Exam Category</label>
                      <select
                        value={userData.selectedCategory}
                        onChange={(e) => {
                          handleChange("selectedCategory", e.target.value);
                          handleChange("selectedExam", "");
                        }}
                      >
                        <option value="">Select Category</option>
                        {examCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label><span className="label-icon">🎓</span> Target Exam</label>
                      <select
                        value={userData.selectedExam}
                        onChange={(e) => handleChange("selectedExam", e.target.value)}
                        disabled={!userData.selectedCategory}
                      >
                        <option value="">Select Exam</option>
                        {userData.selectedCategory && examTypes[userData.selectedCategory]?.map((exam) => (
                          <option key={exam} value={exam}>{exam}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group full-width">
                      <label><span className="label-icon">📅</span> Target Year</label>
                      <select
                        value={userData.targetYear}
                        onChange={(e) => handleChange("targetYear", e.target.value)}
                      >
                        <option value="">Select Target Year</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                        <option value="2028">2028</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 🔕 NOTIFICATION SETTINGS SECTION (COMMENTED AS PER SCREENSHOT) */}
              {/*
              {activeSection === "notifications" && (
                <div className="form-section">
                  <div className="form-section-header">
                    <div className="form-section-icon">🔔</div>
                    <div>
                      <h3>Notification Preferences</h3>
                      <p>Manage how you receive updates and alerts</p>
                    </div>
                  </div>
                  
                  <div className="notification-options">
                    <div className="notification-item">
                      <div className="notification-info">
                        <div className="notification-icon">📧</div>
                        <div className="notification-text">
                          <h4>Email Notifications</h4>
                          <p>Receive updates about courses, tests, and results via email</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={userData.notificationPreferences.email}
                          onChange={(e) => handleNotificationChange("email", e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="notification-item">
                      <div className="notification-info">
                        <div className="notification-icon">💬</div>
                        <div className="notification-text">
                          <h4>SMS Reminders</h4>
                          <p>Get important alerts and test reminders via SMS</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={userData.notificationPreferences.sms}
                          onChange={(e) => handleNotificationChange("sms", e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="notification-item">
                      <div className="notification-info">
                        <div className="notification-icon">📊</div>
                        <div className="notification-text">
                          <h4>Performance Analytics</h4>
                          <p>Weekly performance reports and personalized improvement tips</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={userData.notificationPreferences.analytics}
                          onChange={(e) => handleNotificationChange("analytics", e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
              */}

              <div className="form-actions">
                <button className="logout-btn" onClick={handleLogout}>
                  <span className="btn-icon">🚪</span>
                  Logout
                </button>
                <button 
                  className="save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <span className="btn-icon">✓</span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
