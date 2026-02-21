import React from "react";
import { useNavigate } from "react-router-dom";
import "./Unauthorized.css";

const Unauthorized = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoToDashboard = () => {
    navigate("/admin/dashboard");
  };

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-card">
        <div className="unauthorized-icon">403</div>
        <h1>Access Denied</h1>
        <p>You do not have permission to view this page. Please contact your administrator if you believe this is an error.</p>
        <div className="unauthorized-actions">
          <button className="btn-back" onClick={handleGoBack}>Go Back</button>
          <button className="btn-dashboard" onClick={handleGoToDashboard}>Go to Dashboard</button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
