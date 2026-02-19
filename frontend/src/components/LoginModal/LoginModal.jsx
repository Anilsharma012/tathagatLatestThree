import React, { useState, useRef, useEffect } from "react";
import axios from "../../utils/axiosConfig";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "./LoginModal.css";

const LoginModal = ({ isOpen, onClose, setUser, onSwitchToSignup }) => {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setStep("phone");
      setPhone("");
      setOtp(["", "", "", "", "", ""]);
      setError("");
      setSuccess("");
      setLoading(false);
      setResendTimer(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (loading) return;
    setError("");
    setSuccess("");

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/auth/phone/send-otp", { phoneNumber: phone });
      setStep("otp");
      setSuccess("OTP sent successfully!");
      setResendTimer(30);
      setTimeout(() => setSuccess(""), 3000);
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

        if (setUser) setUser(response.data.user);
        setSuccess("Login successful!");

        setTimeout(() => {
          onClose();
          const pendingCourse = localStorage.getItem("pendingCourse");
          const redirectAfterLogin = localStorage.getItem("redirectAfterLogin");

          if (pendingCourse) {
            const course = JSON.parse(pendingCourse);
            localStorage.removeItem("pendingCourse");
            navigate("/course-purchase", { state: course });
          } else if (redirectAfterLogin) {
            localStorage.removeItem("redirectAfterLogin");
            navigate(redirectAfterLogin);
          } else {
            navigate(response.data.redirectTo || "/student/dashboard");
          }
        }, 800);
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
      setSuccess("OTP resent!");
      setResendTimer(30);
      setTimeout(() => setSuccess(""), 3000);
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

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="login-modal-close" onClick={onClose}>&times;</button>

        {error && (
          <div className="login-modal-toast error">
            <span>{error}</span>
            <button onClick={() => setError("")}>&times;</button>
          </div>
        )}
        {success && (
          <div className="login-modal-toast success">{success}</div>
        )}

        <div className="login-modal-header">
          <div className="login-modal-icon">🔒</div>
          <h2>{step === "phone" ? "Welcome Back" : "Verify OTP"}</h2>
          <p>
            {step === "phone"
              ? "Login with your mobile number"
              : `Enter the OTP sent to +91 ${phone}`}
          </p>
        </div>

        {step === "phone" ? (
          <div className="login-modal-body">
            <div className="login-modal-phone-input">
              <span className="login-modal-country-code">+91</span>
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                maxLength={10}
                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
              />
            </div>

            <button
              className="login-modal-btn"
              onClick={handleSendOtp}
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>

            <p className="login-modal-footer-text">
              New User?{" "}
              <span
                className="login-modal-link"
                onClick={() => {
                  onClose();
                  if (onSwitchToSignup) onSwitchToSignup();
                }}
              >
                Sign Up
              </span>
            </p>
          </div>
        ) : (
          <div className="login-modal-body">
            <button className="login-modal-back" onClick={() => { setStep("phone"); setOtp(["","","","","",""]); setError(""); }}>
              <FaArrowLeft /> Change Number
            </button>

            <div className="login-modal-otp-boxes">
              {otp.map((d, i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="login-modal-otp-digit"
                  value={d}
                  onChange={(e) => handleOtpChange(e.target.value, i)}
                  onKeyDown={(e) => handleOtpKeyDown(e, i)}
                  onPaste={handleOtpPaste}
                  ref={(ref) => (otpRefs.current[i] = ref)}
                />
              ))}
            </div>

            <button
              className="login-modal-btn"
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>

            <p className="login-modal-resend">
              {resendTimer > 0 ? (
                <>Resend OTP in {resendTimer}s</>
              ) : (
                <>
                  Didn't receive the code?{" "}
                  <span className="login-modal-link" onClick={handleResendOtp}>Resend</span>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
