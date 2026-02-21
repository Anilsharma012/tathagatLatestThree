import React, { useState, useRef, useEffect } from "react";
import axios from "../../utils/axiosConfig";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";
import "./SignupModal.css";

const EXAM_OPTIONS = {
  MBA: ["CAT", "XAT", "MAT", "SNAP"],
  "After 12": ["CUET UG", "IPMAT Indore", "IPMAT Rohtak", "JIPMAT"],
  GMAT: ["Study Abroad", "GRE", "TOEFL", "IELTS"],
  GovtExams: ["Banking SSC", "UPSC", "Railway Exams", "State PSC"],
};

const CATEGORIES = Object.keys(EXAM_OPTIONS);

const SignupModal = ({ isOpen, onClose, setUser, onSwitchToLogin, prefillPhone, onSignupSuccess }) => {
  const [step, setStep] = useState("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setStep("details");
      setName("");
      setPhone("");
      setPassword("");
      setConfirmPassword("");
      setCity("");
      setGender("");
      setDob("");
      setOtp(["", "", "", "", "", ""]);
      setSelectedCategory("");
      setSelectedExam("");
      setError("");
      setSuccess("");
      setLoading(false);
      setResendTimer(0);
    } else if (prefillPhone) {
      setPhone(prefillPhone);
    }
  }, [isOpen, prefillPhone]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((p) => (p <= 1 ? 0 : p - 1)), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");

    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { setError("Please enter a valid 10-digit mobile number."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      await axios.post("/api/auth/phone/register", {
        name: name.trim(),
        phoneNumber: phone,
        password,
        city: city.trim() || undefined,
        gender: gender || undefined,
        dob: dob || undefined,
      });
      setSuccess("OTP sent to your phone!");
      setStep("otp");
      setResendTimer(30);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (loading) return;
    const otpCode = otp.join("");
    if (otpCode.length !== 6) { setError("Please enter the 6-digit OTP."); return; }

    setLoading(true);
    setError("");
    try {
      const response = await axios.post("/api/auth/phone/verify-registration", {
        phoneNumber: phone,
        otpCode,
      });

      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      if (setUser) setUser(response.data.user);

      setSuccess("Registration successful!");
      if (onSignupSuccess) {
        setTimeout(() => {
          onClose();
          onSignupSuccess(response.data.user);
        }, 800);
        return;
      }
      setStep("course");
    } catch (err) {
      setError(err?.response?.data?.message || "OTP verification failed.");
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
      await axios.post("/api/auth/phone/register", {
        name: name.trim(),
        phoneNumber: phone,
        password,
      });
      setSuccess("OTP resent!");
      setResendTimer(30);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to resend OTP.");
      setTimeout(() => setError(""), 4000);
    }
  };

  const handleCourseNext = async () => {
    if (!selectedCategory) { setError("Please select a course category."); return; }
    setError("");

    try {
      const token = localStorage.getItem("authToken");
      await axios.post("/api/user/save-category", { category: selectedCategory }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const storedUser = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem("user", JSON.stringify({ ...storedUser, selectedCategory }));
      setStep("exam");
    } catch (err) {
      setError("Failed to save category. Try again.");
      setTimeout(() => setError(""), 4000);
    }
  };

  const handleExamFinish = async () => {
    if (!selectedExam) { setError("Please select an exam."); return; }
    setError("");

    try {
      const token = localStorage.getItem("authToken");
      await axios.post("/api/user/save-exam", { category: selectedCategory, exam: selectedExam }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const updatedUser = { ...storedUser, selectedExam, selectedCategory };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      if (setUser) setUser(updatedUser);

      setSuccess("All set! Redirecting to dashboard...");
      setTimeout(() => {
        onClose();
        navigate("/student/dashboard");
      }, 1000);
    } catch (err) {
      setError("Failed to save exam. Try again.");
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

  const handleSkipToLogin = () => {
    onClose();
    if (onSwitchToLogin) onSwitchToLogin();
  };

  if (!isOpen) return null;

  return (
    <div className="signup-modal-overlay" onClick={onClose}>
      <div className="signup-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="signup-modal-close" onClick={onClose}>&times;</button>

        {error && (
          <div className="signup-modal-toast error">
            <span>{error}</span>
            <button onClick={() => setError("")}>&times;</button>
          </div>
        )}
        {success && (
          <div className="signup-modal-toast success">{success}</div>
        )}

        {step === "details" && (
          <>
            <div className="signup-modal-header">
              <div className="signup-modal-icon">📝</div>
              <h2>Create Account</h2>
              <p>Fill in your details to get started</p>
            </div>
            <form className="signup-modal-form" onSubmit={handleRegister}>
              <input
                type="text"
                placeholder="Full Name *"
                className="signup-modal-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="signup-modal-phone-input">
                <span className="signup-modal-country-code">+91</span>
                <input
                  type="tel"
                  placeholder="Mobile Number *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
                />
              </div>
              <div className="signup-modal-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password * (min 6 chars)"
                  className="signup-modal-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span className="signup-modal-eye" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              <div className="signup-modal-password-wrap">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm Password *"
                  className="signup-modal-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <span className="signup-modal-eye" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              <input
                type="text"
                placeholder="City (optional)"
                className="signup-modal-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <div className="signup-modal-row">
                <select
                  className="signup-modal-input signup-modal-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="date"
                  className="signup-modal-input signup-modal-date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <button type="submit" className="signup-modal-btn" disabled={loading}>
                {loading ? "Sending OTP..." : "Sign Up"}
              </button>
            </form>
            <p className="signup-modal-footer-text">
              Already have an account?{" "}
              <span className="signup-modal-link" onClick={handleSkipToLogin}>Login</span>
            </p>
          </>
        )}

        {step === "otp" && (
          <>
            <div className="signup-modal-header">
              <div className="signup-modal-icon">🔐</div>
              <h2>Verify Your Phone</h2>
              <p>Enter the OTP sent to +91 {phone}</p>
            </div>
            <div className="signup-modal-body">
              <button className="signup-modal-back" onClick={() => setStep("details")}>
                <FaArrowLeft /> Back
              </button>
              <div className="signup-modal-otp-boxes">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="signup-modal-otp-digit"
                    value={d}
                    onChange={(e) => handleOtpChange(e.target.value, i)}
                    onKeyDown={(e) => handleOtpKeyDown(e, i)}
                    onPaste={handleOtpPaste}
                    ref={(ref) => (otpRefs.current[i] = ref)}
                  />
                ))}
              </div>
              <button className="signup-modal-btn" onClick={handleVerifyOtp} disabled={loading}>
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>
              <p className="signup-modal-resend">
                {resendTimer > 0 ? (
                  <>Resend OTP in {resendTimer}s</>
                ) : (
                  <>
                    Didn't receive the code?{" "}
                    <span className="signup-modal-link" onClick={handleResendOtp}>Resend</span>
                  </>
                )}
              </p>
            </div>
          </>
        )}

        {step === "course" && (
          <>
            <div className="signup-modal-header">
              <div className="signup-modal-icon">📚</div>
              <h2>Select Course Category</h2>
              <p>What are you preparing for?</p>
            </div>
            <div className="signup-modal-body">
              <div className="signup-modal-course-grid">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`signup-modal-course-card ${selectedCategory === cat ? "selected" : ""}`}
                    onClick={() => { setSelectedCategory(cat); setSelectedExam(""); }}
                  >
                    <span className="course-card-icon">
                      {cat === "MBA" ? "🎓" : cat === "After 12" ? "🏫" : cat === "GMAT" ? "🌍" : "🏛️"}
                    </span>
                    <span>{cat}</span>
                  </button>
                ))}
              </div>
              <button
                className="signup-modal-btn"
                onClick={handleCourseNext}
                disabled={!selectedCategory}
              >
                Next
              </button>
              <button className="signup-modal-skip" onClick={() => { onClose(); navigate("/student/dashboard"); }}>
                Skip for now
              </button>
            </div>
          </>
        )}

        {step === "exam" && (
          <>
            <div className="signup-modal-header">
              <div className="signup-modal-icon">🎯</div>
              <h2>Select Exam</h2>
              <p>Choose your target exam in {selectedCategory}</p>
            </div>
            <div className="signup-modal-body">
              <button className="signup-modal-back" onClick={() => setStep("course")}>
                <FaArrowLeft /> Back to Categories
              </button>
              <div className="signup-modal-exam-grid">
                {(EXAM_OPTIONS[selectedCategory] || []).map((exam) => (
                  <button
                    key={exam}
                    className={`signup-modal-exam-card ${selectedExam === exam ? "selected" : ""}`}
                    onClick={() => setSelectedExam(exam)}
                  >
                    {exam}
                  </button>
                ))}
              </div>
              <button
                className="signup-modal-btn"
                onClick={handleExamFinish}
                disabled={!selectedExam}
              >
                Finish & Go to Dashboard
              </button>
              <button className="signup-modal-skip" onClick={() => { onClose(); navigate("/student/dashboard"); }}>
                Skip for now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SignupModal;
