import React, { useState, useEffect, useRef } from "react";
import "./Login.css";
import axios from "../../utils/axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import TGLOGO from "../../images/tgLOGO.png";
import { FaArrowLeft } from "react-icons/fa";

const Login = ({ onClose, setUser }) => {
  const [step, setStep] = useState("welcome");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  const phoneInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkExistingLogin = async () => {
      const token = localStorage.getItem("authToken");
      const user = localStorage.getItem("user");

      if (token && user) {
        try {
          const response = await axios.get("/api/user/verify-token", {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data.status || response.data.user) {
            setToastMessage("Already logged in! Redirecting...");
            if (onClose && typeof onClose === 'function') {
              onClose();
            }
            setTimeout(() => {
              handlePostLoginRedirect(response.data.redirectTo || "/student/dashboard");
            }, 500);
            return;
          }
        } catch (err) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
        }
      }
      setIsCheckingAuth(false);
    };

    checkExistingLogin();
  }, []);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (step === "phone" && phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  }, [step]);

  const handlePostLoginRedirect = (serverRedirectTo) => {
    const pendingCourse = localStorage.getItem('pendingCourse');
    const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');

    if (pendingCourse) {
      const course = JSON.parse(pendingCourse);
      localStorage.removeItem('pendingCourse');
      navigate('/course-purchase', {
        state: {
          ...course,
          price: course.price || 30000,
          oldPrice: course.oldPrice || 120000,
          features: [
            'Complete CAT preparation material',
            'Live interactive classes',
            'Mock tests and practice sets',
            'Doubt clearing sessions',
            'Performance analysis',
            'Study materials download'
          ]
        }
      });
    } else if (redirectAfterLogin) {
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectAfterLogin);
    } else {
      navigate(serverRedirectTo || "/student/dashboard");
    }
  };

  const handleSendOtp = async () => {
    if (loading) return;
    setError("");
    setToastMessage("");

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/auth/phone/send-otp", { phoneNumber: phone });
      setStep("otp");
      setToastMessage("OTP sent successfully!");
      setResendTimer(30);
      setTimeout(() => setToastMessage(""), 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to send OTP.";
      setError(msg);
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (loading) return;
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await axios.post("/api/auth/phone/mobileVerify-otp", {
        phoneNumber: phone,
        otpCode,
      });

      if (response.data.token) {
        localStorage.setItem("authToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        if (setUser && typeof setUser === 'function') {
          setUser(response.data.user);
        }

        setToastMessage("Login successful!");

        setTimeout(() => {
          if (onClose && typeof onClose === 'function') {
            onClose();
          }
          handlePostLoginRedirect(response.data.redirectTo);
        }, 1000);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Invalid OTP. Please try again.";
      setError(msg);
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setOtp(["", "", "", "", "", ""]);
    setError("");
    try {
      await axios.post("/api/auth/phone/send-otp", { phoneNumber: phone });
      setToastMessage("OTP resent!");
      setResendTimer(30);
      setTimeout(() => setToastMessage(""), 3000);
    } catch (err) {
      setError("Failed to resend OTP.");
      setTimeout(() => setError(""), 4000);
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

  if (isCheckingAuth) {
    return (
      <div className="tllogin-fullscreen-wrapper">
        <div className="tllogin-popup" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>Loading...</div>
            <p>Checking login status...</p>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="tllogin-right-panel">
          <div className="tllogin-box">
            {step === "welcome" && (
              <>
                <div className="tllogin-lock-icon">🔒</div>
                <h2>Welcome to TathaGat</h2>
                <p>Let's get started</p>

                <button
                  className="tllogin-btn"
                  onClick={() => setStep("phone")}
                >
                  Login with phone number
                </button>

                <p className="help-text" style={{ marginTop: '20px' }}>
                  Don't have an account?{" "}
                  <Link to="/signup" style={{ color: '#d3544b', fontWeight: 600, textDecoration: 'none' }}>
                    Sign Up
                  </Link>
                </p>
              </>
            )}

            {step === "phone" && (
              <>
                <div className="tllogin-back-icon" onClick={() => setStep("welcome")}>
                  <FaArrowLeft /> Back
                </div>
                <div className="tllogin-lock-icon">🔒</div>
                <h2>Enter Phone Number</h2>
                <p>We'll send you an OTP to verify</p>

                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  className="tlotp-input"
                  value={phone}
                  ref={phoneInputRef}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                />

                <button
                  className="tllogin-btn"
                  onClick={handleSendOtp}
                  disabled={loading}
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </>
            )}

            {step === "otp" && (
              <>
                <div className="tllogin-back-icon" onClick={() => { setStep("phone"); setOtp(["","","","","",""]); setError(""); }}>
                  <FaArrowLeft /> Change Number
                </div>
                <div className="tllogin-lock-icon">🔐</div>
                <h2>Verify OTP</h2>
                <p>Enter the OTP sent to +91 {phone}</p>

                <div className="tlotp-boxes">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="tlotp-digit"
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
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify & Login"}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
