import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import DOMPurify from 'isomorphic-dompurify';
import { FaLock, FaUnlock, FaTimes, FaPlay } from 'react-icons/fa';
import LoginModal from '../LoginModal/LoginModal';
import SignupModal from '../SignupModal/SignupModal';
import './CoursePreviewModal.css';

const CoursePreviewModal = ({ course, onClose, isEnrolled }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [prefillPhone, setPrefillPhone] = useState("");
  const [pendingPayment, setPendingPayment] = useState(false);
  const navigate = useNavigate();

  const isValidObjectId = (id) => /^[a-fA-F0-9]{24}$/.test(id);

  const handlePayment = async () => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      setPendingPayment(true);
      setShowLoginModal(true);
      return;
    }

    const activeCourseId = course._id;

    if (!activeCourseId) {
      alert("Course information not available.");
      return;
    }

    const validId = isValidObjectId(activeCourseId);

    if (process.env.NODE_ENV === "development") {
      const confirmed = window.confirm("Development Mode: Skip payment and directly unlock course?");
      if (confirmed) {
        try {
          setPaymentLoading(true);
          const response = await fetch("/api/user/payment/verify-and-unlock", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              razorpay_order_id: "dev_order_" + Date.now(),
              razorpay_payment_id: "dev_payment_" + Date.now(),
              razorpay_signature: "dev_signature",
              courseId: activeCourseId,
              devMode: true,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              alert("Course unlocked successfully!");
              onClose();
              navigate("/student/dashboard", {
                state: { showMyCourses: true, refreshCourses: true },
              });
              return;
            }
          }
          alert("Development unlock failed, proceeding with normal payment...");
        } catch (error) {
          console.error("Development unlock error:", error);
        } finally {
          setPaymentLoading(false);
        }
      }
    }

    if (!validId) {
      alert("This looks like a demo course. Please select a real published course to purchase.");
      return;
    }

    try {
      setPaymentLoading(true);
      
      // Check if already enrolled
      const checkRes = await fetch("/api/user/student/my-courses", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const enrolled = Array.isArray(checkData?.courses) ? checkData.courses : [];
        const alreadyUnlocked = enrolled.some((c) => {
          const enrolledCourseId = (c?.courseId && (c.courseId._id || c.courseId)) || c?._id || c?.id;
          if (!enrolledCourseId) return false;
          return enrolledCourseId.toString() === activeCourseId.toString();
        });
        if (alreadyUnlocked) {
          alert("You have already purchased this course.");
          setPaymentLoading(false);
          return;
        }
      }

      const currentPrice = course?.price || 1500;
      let amountInPaise = Math.round(currentPrice * 100);
      let courseName = course?.name || "Course Purchase";

      if (!window.Razorpay) {
        alert("Razorpay SDK not loaded. Please refresh the page.");
        setPaymentLoading(false);
        return;
      }

      // Create order
      const orderRes = await fetch("/api/user/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: activeCourseId,
          amount: amountInPaise,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        alert(orderData.message || "Failed to create payment order");
        setPaymentLoading(false);
        return;
      }

      const options = {
        key: orderData.key,
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

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              alert("Payment successful! Course unlocked.");
              onClose();
              navigate("/student/dashboard", {
                state: { showMyCourses: true, refreshCourses: true },
              });
            } else {
              alert(verifyData.message || "Payment verification failed");
            }
          } catch (err) {
            console.error("Payment verification error:", err);
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: localStorage.getItem("userName") || "",
          email: localStorage.getItem("userEmail") || "",
          contact: localStorage.getItem("userPhone") || "",
        },
        theme: { color: "#1A237E" },
        modal: {
          ondismiss: function () {
            setPaymentLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    if (course && course._id && course.courseType === 'recorded_classes') {
      fetchVideos();
    } else {
      setLoading(false);
    }
  }, [course]);

  const fetchVideos = async () => {
    try {
      const res = await axios.get(`/api/courses/${course._id}/videos`);
      setVideos(res.data.videos || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video) => {
    if (video.isFree) {
      setSelectedVideo(video);
    } else if (!isEnrolled) {
      // Navigate to buy page for paid videos
      navigate(`/course-purchase/${course._id}`, { state: course });
    } else {
      setSelectedVideo(video);
    }
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    
    // YouTube URL conversion
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : new URLSearchParams(new URL(url).search).get('v');
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    
    // Vimeo URL conversion
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }
    
    // Direct video file or uploaded file
    if (url.startsWith('http') || url.startsWith('/uploads/')) {
      return url.startsWith('http') ? url : `/uploads/${url}`;
    }
    
    return `/uploads/${url}`;
  };

  const groupVideosByTopic = () => {
    const grouped = {};
    videos.forEach(video => {
      const topic = video.topicName || 'General';
      if (!grouped[topic]) grouped[topic] = [];
      grouped[topic].push(video);
    });
    return grouped;
  };

  const sanitizeHTML = (html) => {
    return { __html: DOMPurify.sanitize(html) };
  };

  const groupedVideos = groupVideosByTopic();

  return (
    <div className="course-preview-overlay" onClick={onClose}>
      <div className="course-preview-modal" onClick={(e) => e.stopPropagation()}>
        <button className="course-preview-close" onClick={onClose}>
          <FaTimes />
        </button>

        <div className="course-preview-header">
          <h2>{course.name}</h2>
          <div className="course-preview-price">₹{course.price}</div>
        </div>

        <div className="course-preview-body">
          {/* Course Description */}
          <div className="course-preview-section">
            <h3>📝 Course Description</h3>
            <div 
              className="course-description-content" 
              dangerouslySetInnerHTML={sanitizeHTML(course.description || 'No description available')}
            />
          </div>

          {/* Overview Section */}
          {course.overview && (
            <div className="course-preview-section">
              <h3>📚 Course Overview</h3>
              {course.overview.about && (
                <div className="overview-item">
                  <strong>About:</strong>
                  <p>{course.overview.about}</p>
                </div>
              )}
              {course.overview.description && (
                <div className="overview-item">
                  <strong>Overview Description:</strong>
                  <p>{course.overview.description}</p>
                </div>
              )}
              {course.overview.materialIncludes && course.overview.materialIncludes.length > 0 && (
                <div className="overview-item">
                  <strong>What's Included:</strong>
                  <ul>
                    {course.overview.materialIncludes.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {course.overview.requirements && course.overview.requirements.length > 0 && (
                <div className="overview-item">
                  <strong>Requirements:</strong>
                  <ul>
                    {course.overview.requirements.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {course.overview.videoUrl && (
                <div className="overview-item">
                  <strong>Preview Video:</strong>
                  <div style={{ marginTop: '10px' }}>
                    <button 
                      onClick={() => setSelectedVideo({ 
                        title: 'Course Preview Video', 
                        videoUrl: course.overview.videoUrl,
                        isFree: true
                      })}
                      style={{
                        backgroundColor: '#27ae60',
                        color: 'white',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <FaPlay /> Watch Preview
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Free Resources Section */}
          {course.courseType === 'recorded_classes' && !loading && videos.length > 0 && (
            (() => {
              const freeVideos = videos.filter(v => v.isFree);
              return freeVideos.length > 0 ? (
                <div className="course-preview-section free-resources-section" style={{
                  backgroundColor: '#e8f8f5',
                  border: '2px solid #27ae60',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <h3 style={{ color: '#27ae60', marginBottom: '15px' }}>
                    🎁 Free Resources ({freeVideos.length} Videos)
                  </h3>
                  <p style={{ color: '#555', marginBottom: '15px', fontSize: '14px' }}>
                    ✨ Watch these free videos without enrolling! Click any video below to start learning.
                  </p>
                  <div className="free-videos-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {freeVideos
                      .sort((a, b) => a.serialNumber - b.serialNumber)
                      .map((video) => (
                        <div
                          key={video._id}
                          className="free-video-link"
                          onClick={() => handleVideoClick(video)}
                          style={{
                            backgroundColor: 'white',
                            padding: '12px 15px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: '1px solid #d1f2eb',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(5px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(39, 174, 96, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                          }}
                        >
                          <div style={{
                            backgroundColor: '#27ae60',
                            color: 'white',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FaPlay />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                              #{video.serialNumber} - {video.title}
                            </div>
                            {video.topicName && (
                              <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                                📚 {video.topicName}
                                {video.duration && <span> • ⏱️ {video.duration}</span>}
                              </div>
                            )}
                          </div>
                          <span style={{
                            backgroundColor: '#27ae60',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            flexShrink: 0
                          }}>
                            PLAY FREE
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null;
            })()
          )}

          {/* Videos Section (for Recorded Classes) */}
          {course.courseType === 'recorded_classes' && (
            <div className="course-preview-section">
              <h3>🎥 Course Videos</h3>
              {loading ? (
                <p>Loading videos...</p>
              ) : videos.length === 0 ? (
                <p>No videos available yet.</p>
              ) : (
                <div className="videos-by-topic">
                  {Object.entries(groupedVideos).map(([topic, topicVideos]) => (
                    <div key={topic} className="topic-group">
                      <h4 className="topic-title">{topic}</h4>
                      <div className="video-list">
                        {topicVideos
                          .sort((a, b) => a.serialNumber - b.serialNumber)
                          .map((video) => (
                            <div
                              key={video._id}
                              className={`video-item ${!video.isFree && !isEnrolled ? 'locked' : 'unlocked'}`}
                              onClick={() => handleVideoClick(video)}
                              style={{ 
                                cursor: video.isFree || isEnrolled ? 'pointer' : 'not-allowed',
                                opacity: !video.isFree && !isEnrolled ? 0.6 : 1
                              }}
                            >
                              <div className="video-item-icon">
                                {video.isFree || isEnrolled ? (
                                  <FaPlay className="play-icon" style={{ color: '#27ae60' }} />
                                ) : (
                                  <FaLock className="lock-icon" />
                                )}
                              </div>
                              <div className="video-item-info">
                                <div className="video-item-title" style={{ 
                                  color: video.isFree || isEnrolled ? '#2c3e50' : '#95a5a6',
                                  fontWeight: video.isFree ? '600' : '500'
                                }}>
                                  #{video.serialNumber} - {video.title}
                                  {video.isFree && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#27ae60' }}>▶ Click to Play</span>}
                                </div>
                                {video.duration && (
                                  <div className="video-item-duration">{video.duration}</div>
                                )}
                                {video.videoUrl && video.isFree && (
                                  <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '3px' }}>
                                    🔗 {video.videoUrl.substring(0, 50)}...
                                  </div>
                                )}
                              </div>
                              <div className="video-item-badge">
                                {video.isFree ? (
                                  <span className="free-badge" style={{ 
                                    backgroundColor: '#27ae60',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                  }}>🔓 FREE</span>
                                ) : (
                                  <span className="paid-badge" style={{
                                    backgroundColor: '#e74c3c',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                  }}>🔒 {isEnrolled ? 'UNLOCK' : 'BUY TO UNLOCK'}</span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Video Player */}
          {selectedVideo && (
            <div className="video-player-section">
              <div className="video-player-header">
                <h4>▶️ {selectedVideo.title}</h4>
                <button onClick={() => setSelectedVideo(null)}>Close Player</button>
              </div>
              <div className="video-player-wrapper">
                {getEmbedUrl(selectedVideo.videoUrl)?.includes('youtube.com') || 
                 getEmbedUrl(selectedVideo.videoUrl)?.includes('vimeo.com') ? (
                  <iframe
                    src={getEmbedUrl(selectedVideo.videoUrl)}
                    title={selectedVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video controls autoPlay>
                    <source src={getEmbedUrl(selectedVideo.videoUrl)} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
              {selectedVideo.description && (
                <div className="video-description">
                  <strong>Description:</strong>
                  <p>{selectedVideo.description}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="course-preview-footer">
          {!isEnrolled && (
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                className="details-btn" 
                onClick={() => navigate(`/course-purchase/${course._id}`, { state: course })}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  border: '2px solid #1A237E',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  color: '#1A237E',
                  cursor: 'pointer',
                  transition: '0.3s'
                }}
              >
                Details
              </button>
              <button 
                className="enroll-btn" 
                onClick={handlePayment}
                disabled={paymentLoading}
              >
                {paymentLoading ? 'Processing...' : `Enroll Now - ₹${course.price}`}
              </button>
            </div>
          )}
          {isEnrolled && (
            <div className="enrolled-badge">✅ You are enrolled in this course</div>
          )}
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        setUser={() => {}}
        onSwitchToSignup={(phoneFromLogin) => {
          setShowLoginModal(false);
          setPrefillPhone(phoneFromLogin || "");
          setShowSignupModal(true);
        }}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          if (pendingPayment) {
            setPendingPayment(false);
            setTimeout(() => handlePayment(), 500);
          }
        }}
      />
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        setUser={() => {}}
        onSwitchToLogin={() => {
          setShowSignupModal(false);
          setPrefillPhone("");
          setShowLoginModal(true);
        }}
        prefillPhone={prefillPhone}
        onSignupSuccess={() => {
          setShowSignupModal(false);
          if (pendingPayment) {
            setPendingPayment(false);
            setTimeout(() => handlePayment(), 500);
          }
        }}
      />
    </div>
  );
};

export default CoursePreviewModal;
