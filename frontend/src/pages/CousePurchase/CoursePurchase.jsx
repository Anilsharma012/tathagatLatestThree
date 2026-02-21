import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import "./CoursePurchase.css";
import one from "../../images/one1.png";
import two from "../../images/two2.png";
import three from "../../images/three3.png";
import review from "../../images/REVIEW5.PNG";
import frame from "../../images/frameCourse.png";

import LoginModal from "../../components/LoginModal/LoginModal";

import Chatbox from "../../components/Chat/Chatbox";


const defaultInstructors = [
  { name: "Rajat Tathagat", expertise: "Quant/LRDI", imageUrl: three },
  { name: "Kumar Abhishek", expertise: "Verbal", imageUrl: two },
  { name: "Niraj Naiyar", expertise: "Quant/LRDI", imageUrl: one },
];

const defaultCurriculumData = [
  { sectionTitle: "Welcome! Course Introduction", sectionSubtitle: "What does the course cover?" },
  { sectionTitle: "Foundation Phase – Concept Building", sectionSubtitle: "" },
  { sectionTitle: "Application Phase – Practice & Assignments", sectionSubtitle: "" },
  { sectionTitle: "iCAT Mock Test Series", sectionSubtitle: "" },
  { sectionTitle: "CAT Crash Course – Final Lap", sectionSubtitle: "" },
];

const isValidObjectId = (id) =>
  typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

const CoursePurchase = () => {
  const [openCurriculumIndex, setOpenCurriculumIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [pageContent, setPageContent] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiSettings, setUpiSettings] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [upiSubmitting, setUpiSubmitting] = useState(false);
  const [upiSuccess, setUpiSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { courseId } = useParams();

  const topRef = useRef(null);
  const overviewRef = useRef(null);
  const curriculumRef = useRef(null);
  const instructorRef = useRef(null);
  const reviewsRef = useRef(null);

  const course = location.state || courseData || {
    _id: courseId || "6835a4fcf528e08ff15a566e",
    name: "CAT 2025 Full Course",
    price: 1500,
    description: "Complete CAT preparation course",
    features: [
      "Complete CAT preparation material",
      "Live interactive classes",
      "Mock tests and practice sets",
      "Doubt clearing sessions",
      "Performance analysis",
      "Study materials download",
    ],
    oldPrice: 120000,
  };

  useEffect(() => {
    const fetchContent = async () => {
      const id = courseId || location.state?._id;
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`/api/course-purchase-content/public/${id}`);
        if (res.data.success) {
          if (res.data.content) {
            setPageContent(res.data.content);
          }
          if (res.data.course) {
            setCourseData(res.data.course);
          }
        }
      } catch (error) {
        console.log("Using default content - no custom content configured");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [courseId, location.state]);

  const scrollWithOffset = (element) => {
    if (!element) return;
    const yOffset = -90;
    const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const handleTabClick = (key) => {
    setActiveTab(key);
    const map = {
      overview: overviewRef.current,
      curriculum: curriculumRef.current,
      instructor: instructorRef.current,
      reviews: reviewsRef.current,
    };
    scrollWithOffset(map[key]);
  };

  useEffect(() => {
    const sections = [
      { key: "overview", el: overviewRef.current },
      { key: "curriculum", el: curriculumRef.current },
      { key: "instructor", el: instructorRef.current },
      { key: "reviews", el: reviewsRef.current },
    ].filter((s) => s.el);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const match = sections.find((s) => s.el === visible.target);
          if (match && match.key !== activeTab) setActiveTab(match.key);
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0.1, 0.25, 0.5, 0.75] },
    );

    sections.forEach((s) => observer.observe(s.el));
    return () => observer.disconnect();
  }, [activeTab]);

 
const handleApplyCoupon = async () => {
  if (!couponCode.trim()) return;
  setCouponLoading(true);
  setCouponError("");
  setCouponApplied(null);
  try {
    const token = localStorage.getItem("authToken");
    const activeCourseId = courseId || course?._id;
    const res = await axios.post("/api/coupons/validate", {
      code: couponCode.trim(),
      courseId: activeCourseId,
    }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.data.success) {
      setCouponApplied({
        code: res.data.code,
        discountPercent: res.data.discountPercent,
      });
      setCouponError("");
    }
  } catch (err) {
    setCouponError(err.response?.data?.message || "Invalid coupon code");
    setCouponApplied(null);
  } finally {
    setCouponLoading(false);
  }
};

const handleRemoveCoupon = () => {
  setCouponApplied(null);
  setCouponCode("");
  setCouponError("");
};

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    const src = "https://checkout.razorpay.com/v1/checkout.js";

    // if script already added, wait for it
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    // create new script
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

// ✅ Your COMPLETE handlePayment (drop-in)
const handlePayment = async () => {
  const token = localStorage.getItem("authToken");

  if (!token) {
    setPendingPayment(true);
    setShowLoginModal(true);
    return;
  }

  const activeCourseId = courseId || course?._id;

  if (!activeCourseId) {
    alert("Course information not available. Please go back and select a course.");
    navigate("/");
    return;
  }

  const validId = isValidObjectId(activeCourseId);
  if (!validId) {
    alert("This looks like a demo/mock course. Please select a real published course to purchase.");
    return;
  }

  try {
    const currentPrice =
      pageContent?.heroSection?.currentPrice ??
      course?.price ??
      1500;

    const amountInPaise = Math.round(Number(currentPrice) * 100);

    const courseName =
      pageContent?.heroSection?.mainTitle ??
      course?.name ??
      "Course Purchase";

    // ✅ Create Order
    const orderRes = await fetch("/api/user/payment/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        courseId: activeCourseId,
        couponCode: couponApplied ? couponApplied.code : undefined,
      }),
    });

    // ✅ Network / server error handling
    if (!orderRes.ok) {
      const t = await orderRes.text().catch(() => "");
      console.error("Create order failed:", orderRes.status, t);
      alert("Failed to create order. Please try again.");
      return;
    }

    const orderData = await orderRes.json().catch(() => null);

    if (!orderData?.success || !orderData?.order?.id) {
      console.error("Invalid order response:", orderData);
      alert(orderData?.message || "Failed to create order");
      return;
    }

    // ✅ Load Razorpay SDK (fix)
    const sdkLoaded = await loadRazorpayScript();
    if (!sdkLoaded || !window.Razorpay) {
      alert("Payment system failed to load. Please disable adblock and refresh.");
      return;
    }

    // ✅ Prefill from localStorage if available
    let prefillName = "Student";
    let prefillEmail = "student@example.com";
    let prefillContact = "9999999999";

    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        prefillName = user?.name || prefillName;
        prefillEmail = user?.email || prefillEmail;
        prefillContact = user?.phone || user?.mobile || prefillContact;
      }
    } catch (e) {
      // ignore parse error
    }

    const options = {
      key: orderData?.keyId, // must come from backend
      amount: orderData.order.amount,
      currency: "INR",
      name: "TathaGat Tutorials Pvt. Ltd.",
      description: courseName,
      order_id: orderData.order.id,

      handler: async function (response) {
        try {
          const verifyRes = await fetch("/api/user/payment/verify-and-unlock", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              courseId: activeCourseId,
            }),
          });

          if (!verifyRes.ok) {
            const t = await verifyRes.text().catch(() => "");
            console.error("Verify failed:", verifyRes.status, t);
            alert("Payment verification failed. Please contact support.");
            return;
          }

          const data = await verifyRes.json().catch(() => null);

          if (data?.success) {
            alert("Payment verified & course unlocked!");
            navigate("/student/dashboard", {
              state: { showMyCourses: true, refreshCourses: true },
            });
          } else {
            alert(data?.message || "Payment verification failed");
          }
        } catch (err) {
          console.error("Verification error:", err);
          alert("Verification error. Please try again.");
        }
      },

      prefill: {
        name: prefillName,
        email: prefillEmail,
        contact: prefillContact,
      },

      theme: { color: "#3399cc" },
    };

    const rzp = new window.Razorpay(options);

    rzp.on("payment.failed", function (response) {
      alert(
        "Payment failed: " + (response?.error?.description || "Unknown error")
      );
    });

    rzp.open();
  } catch (err) {
    console.error("Error in handlePayment:", err);
    alert("Something went wrong. Please try again.");
  }
};



const handleUpiClick = async () => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    setPendingPayment(false);
    setShowLoginModal(true);
    return;
  }
  try {
    const res = await axios.get("/api/manual-payment/upi-settings");
    if (res.data.success && res.data.settings && res.data.settings.upiId) {
      setUpiSettings(res.data.settings);
      setShowUpiModal(true);
      setUtrNumber("");
      setPaymentScreenshot(null);
      setUpiSuccess(false);
    } else {
      alert("UPI payment is not available right now. Please use Razorpay.");
    }
  } catch (err) {
    alert("UPI payment is not available right now. Please use Razorpay.");
  }
};

const handleUpiSubmit = async () => {
  if (!utrNumber.trim()) {
    alert("Please enter UTR number");
    return;
  }
  if (!paymentScreenshot) {
    alert("Please upload payment screenshot");
    return;
  }

  const token = localStorage.getItem("authToken");
  const activeCourseId = courseId || course?._id;
  const currentPrice = couponApplied
    ? Math.round(displayPrice - (displayPrice * couponApplied.discountPercent / 100))
    : displayPrice;

  setUpiSubmitting(true);
  try {
    const formData = new FormData();
    formData.append("courseId", activeCourseId);
    formData.append("utrNumber", utrNumber.trim());
    formData.append("amount", currentPrice);
    formData.append("screenshot", paymentScreenshot);
    if (couponApplied) {
      formData.append("couponCode", couponApplied.code);
      formData.append("discountPercent", couponApplied.discountPercent);
      formData.append("originalAmount", displayPrice);
    }

    const res = await axios.post("/api/manual-payment/submit", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    if (res.data.success) {
      setUpiSuccess(true);
    } else {
      alert(res.data.message || "Failed to submit. Please try again.");
    }
  } catch (err) {
    alert(err.response?.data?.message || "Failed to submit. Please try again.");
  } finally {
    setUpiSubmitting(false);
  }
};

  const toggleCurriculum = (index) => {
    setOpenCurriculumIndex(index === openCurriculumIndex ? null : index);
  };

  const heroSection = pageContent?.heroSection || {};
  const aboutSection = pageContent?.aboutSection || {};
  const infoGrid = pageContent?.infoGrid || {};
  const materialBox = pageContent?.materialBox || {};
  const requirementsBox = pageContent?.requirementsBox || {};
  const reviewsSection = pageContent?.reviewsSection || {};
  const curriculumSections = pageContent?.curriculumSections?.length > 0 
    ? pageContent.curriculumSections 
    : defaultCurriculumData;
  const instructors = pageContent?.instructors?.length > 0 
    ? pageContent.instructors 
    : defaultInstructors;

  const defaultPrice = course?.price || 30000;
  const defaultOldPrice = course?.oldPrice || 120000;
  const displayPrice = (heroSection.currentPrice && heroSection.currentPrice > 0) 
    ? heroSection.currentPrice 
    : defaultPrice;
  const displayOldPrice = (heroSection.originalPrice && heroSection.originalPrice > 0) 
    ? heroSection.originalPrice 
    : defaultOldPrice;
  const displayTitle = heroSection.mainTitle || course?.name || "CAT 2025 Full Course IIM ABC Practice Batch";
  const displayBullets = heroSection.keyBullets?.filter(b => b && b.trim())?.length > 0 
    ? heroSection.keyBullets.filter(b => b && b.trim()) 
    : course?.features || [
        "Complete CAT preparation material",
        "Live interactive classes",
        "Mock tests and practice sets",
        "Doubt clearing sessions",
        "Performance analysis",
        "Study materials download",
      ];

  const videoUrl = heroSection.previewVideoUrl || "https://www.youtube.com/embed/aDXkJwqAiP4?si=gtkt5zJpNyAy7LBS";
  
  const displayInfoGrid = {
    instructorName: infoGrid.instructorName || "Kumar Abhishek",
    category: infoGrid.category || "CAT",
    studentsEnrolled: (infoGrid.studentsEnrolled && infoGrid.studentsEnrolled > 0) ? infoGrid.studentsEnrolled : 200,
    reviewScore: infoGrid.reviewScore || "4.8 (Google)"
  };
  
  const displayRating = {
    averageRating: (reviewsSection.averageRating && reviewsSection.averageRating > 0) ? reviewsSection.averageRating : 4.0,
    totalRatings: (reviewsSection.totalRatings && reviewsSection.totalRatings > 0) ? reviewsSection.totalRatings : 6,
    ratingBreakdown: reviewsSection.ratingBreakdown || { fiveStar: 5, fourStar: 1, threeStar: 0, twoStar: 0, oneStar: 0 }
  };

  if (loading) {
    return (
      <div className="course-page container" style={{ textAlign: "center", padding: "50px" }}>
        <p>Loading course details...</p>
      </div>
    );
  }

  return (
    <div ref={topRef} className="course-page container">
      <div className="row">
        <div className="col-lg-9 left-sections">
          <div className="video-banners">
            <iframe
              width="100%"
              height="600"
              src={videoUrl}
              title="Course Intro Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>

          <h2 className="course-title">{displayTitle}</h2>

          <div className="info-grid">
            <div className="info-item">
              <span className="icon">👨‍🏫</span>
              <div>
                <div className="label">Instructor</div>
                <div className="value">{displayInfoGrid.instructorName}</div>
              </div>
            </div>
            <div className="info-item">
              <span className="icon">📚</span>
              <div>
                <div className="label">Category</div>
                <div className="value">{displayInfoGrid.category}</div>
              </div>
            </div>
            <div className="info-item">
              <span className="icon">👥</span>
              <div>
                <div className="label">Students Enrolled</div>
                <div className="value">{displayInfoGrid.studentsEnrolled}</div>
              </div>
            </div>
            <div className="info-item">
              <span className="icon">⭐</span>
              <div>
                <div className="label">Reviews</div>
                <div className="value">{displayInfoGrid.reviewScore}</div>
              </div>
            </div>
          </div>

          <div className="course-tabs-section" ref={overviewRef}>
            <div className="tab-buttons">
              <button
                className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => handleTabClick("overview")}
              >
                Overview
              </button>
              <button
                className={`tab-btn ${activeTab === "curriculum" ? "active" : ""}`}
                onClick={() => handleTabClick("curriculum")}
              >
                Curriculum
              </button>
              <button
                className={`tab-btn ${activeTab === "instructor" ? "active" : ""}`}
                onClick={() => handleTabClick("instructor")}
              >
                Instructor
              </button>
              <button
                className={`tab-btn ${activeTab === "reviews" ? "active" : ""}`}
                onClick={() => handleTabClick("reviews")}
              >
                Reviews
              </button>
            </div>

            <div className="tab-content">
              <h3>{aboutSection.aboutTitle || "About The Course"}</h3>
              <p>{aboutSection.aboutDescription || "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. The purpose of lorem ipsum is to create a natural looking block of text that doesn't distract from the layout."}</p>
              <p>{aboutSection.learningContent || "The passage experienced a surge in popularity during the 1960s when Letraset used it on their dry-transfer sheets, and again during the 90s as desktop publishers bundled the text with their software."}</p>
              <p><strong>{aboutSection.learningHeading || "OR WHAT WILL YOU LEARN??"}</strong></p>
            </div>
          </div>

          <div className="curriculum-wrapper" ref={curriculumRef}>
            <h3>The Course Curriculum</h3>
            {curriculumSections.map((item, index) => (
              <div
                className={`curriculum-item ${openCurriculumIndex === index ? "active" : ""}`}
                key={index}
                onClick={() => toggleCurriculum(index)}
              >
                <div className="curriculum-title">
                  {item.sectionTitle || item.title}
                  <span className="arrow">{openCurriculumIndex === index ? "▾" : "▸"}</span>
                </div>
                {openCurriculumIndex === index && (item.sectionSubtitle || item.content) && (
                  <div className="curriculum-content">{item.sectionSubtitle || item.content}</div>
                )}
              </div>
            ))}
          </div>

          <div className="instructor-section" ref={instructorRef}>
            <h3>Meet Your Instructor</h3>
            <div className="instructor-grid">
              {instructors.map((ins, index) => (
                <div className="instructor-card" key={index}>
                  <div className="instructor-img">
                    <img 
                      src={ins.imageUrl?.startsWith('/uploads') ? ins.imageUrl : (ins.imageUrl || ins.image || one)} 
                      alt={ins.name} 
                    />
                  </div>
                  <div className="instructor-info">
                    <div><strong>Name -</strong> {ins.name}</div>
                    <div><strong>Expertise -</strong> {ins.expertise}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="review-section" ref={reviewsRef}>
            <h3>Our Valuable Reviews</h3>
            <div className="review-layout">
              <div className="rating-summary">
                <div>
                  <div className="rating-score">{displayRating.averageRating}</div>
                  <div className="rating-stars">★★★★★</div>
                  <p className="total-rating">Total {displayRating.totalRatings} Ratings</p>
                </div>

                <div className="rating-bars">
                  {[5, 4, 3, 2, 1].map((star, index) => {
                    const starKeys = ['fiveStar', 'fourStar', 'threeStar', 'twoStar', 'oneStar'];
                    const count = displayRating.ratingBreakdown[starKeys[index]] || 0;
                    const percentage = displayRating.totalRatings > 0 ? (count / displayRating.totalRatings) * 100 : 0;

                    return (
                      <div className="bar-line" key={index}>
                        <span className="star">☆</span> <span>{star}</span>
                        <div className="bar">
                          <div className="fill" style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="count">{count} Rating</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="review-image-box">
                <img src={review} alt="Review Summary" />
              </div>
            </div>
            
            {reviewsSection?.reviews?.length > 0 && (
              <div className="google-style-reviews" style={{ marginTop: '30px' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                  gap: '20px' 
                }}>
                  {reviewsSection.reviews.filter(rev => rev.reviewerImage).map((rev, idx) => (
                    <div key={idx} style={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      overflow: 'hidden'
                    }}>
                      <img 
                        src={rev.reviewerImage.startsWith('http') ? rev.reviewerImage : `/uploads/${rev.reviewerImage}`}
                        alt="Review"
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-md-3 right-section">
          <div className="course-info-box">
            <div className="course-title-box">{displayTitle}</div>

            <div
              style={{
                fontSize: "20px",
                fontWeight: "600",
                marginBottom: "12px",
                color: "#1A237E",
              }}
            >
              {couponApplied ? (
                <>
                  Price:{" "}
                  <span style={{ color: "#D32F2F" }}>
                    ₹{Math.round(displayPrice - (displayPrice * couponApplied.discountPercent / 100))}/-
                  </span>
                  <del style={{ marginLeft: "8px", color: "#888", fontSize: "16px" }}>₹{displayPrice}/-</del>
                  <div style={{ fontSize: "13px", color: "#059669", fontWeight: "500", marginTop: "4px" }}>
                    {couponApplied.discountPercent}% off applied ({couponApplied.code})
                  </div>
                </>
              ) : (
                <>
                  Price:{" "}
                  <span style={{ color: "#D32F2F" }}>₹{displayPrice}/-</span>
                  <del style={{ marginLeft: "8px", color: "#888" }}>₹{displayOldPrice}/-</del>
                </>
              )}
            </div>

            <div
              className="course-description-box"
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                paddingRight: "5px",
                fontSize: "15px",
                color: "#333",
                lineHeight: "1.6",
              }}
            >
              <ul style={{ paddingLeft: "20px", marginBottom: "10px" }}>
                {displayBullets.map((feat, idx) => (
                  <li key={idx} style={{ marginBottom: "6px" }}>{feat}</li>
                ))}
              </ul>
            </div>

            <div className="coupon-section" style={{ marginTop: "16px", marginBottom: "12px" }}>
              {!couponApplied ? (
                <>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                      placeholder="Coupon Code"
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontFamily: "monospace",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                      }}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      style={{
                        padding: "10px 16px",
                        background: "#059669",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "600",
                        fontSize: "13px",
                        cursor: "pointer",
                        opacity: couponLoading || !couponCode.trim() ? 0.6 : 1,
                      }}
                    >
                      {couponLoading ? "..." : "Apply"}
                    </button>
                  </div>
                  {couponError && (
                    <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "6px", marginBottom: 0 }}>
                      {couponError}
                    </p>
                  )}
                </>
              ) : (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#ecfdf5",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #a7f3d0",
                }}>
                  <span style={{ fontSize: "13px", color: "#065f46", fontWeight: "600" }}>
                    {couponApplied.code} - {couponApplied.discountPercent}% OFF
                  </span>
                  <button
                    onClick={handleRemoveCoupon}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#dc2626",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <button
              className="buy-btn"
              style={{
                backgroundColor: "#1A237E",
                fontSize: "16px",
                padding: "12px",
                fontWeight: "600",
                borderRadius: "8px",
                marginTop: "8px",
                transition: "0.3s",
              }}
              onClick={handlePayment}
            >
              Continue with Razorpay
            </button>
            <button
              className="buy-btn"
              style={{
                backgroundColor: "#059669",
                fontSize: "16px",
                padding: "12px",
                fontWeight: "600",
                borderRadius: "8px",
                marginTop: "10px",
                transition: "0.3s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
              onClick={handleUpiClick}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Continue with UPI ID
            </button>
            
            <a
              href="https://wa.me/919205534439?text=Hello%20Tathagat%20Team,%20I%20want%20to%20talk%20to%20a%20counsellor."
              target="_blank"
              rel="noopener noreferrer"
              className="counsellor-btn"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                backgroundColor: "#ff9523",
                color: "#fff",
                fontSize: "16px",
                padding: "12px",
                fontWeight: "600",
                borderRadius: "8px",
                marginTop: "10px",
                textDecoration: "none",
                transition: "0.3s",
                width: "100%",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Talk to Counsellor
            </a>
          </div>

          <div className="material-box">
            <h4>{materialBox.materialHeading || "Material Includes"}</h4>
            <ul className="material-list">
              {(materialBox.materialItems?.length > 0 ? materialBox.materialItems : [
                "Certificate of Completion",
                "444 downloadable resource",
                "Full lifetime access",
                "1300+ Hours of Videos",
                "20 Mocks & 45 Sectional Mocks",
              ]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="material-box">
            <h4>{requirementsBox.requirementsHeading || "Requirements"}</h4>
            <ul className="material-list">
              {(requirementsBox.requirementsItems?.length > 0 ? requirementsBox.requirementsItems : [
                "Required minimum graduation score to appear in CAT",
                "50% For General/OBC & 45% For SC/ST/PwD candidates",
                "Final year bachelor's degree candidates or those awaiting their result are also eligible to appear for the CAT exam.",
                "Candidates with professional qualification such as CA/CS/ICWA can also appear for CAT.",
                "10th or 12th scores do not affect the CAT Eligibility",
              ]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="cat-journey-wrapper">
        <img src={frame} alt="CAT Learning Journey" className="journey-image" />
      </div>
      <Chatbox />

      {showUpiModal && (
        <div className="upi-modal-overlay" onClick={() => { if (!upiSubmitting) setShowUpiModal(false); }}>
          <div className="upi-modal-content" onClick={(e) => e.stopPropagation()}>
            {upiSuccess ? (
              <div className="upi-success-box">
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>&#10003;</div>
                <h3>Payment Submitted Successfully!</h3>
                <p>Your payment details have been sent for verification. Your course will be unlocked once the admin verifies your payment.</p>
                <button
                  className="upi-submit-btn"
                  onClick={() => { setShowUpiModal(false); setUpiSuccess(false); }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="upi-modal-header">
                  <h3>Pay via UPI</h3>
                  <button className="upi-modal-close" onClick={() => setShowUpiModal(false)}>&times;</button>
                </div>
                <div className="upi-modal-body">
                  {upiSettings?.qrCodeImage && (
                    <div className="upi-qr-section">
                      <p style={{ fontWeight: "600", marginBottom: "10px", color: "#333" }}>Scan QR Code to Pay</p>
                      <img
                        src={upiSettings.qrCodeImage}
                        alt="UPI QR Code"
                        className="upi-qr-image"
                      />
                    </div>
                  )}
                  {upiSettings?.upiId && (
                    <div className="upi-id-section">
                      <p style={{ fontWeight: "600", color: "#333", marginBottom: "6px" }}>UPI ID</p>
                      <div className="upi-id-display">
                        <span>{upiSettings.upiId}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(upiSettings.upiId); alert("UPI ID copied!"); }}
                          className="upi-copy-btn"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="upi-amount-display">
                    <span>Amount to Pay:</span>
                    <strong>
                      &#8377;{couponApplied
                        ? Math.round(displayPrice - (displayPrice * couponApplied.discountPercent / 100))
                        : displayPrice}/-
                    </strong>
                  </div>
                  <div className="upi-form-group">
                    <label>Enter UTR Number <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="text"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="Enter 12-digit UTR number"
                      className="upi-input"
                    />
                  </div>
                  <div className="upi-form-group">
                    <label>Upload Screenshot of Payment <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPaymentScreenshot(e.target.files[0])}
                      className="upi-file-input"
                    />
                    {paymentScreenshot && (
                      <p style={{ fontSize: "12px", color: "#059669", marginTop: "4px" }}>
                        Selected: {paymentScreenshot.name}
                      </p>
                    )}
                  </div>
                  <button
                    className="upi-submit-btn"
                    onClick={handleUpiSubmit}
                    disabled={upiSubmitting || !utrNumber.trim() || !paymentScreenshot}
                  >
                    {upiSubmitting ? "Submitting..." : "Submit for Verification"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        setUser={(u) => {
          localStorage.setItem("user", JSON.stringify(u));
        }}
        onSwitchToSignup={() => {
          setShowLoginModal(false);
          navigate("/signup");
        }}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          if (pendingPayment) {
            setPendingPayment(false);
            setTimeout(() => handlePayment(), 500);
          }
        }}
      />
    </div>
  );
};

export default CoursePurchase;
