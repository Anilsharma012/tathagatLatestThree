import React, { useContext, useRef, useState, useEffect } from "react";
import { UserContext } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./StudentTopbar.css";

const StudentTopbar = () => {
  const { user, updateUser } = useContext(UserContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const [imageSrc, setImageSrc] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ✅ Set profile image from context
  useEffect(() => {
    if (user?.profilePic) {
      setImageSrc(user.profilePic);
    }
  }, [user]);

  // ✅ Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProfileClick = () => {
    setDropdownOpen((prev) => !prev);
  };

  const handleUploadClick = (e) => {
    e.stopPropagation();
    setDropdownOpen(false);
    fileInputRef.current.click();
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");

    if (updateUser) updateUser(null);

    navigate("/auth/login");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const token = localStorage.getItem("authToken");

      const res = await axios.post(
        "/api/user/upload-profile",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const imageUrl = res.data.url;

      updateUser({ profilePic: imageUrl });
      setImageSrc(imageUrl);
    } catch (err) {
      console.error("Image upload failed", err);
      alert("Failed to upload image");
    }
  };

  return (
    <div className="ttstudent-topbar">
      <div className="ttleft">
        <i className="ttmenu-icon">&#9776;</i>
        <h3 className="page-title">My Courses</h3>
      </div>

      <div className="ttright">
        <div className="ttsearch-wrapper">
          <input type="text" placeholder="Search..." />
          <i className="ttsearch-icon">🔍</i>
        </div>

        <i className="tticon ttflash-icon" title="Shortcuts">⚡</i>

        <div className="ttnotification-wrapper" title="Notifications">
          <i className="tticon bell-icon">🔔</i>
        </div>

        {/* Profile Section */}
        <div className="ttprofile-section" ref={dropdownRef}>
          <img
            src={imageSrc || "https://via.placeholder.com/100"}
            className="ttprofile-pic"
            alt="Profile"
            onClick={handleProfileClick}
            title="Click to open menu"
          />

          <span
            className="ttusername"
            onClick={handleProfileClick}
          >
            {user?.name || "Profile"} ▾
          </span>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {dropdownOpen && (
            <div className="ttprofile-dropdown">
              <button
                className="ttdropdown-item"
                onClick={handleUploadClick}
              >
                📷 Change Photo
              </button>

              <hr className="ttdropdown-divider" />

              <button
                className="ttdropdown-item ttlogout-btn"
                onClick={handleLogout}
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>

        <button
          className="ttback-btn"
          onClick={() => navigate("/")}
        >
          🔙 Back to Website
        </button>
      </div>
    </div>
  );
};

export default StudentTopbar;