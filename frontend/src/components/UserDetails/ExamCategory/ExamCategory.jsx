import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUserEdit } from "react-icons/fa";
import axios from "../../../utils/axiosConfig";
import LOGO from "../../../images/tgLOGO.png";
import "./ExamCategory.css";

const ExamCategory = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setProfilePic(storedUser.profilePic || "");
    }

    const fetchCategories = async () => {
      try {
        const res = await axios.get("/api/onboarding-categories/public");
        if (res.data.success) {
          setCategories(res.data.categories);
        }
      } catch (err) {
        console.error("Failed to fetch exam categories:", err);
        setCategories([
          { _id: "1", name: "MBA" },
          { _id: "2", name: "After 12" },
          { _id: "3", name: "GMAT" },
          { _id: "4", name: "Govt Exams" },
        ]);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const token = localStorage.getItem("authToken");
      const res = await axios.post("/api/user/upload-profile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      const imageUrl = res.data.profilePic || res.data.url || (res.data.data && res.data.data.profilePic);
      setProfilePic(imageUrl);

      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (storedUser) {
        storedUser.profilePic = imageUrl;
        localStorage.setItem("user", JSON.stringify(storedUser));
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleNext = async () => {
    if (!selectedCategory) {
      alert("Please select a category.");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");

      await axios.post(
        "/api/user/save-category",
        { category: selectedCategory },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedUser = { ...JSON.parse(localStorage.getItem("user")), selectedCategory };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      navigate(`/exam-selection/${selectedCategory}`);
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Failed to save category. Try again.");
    }
  };

  return (
    <div className="exam-category-container">
      <div className="userdetails-left login-left-panel">
        <div className="login-logo">
          <img src={LOGO} alt="TathaGat Logo" />

          <div className="userdetails-image-wrapper editable" style={{ marginTop: "40px" }}>
            <label htmlFor="category-pic-input">
              <img
                src={
                  profilePic?.startsWith("/uploads/")
                    ? `${profilePic}`
                    : profilePic || "https://via.placeholder.com/100?text=Upload"
                }
                alt="Profile"
                className="userdetails-pic"
              />
              <div className="userdetails-edit-overlay">
                <FaUserEdit className="userdetails-edit-icon" />
              </div>
            </label>
            <input
              id="category-pic-input"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />
          </div>

          {uploading && (
            <p style={{ color: "orange", fontSize: "13px", marginTop: "5px", textAlign: "center" }}>
              Uploading image...
            </p>
          )}

          <p className="login-tagline">
            Access Your Personalized <br />
            <strong>Dashboard</strong> –{" "}
            <span>
              Where Preparation
              <br />
              Meets Performance.
            </span>
          </p>
        </div>
      </div>

      <div className="exam-category-right">
        <div className="exam-category-box">
          <div className="exam-category-back" onClick={() => navigate(-1)}>
            <FaArrowLeft style={{ marginRight: "8px" }} /> Back
          </div>
          <h2>Select the category of exam</h2>
          <p>What course are you looking for?</p>

          {loadingCategories ? (
            <p style={{ textAlign: "center", color: "#888" }}>Loading categories...</p>
          ) : (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Choose</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          <button onClick={handleNext} disabled={!selectedCategory}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamCategory;
