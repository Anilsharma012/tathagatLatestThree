import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../../utils/axiosConfig";
import { FaUserEdit, FaArrowLeft } from "react-icons/fa";
import LOGO from "../../../images/tgLOGO.png";
import "./ExamSelection.css";

const ExamSelection = () => {
  const navigate = useNavigate();
  const { category } = useParams();
  const [selectedExam, setSelectedExam] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [uploading, setUploading] = useState(false);

  const examOptions = {
    MBA: ["CAT", "XAT", "MAT", "SNAP"],
    "After 12": ["CUET UG", "IPMAT Indore", "IPMAT Rohtak", "JIPMAT"],
    GMAT: ["Study Abroad", "GRE", "TOEFL", "IELTS"],
    GovtExams: ["Banking SSC", "UPSC", "Railway Exams", "State PSC"],
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setProfilePic(storedUser.profilePic || "");
    }
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
    if (!selectedExam) {
      alert("Please select an exam.");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");

      await axios.post(
        "/api/user/save-exam",
        { category, exam: selectedExam },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const storedUser = JSON.parse(localStorage.getItem("user"));
      const updatedUser = { ...storedUser, selectedExam };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      navigate("/student/dashboard");
    } catch (error) {
      console.error("Error saving exam:", error);
      alert("Failed to save exam. Try again.");
    }
  };

  return (
    <div className="exam-selection-container">
      <div className="userdetails-left login-left-panel">
        <div className="login-logo">
          <img src={LOGO} alt="TathaGat Logo" />

          <div className="userdetails-image-wrapper editable" style={{ marginTop: "40px" }}>
            <label htmlFor="exam-pic-input">
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
              id="exam-pic-input"
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

      <div className="exam-selection-right">
        <div className="exam-selection-box">
          <div className="exam-category-back" onClick={() => navigate(-1)}>
            <FaArrowLeft style={{ marginRight: "8px" }} /> Back
          </div>
          <h2>Select Exam in {category}</h2>
          <p>Choose one of the options below</p>

          <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)}>
            <option value="">Choose</option>
            {examOptions[category]?.map((exam) => (
              <option key={exam} value={exam}>
                {exam}
              </option>
            ))}
          </select>

          <button onClick={handleNext} disabled={!selectedExam}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamSelection;
