import React, { useState, useRef, useEffect } from "react";
import "../Login/Login.css";
import "./Signup.css";
import { FaArrowLeft } from "react-icons/fa";
import axios from "../../utils/axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import TGLOGO from "../../images/tgLOGO.png";

const Signup = ({ setUser }) => {
  const [step, setStep] = useState("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");

    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { setError("Please enter a valid 10-digit Indian mobile number."); return; }

    setIsSubmitting(true);
    try {
      await axios.post("/api/auth/phone/register", {
        name: name.trim(),
        phoneNumber: phone,
        city: city.trim() || undefined,
        gender: gender || undefined,
        dob: dob || undefined,
      });

      setToastMessage("OTP sent to your phone!");
      setStep("otp");
      setResendTimer(30);
    } catch (err) {
      const msg = err?.response?.data?.message || "Registration failed. Please try again.";
      setError(msg);
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError("");
    try {
      await axios.post("/api/auth/phone/register", {
        name: name.trim(),
        phoneNumber: phone,
        city: city.trim() || undefined,
        gender: gender || undefined,
        dob: dob || undefined,
      });
      setToastMessage("OTP resent!");
      setResendTimer(30);
      setTimeout(() => setToastMessage(""), 3000);
    } catch (err) {
      setError("Failed to resend OTP. Please try again.");
      setTimeout(() => setError(""), 4000);
    }
  };

  const handleVerifyOtp = async () => {
    if (isSubmitting) return;
    const otpCode = otp.join("");
    if (otpCode.length !== 6) { setError("Please enter the 6-digit OTP."); return; }

    setIsSubmitting(true);
    setError("");
    try {
      const response = await axios.post("/api/auth/phone/verify-registration", {
        phoneNumber: phone,
        otpCode,
      });

      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      if (setUser && typeof setUser === 'function') {
        setUser(response.data.user);
      }

      setToastMessage("Registration successful! Welcome to TathaGat!");

      setTimeout(() => {
        navigate("/exam-category");
      }, 1000);
    } catch (err) {
      const msg = err?.response?.data?.message || "OTP verification failed. Please try again.";
      setError(msg);
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (value, index) => {
    if (/\D/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newOtp = [...otp];
      if (otp[index]) {
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        newOtp[index - 1] = "";
        setOtp(newOtp);
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) newOtp[i] = digits[i] || "";
      setOtp(newOtp);
      otpRefs.current[Math.min(digits.length, 5)]?.focus();
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
            {step === "otp" && (
              <div className="tllogin-back-icon" onClick={() => setStep("details")}>
                <FaArrowLeft /> Back
              </div>
            )}

            {step === "details" && (
              <>
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
                    {isSubmitting ? "Sending OTP..." : "Sign Up"}
                  </button>
                </form>

                <p className="help-text" style={{ marginTop: '15px' }}>
                  Already have an account?{" "}
                  <Link to="/Login" style={{ color: '#d3544b', fontWeight: 600, textDecoration: 'none' }}>
                    Login
                  </Link>
                </p>
              </>
            )}

            {step === "otp" && (
              <div className="login-otp-verification-box">
                <div className="login-otp-icon">
                  <span role="img" aria-label="lock">🔐</span>
                </div>
                <h3>Verify Your Phone</h3>
                <p>
                  Enter the OTP sent to
                  <br />
                  <strong>+91 {phone}</strong>
                </p>

                <div className="tlotp-boxes">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      maxLength="1"
                      type="text"
                      inputMode="numeric"
                      className="tlotp-digit tlotp-square"
                      value={d}
                      onChange={(e) => handleOtpChange(e.target.value, i)}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      onPaste={handleOtpPaste}
                      ref={(ref) => (otpRefs.current[i] = ref)}
                    />
                  ))}
                </div>

                <button
                  className="tllogin-btn"
                  onClick={handleVerifyOtp}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Verifying..." : "Verify & Create Account"}
                </button>

                <p className="tlresend-text">
                  {resendTimer > 0 ? (
                    <>Resend OTP in {resendTimer}s</>
                  ) : (
                    <>
                      Didn't receive the code?{" "}
                      <span className="tlresend-link" onClick={handleResendOtp}>Resend</span>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
