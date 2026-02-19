import React, { useState } from "react";
import "../Login/Login.css";
import "./Signup.css";
import axios from "../../utils/axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import TGLOGO from "../../images/tgLOGO.png";

const Signup = ({ setUser }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");

    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { setError("Please enter a valid 10-digit Indian mobile number."); return; }

    setIsSubmitting(true);
    try {
      const response = await axios.post("/api/auth/phone/register", {
        name: name.trim(),
        phoneNumber: phone,
        city: city.trim() || undefined,
        gender: gender || undefined,
        dob: dob || undefined,
      });

      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      if (setUser && typeof setUser === 'function') {
        setUser(response.data.user);
      }

      setToastMessage("Account created successfully!");

      setTimeout(() => {
        navigate("/exam-category");
      }, 500);
    } catch (err) {
      const msg = err?.response?.data?.message || "Registration failed. Please try again.";
      setError(msg);
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tllogin-fullscreen-wrapper">
      <div className="tllogin-popup" onClick={(e) => e.stopPropagation()}>

        {error && (
          <div className="toast-top">
            <span>{error}</span>
            <button className="toast-close-btn" onClick={() => setError("")}>x</button>
          </div>
        )}
        {toastMessage && (
          <div className="toast-top success">{toastMessage}</div>
        )}

        <div className="tllogin-left-panel">
          <div className="tllogin-logo">
            <img src={TGLOGO} alt="TathaGat Logo" />
            <p className="tllogin-tagline">
              Begin Your Journey to <br />
              <strong>IIM</strong> –{" "}
              <span>
                Where Dreams
                <br />
                Take Shape.
              </span>
            </p>
          </div>
        </div>

        <div className="tllogin-right-panel">
          <div className="tllogin-box signup-box">
            <div className="tllogin-lock-icon">📝</div>
            <h2>Create Account</h2>
            <p>Fill in your details to get started</p>

            <form onSubmit={handleRegister} className="signup-form">
              <input
                type="text"
                placeholder="Full Name *"
                className="tlotp-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                type="tel"
                placeholder="Mobile Number *"
                className="tlotp-input"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(val);
                }}
                maxLength={10}
              />

              <input
                type="text"
                placeholder="City (optional)"
                className="tlotp-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />

              <div className="signup-row">
                <select
                  className="tlotp-input signup-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Gender (optional)</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>

                <input
                  type="date"
                  className="tlotp-input signup-date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="Date of Birth"
                />
              </div>

              <button
                type="submit"
                className="tllogin-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Account..." : "Sign Up"}
              </button>
            </form>

            <p className="help-text" style={{ marginTop: '15px' }}>
              Already have an account?{" "}
              <Link to="/Login" style={{ color: '#d3544b', fontWeight: 600, textDecoration: 'none' }}>
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
