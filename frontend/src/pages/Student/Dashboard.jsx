import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Dashboard.css";
import "./Dashboard-purchases.css";
import { fetchPublishedCourses, fetchMyCourses } from "../../utils/api";
import DiscussionForum from "../../components/DiscussionForum/DiscussionForum";
import MockTestPage from "./MockTests/MockTestPage";
import StudentLiveClasses from "./LiveClasses/StudentLiveClasses";
import { fetchLiveClasses } from "../../utils/liveClassesApi";


 import { Link } from "react-router-dom";
import {
  getCache as getLiveCache,
  setCache as setLiveCache,
  shouldRevalidate as shouldRevalidateLive,
} from "../../utils/liveClassesCache";
import NextStepCard from "../../components/Student/NextStep/NextStepCard";
import {
  FiHome,
  FiBook,
  FiVideo,
  FiEdit3,
  FiTarget,
  FiBarChart2,
  FiMessageCircle,
  FiDownload,
  FiCalendar,
  FiBell,
  FiUser,
  FiSearch,
  FiMenu,
  FiX,
  FiChevronDown,
  FiPlay,
  FiClock,
  FiTrendingUp,
  FiCheckCircle,
  FiEye,
  FiFileText,
  FiLogOut,
  FiPhone,
} from "react-icons/fi";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import logo from "../../images/tgLOGO.png";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
);

const StudentDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lmsMainRef = useRef(null);

  const getInitialSection = () => {
    const params = new URLSearchParams(location.search);
    return params.get("section") || "dashboard";
  };

  const [activeSection, setActiveSection] = useState(getInitialSection);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState(null);
  const [userDetails, setUserDetails] = useState({
    name: "Student",
    email: "student@example.com",
    profileImage: null,
    // streak/totalPoints intentionally omitted
  });
  const [myCourses, setMyCourses] = useState([]);
  const [myCoursesLoading, setMyCoursesLoading] = useState(false);
  const [courseProgress, setCourseProgress] = useState({});
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [liveSessions, setLiveSessions] = useState({ upcoming: [], past: [] });
  const [liveSessionsLoading, setLiveSessionsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Dashboard metrics state (real data)
  const [dashboardMetrics, setDashboardMetrics] = useState({
    testsTaken: 0,
    completionRate: 0,
    learningProgress: [],
    coursesEnrolled: 0,
    // streak data not used here
  });
  const [dashboardMetricsLoading, setDashboardMetricsLoading] = useState(false);
  const [courseProgressData, setCourseProgressData] = useState({
    courses: [],
    summary: {
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      chartData: [0, 0, 100],
    },
  });
  const [courseProgressLoading, setCourseProgressLoading] = useState(false);

  // Sanitize/clean HTML descriptions from editor (e.g., remove ql-cursor span, tags -> text)
  const cleanHtmlToText = (html) => {
    try {
      const withoutCursor = String(html || "")
        .replace(/<span[^>]*class=["']?ql-[^>]*>.*?<\/span>/gi, "")
        .replace(/<br\s*\/?>(?=\s*<)/gi, "\n");
      const div = document.createElement("div");
      div.innerHTML = withoutCursor;
      const text = div.textContent || div.innerText || "";
      return text.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
    } catch (e) {
      return typeof html === "string"
        ? html
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        : "";
    }
  };

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const previewRef = useRef(null);

  // Payment History and Receipts state
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const purchasesLoadedRef = useRef(false);

  // Receipt view modal state
  const [viewReceiptModal, setViewReceiptModal] = useState(false);
  const [viewReceiptHtml, setViewReceiptHtml] = useState("");
  const [viewReceiptLoading, setViewReceiptLoading] = useState(false);

  // Offline payment upload state
  const [offlineForm, setOfflineForm] = useState({
    courseId: "",
    amount: "",
    note: "",
  });
  const [offlineFile, setOfflineFile] = useState(null);
  const [offlineUploading, setOfflineUploading] = useState(false);

  const onOfflineField = (k, v) =>
    setOfflineForm((prev) => ({ ...prev, [k]: v }));

  const submitOfflinePayment = async (e) => {
    e.preventDefault();
    if (!offlineForm.courseId || !offlineForm.amount || !offlineFile) return;
    try {
      setOfflineUploading(true);
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("auth");
      const fd = new FormData();
      fd.append("courseId", offlineForm.courseId);
      fd.append("amount", String(Math.round(Number(offlineForm.amount) * 100)));
      if (offlineForm.note) fd.append("note", offlineForm.note);
      fd.append("slip", offlineFile);

      const resp = await fetch("/api/payments/offline/submit", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      const contentType = resp.headers.get("content-type") || "";
      let body = null;
      try {
        if (!resp.bodyUsed) {
          const respClone = resp.clone();
          if (contentType.includes("application/json"))
            body = await respClone.json();
          else body = await respClone.text();
        } else {
          try {
            if (contentType.includes("application/json"))
              body = await resp.json();
            else body = await resp.text();
          } catch (innerErr) {
            console.warn(
              "Response body already used and could not parse:",
              innerErr,
            );
            body = null;
          }
        }
      } catch (parseErr) {
        console.warn("Could not parse response body:", parseErr);
        body = null;
      }

      if (!resp.ok) {
        const msg =
          body && body.message
            ? body.message
            : typeof body === "string"
              ? body
              : "Upload failed";
        console.error("offline submit failed:", resp.status, msg);
        alert(msg);
        return;
      }

      alert("Offline slip uploaded successfully — pending review");
      setOfflineForm({ courseId: "", amount: "", note: "" });
      setOfflineFile(null);
      // Refresh lists
      loadPaymentHistory();
    } catch (err) {
      console.error("offline submit error:", err);
      alert(err.message || "Upload failed");
    } finally {
      setOfflineUploading(false);
    }
  };

  // Study Materials state
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialFilters, setMaterialFilters] = useState({
    subject: "All Subjects",
    type: "All Types",
  });
  const [materialViewerOpen, setMaterialViewerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materialViewerLoading, setMaterialViewerLoading] = useState(false);
  const [materialPdfUrl, setMaterialPdfUrl] = useState(null);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementFilters, setAnnouncementFilters] = useState({
    type: "all",
  });

  // Analytics state for Analysis & Reports
  const [analyticsData, setAnalyticsData] = useState({
    summary: null,
    attempts: [],
    performanceTrend: [],
    sectionAnalysis: [],
    userRank: null,
    totalParticipants: 0,
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedTestForLeaderboard, setSelectedTestForLeaderboard] =
    useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    city: "",
    targetExam: "CAT 2024",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const profileImageInputRef = useRef(null);
  const profileDropdownRef = useRef(null);

  // Load user data from localStorage
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedAuthToken = localStorage.getItem("authToken");

    if (storedUser && storedAuthToken) {
      setUserDetails({
        name: storedUser.name || "Student",
        email:
          storedUser.email || storedUser.phoneNumber || "student@example.com",
        profileImage: storedUser.profilePic || null,
        // streak/points not tracked in dashboard state
      });

      // Also update profile form
      setProfileForm({
        name: storedUser.name || "",
        email: storedUser.email || "",
        phoneNumber: storedUser.phoneNumber || "",
        city: storedUser.city || "",
        targetExam: storedUser.selectedExam || "CAT 2024",
      });
    }
  }, []);

  // Profile update handler
  const handleProfileUpdate = async () => {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      alert("Please login first!");
      return;
    }

    setProfileSaving(true);
    try {
      const response = await fetch("/api/user/update-details", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileForm),
      });

      const data = await response.json();

      if (data.status || data.success || response.ok) {
        // Backend returns user in data.data, not data.user
        const userData = data.data || data.user || {};

        // Update localStorage
        const storedUser = JSON.parse(localStorage.getItem("user")) || {};
        const updatedUser = { ...storedUser, ...userData };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Update state with null checking
        if (userData && Object.keys(userData).length > 0) {
          setUserDetails((prev) => ({
            ...prev,
            name: userData.name || prev.name,
            email: userData.email || prev.email,
            profileImage: userData.profilePic || prev.profileImage,
          }));
        }

        alert("Profile updated successfully!");
      } else {
        alert(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Profile image upload handler
  const handleProfileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      alert("Please login first!");
      return;
    }

    setProfileImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("profilePic", file);

      const response = await fetch("/api/user/upload-profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.status || data.success) {
        // Backend returns profilePic in data.profilePic
        const imageUrl =
          data.profilePic || data.url || (data.data && data.data.profilePic);

        // Update localStorage
        const storedUser = JSON.parse(localStorage.getItem("user")) || {};
        storedUser.profilePic = imageUrl;
        localStorage.setItem("user", JSON.stringify(storedUser));

        // Update state
        setUserDetails((prev) => ({
          ...prev,
          profileImage: imageUrl,
        }));

        alert("Profile picture updated!");
      } else {
        alert(data.msg || data.message || "Failed to upload image");
      }
    } catch (error) {
      console.error("Profile image upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setProfileImageUploading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileDropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("auth");
    localStorage.removeItem("user");
    navigate("/");
  };

  // Function to load courses (can be called for retry)
  const loadCourses = async () => {
    setCoursesLoading(true);
    setCoursesError(null);

    // Test API connectivity first
    try {
      console.log("🔍 Testing API connectivity...");
      const testResponse = await fetch("/api/test");
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log("✅ API test successful:", testData);
      } else {
        console.log("❌ API test failed:", testResponse.status);
      }
    } catch (testError) {
      console.log("❌ API test error:", testError);
    }

    try {
      const response = await fetchPublishedCourses();
      if (response.success) {
        setCourses(response.courses || []);
      } else {
        setCoursesError("Failed to load courses");
      }
    } catch (error) {
      console.error("Error loading courses:", error);
      console.error("Full error object:", error);

      // Set a more user-friendly error message
      if (error.message.includes("Cannot connect")) {
        setCoursesError(
          "Unable to load courses at the moment. Please check your internet connection and try again.",
        );
      } else {
        setCoursesError(error.message || "Failed to load courses");
      }

      // Don't set fallback data here - let backend handle it
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  // Function to load user's enrolled courses
  const loadMyCourses = async () => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      console.warn("⚠️ No auth token found. User not logged in.");
      setMyCourses([]);
      return;
    }

    setMyCoursesLoading(true);
    console.log("🔄 loadMyCourses: Starting to fetch courses...");

    try {
      // Use centralized API helper which handles auth headers and network errors
      const data = await fetchMyCourses();
      console.log("📦 My Courses Response:", data);

      // Handle different response formats
      let coursesArray = [];
      if (Array.isArray(data.courses)) {
        coursesArray = data.courses;
        console.log("✅ Using data.courses array");
      } else if (Array.isArray(data)) {
        coursesArray = data;
        console.log("✅ Using data as array");
      } else if (data.data && Array.isArray(data.data)) {
        coursesArray = data.data;
        console.log("✅ Using data.data array");
      } else if (Array.isArray(data.enrolledCourses)) {
        coursesArray = data.enrolledCourses;
        console.log("✅ Using data.enrolledCourses");
      } else if (Array.isArray(data.unlockedCourses)) {
        coursesArray = data.unlockedCourses;
        console.log("✅ Using data.unlockedCourses");
      } else {
        console.warn("⚠️ No courses array found in response:", data);
      }

      console.log("📚 Final courses array:", coursesArray);
      console.log("📊 Setting courses count:", coursesArray.length);
      setMyCourses(coursesArray);

      // Load progress for each enrolled course
      try {
        const token = localStorage.getItem("authToken");
        await Promise.all(
          coursesArray.map(async (enr) => {
            const courseId =
              enr.courseId && typeof enr.courseId === "object"
                ? enr.courseId._id
                : enr.courseId || enr._id;
            if (!courseId) return;
            try {
              const resp = await fetch(`/api/progress/course/${courseId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (resp.ok) {
                const d = await resp.json();
                const percent = d?.progress?.overallProgress ?? 0;
                setCourseProgress((prev) => ({
                  ...prev,
                  [courseId]: Number(percent),
                }));
              }
            } catch (_) {}
          }),
        );
      } catch (err) {
        console.warn("Failed to load course progress", err);
      }
    } catch (error) {
      console.error("❌ Error fetching my courses:", error);

      // Don't show demo courses as fallback to avoid enrollment conflicts
      console.error("❌ Failed to load my courses - showing empty state");
      setMyCourses([]);
    } finally {
      setMyCoursesLoading(false);
    }
  };

  // Load real dashboard metrics
  const loadDashboardMetrics = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setDashboardMetricsLoading(true);
    try {
      const response = await fetch("/api/user/student/dashboard/metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setDashboardMetrics(data.data);
          // no longer tracking streak in userDetails

        }
      }
    } catch (error) {
      console.warn("Failed to load dashboard metrics:", error);
    } finally {
      setDashboardMetricsLoading(false);
    }
  };

  // Load real course progress data
  const loadCourseProgressData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setCourseProgressLoading(true);
    try {
      const response = await fetch(
        "/api/user/student/dashboard/course-progress",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCourseProgressData(data.data);
        }
      }
    } catch (error) {
      console.warn("Failed to load course progress:", error);
    } finally {
      setCourseProgressLoading(false);
    }
  };

  // Load real upcoming classes
  const loadRealUpcomingClasses = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const response = await fetch(
        "/api/user/student/dashboard/upcoming-classes",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUpcomingClasses(data.data);
        }
      }
    } catch (error) {
      console.warn("Failed to load upcoming classes:", error);
    }
  };

  // Fetch published courses on component mount
  useEffect(() => {
    loadCourses();
    loadMyCourses();
    loadDashboardMetrics();
    loadCourseProgressData();
    loadRealUpcomingClasses();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get("section");
    if (section) {
      setActiveSection(section);
    }
  }, [location.search]);

  useEffect(() => {
    if (lmsMainRef.current) {
      lmsMainRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [activeSection]);

  useEffect(() => {
    hydrateLiveClasses();
  }, [myCourses.length]);

  const hydrateLiveClasses = async () => {
    const scope = "student-dashboard";
    const cached = getLiveCache(scope);
    setUpcomingClasses((cached.items || []).slice(0, 5));
    if (shouldRevalidateLive(scope)) {
      try {
        const data = await fetchLiveClasses({ role: "student" });
        setLiveCache(scope, data, {});
        setUpcomingClasses((data || []).slice(0, 5));
      } catch (_) {
        // silent fail, keep cache
      }
    }
  };

  const loadLiveSessions = async () => {
    setLiveSessionsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const allUpcoming = [];
      const allPast = [];
      const now = new Date();

      const fetchPromises = myCourses.map(async (enr) => {
        const courseId =
          enr.courseId && typeof enr.courseId === "object"
            ? enr.courseId._id
            : enr.courseId || enr._id;
        const courseName = enr.courseId?.name || enr.name || "Course";
        if (!courseId) return;

        try {
          const resp = await fetch(
            `/api/live-batches/student/schedule?courseId=${courseId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (resp.ok) {
            const data = await resp.json();
            if (data.success && data.data) {
              (data.data.upcoming || []).forEach((s) =>
                allUpcoming.push({ ...s, courseName }),
              );
              (data.data.past || []).forEach((s) =>
                allPast.push({ ...s, courseName }),
              );
            }
          }
        } catch (_) {}
      });

      const liveClassPromise = fetch("/api/live-classes", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (resp) => {
          if (resp.ok) {
            const data = await resp.json();
            if (data.success && data.items) {
              data.items.forEach((lc) => {
                const session = {
                  _id: lc._id,
                  topic: lc.title,
                  date: lc.startTime,
                  startTime: new Date(lc.startTime).toLocaleTimeString(
                    "en-IN",
                    { hour: "2-digit", minute: "2-digit", hour12: false },
                  ),
                  endTime: new Date(lc.endTime).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }),
                  platform: lc.platform,
                  meetingLink: lc.joinLink,
                  courseName: lc.courseId?.name || "Live Class",
                  liveBatchId: {
                    name: lc.title,
                    subjectId: { name: lc.courseId?.name || "Live Class" },
                  },
                  description: lc.description,
                  status: lc.status,
                  isLiveClass: true,
                };
                const sessionEnd = new Date(lc.endTime);
                if (sessionEnd > now) {
                  allUpcoming.push(session);
                } else {
                  allPast.push(session);
                }
              });
            }
          }
        })
        .catch(() => {});

      await Promise.all([...fetchPromises, liveClassPromise]);

      allUpcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
      allPast.sort((a, b) => new Date(b.date) - new Date(a.date));

      setLiveSessions({ upcoming: allUpcoming, past: allPast });
    } catch (error) {
      console.error("Error loading live sessions:", error);
    } finally {
      setLiveSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadLiveSessions();
  }, [myCourses]);

  const loadNotifications = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setNotificationsLoading(true);
    try {
      const resp = await fetch("/api/notifications?limit=10", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          setNotifications(data.data.notifications || []);
          setUnreadCount(data.data.unreadCount || 0);
        }
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Load Analytics Data for Analysis & Reports section
  const loadAnalyticsData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setAnalyticsLoading(true);
    try {
      const [summaryRes, sectionRes] = await Promise.all([
        fetch("/api/mock-tests/reports/summary", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/mock-tests/reports/section-analysis", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const summaryData = await summaryRes.json();
      const sectionData = await sectionRes.json();

      if (summaryData?.success) {
        setAnalyticsData((prev) => ({
          ...prev,
          summary: summaryData.summary,
          attempts: summaryData.attempts || [],
          performanceTrend: summaryData.performanceTrend || [],
        }));
      }

      if (sectionData?.success) {
        setAnalyticsData((prev) => ({
          ...prev,
          sectionAnalysis: sectionData.analysis || [],
          userRank: sectionData.userRank,
          totalParticipants: sectionData.totalParticipants || 0,
        }));
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Load leaderboard for a specific test
  const loadLeaderboard = async (testId, testName) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setLeaderboardLoading(true);
    setSelectedTestForLeaderboard({ id: testId, name: testName });
    try {
      const resp = await fetch(
        `/api/mock-tests/reports/${testId}/leaderboard`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await resp.json();
      if (data?.success) {
        setLeaderboardData(data);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Load analytics when analysis section is active
  useEffect(() => {
    if (activeSection === "analysis") {
      loadAnalyticsData();
    }
  }, [activeSection]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const canJoinClass = (it) => {
    const now = new Date();
    const start = new Date(it.startTime);
    const end = new Date(it.endTime);
    return (
      now >= new Date(start.getTime() - 10 * 60000) &&
      now <= new Date(end.getTime() + 30 * 60000)
    );
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  // Handle payment success redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const showFromQuery =
      urlParams.get("showMyCourses") === "1" ||
      urlParams.get("showMyCourses") === "true";

    if (location.state?.showMyCourses || showFromQuery) {
      setActiveSection("my-courses"); // Navigate to My Courses section

      // Immediate refresh to show purchased course
      loadMyCourses();

      if (location.state?.refreshCourses || showFromQuery) {
        // Additional refresh after a delay to ensure data is updated
        setTimeout(() => {
          loadMyCourses();
          loadCourses(); // Also refresh available courses
        }, 1000);
      }

      // Clear the state and query param to prevent repeated refreshes
      try {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      } catch (e) {
        // ignore
      }
    }

    if (location.state?.section === "mock-tests") {
      setActiveSection("mock-tests");
      if (location.state?.testId) {
        setTimeout(() => {
          const testElement = document.getElementById(
            `mock-test-${location.state.testId}`,
          );
          if (testElement) {
            testElement.scrollIntoView({ behavior: "smooth", block: "center" });
            testElement.style.boxShadow = "0 0 10px 3px rgba(37, 99, 235, 0.5)";
            setTimeout(() => {
              testElement.style.boxShadow = "";
            }, 2000);
          }
        }, 500);
      }
      try {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      } catch (e) {
        // ignore
      }
    }
  }, [location.state]);

  // Removed periodic refresh - was causing infinite loop

  // Function to load payment history
  const loadPaymentHistory = async () => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      console.warn("⚠�� No auth token found. Cannot load payment history.");
      setPaymentHistory([]);
      return;
    }

    setPaymentHistoryLoading(true);

    try {
      const response = await fetch("/api/user/payment/history", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn(
          `⚠️ Payment history API responded with status ${response.status}`,
        );
        setPaymentHistory([]);
        return;
      }

      const data = await response.json();
      console.log("📦 Payment History Response:", data);

      const payments = data.payments || data.data || [];
      if ((data.success || data.status) && Array.isArray(payments)) {
        setPaymentHistory(payments);
      } else {
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error("❌ Error loading payment history:", error);
      setPaymentHistory([]);
    } finally {
      setPaymentHistoryLoading(false);
    }
  };

  // Function to load receipts
  const loadReceipts = async () => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      console.warn("⚠️ No auth token found. Cannot load receipts.");
      setReceipts([]);
      return;
    }

    setReceiptsLoading(true);

    try {
      const response = await fetch("/api/user/receipts", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn(
          `⚠️ Receipts API responded with status ${response.status}`,
        );
        setReceipts([]);
        return;
      }

      const data = await response.json();
      console.log("📦 Receipts Response:", data);

      const receipts = data.receipts || data.data || [];
      if ((data.success || data.status) && Array.isArray(receipts)) {
        setReceipts(receipts);
      } else {
        setReceipts([]);
      }
    } catch (error) {
      console.error("❌ Error loading receipts:", error);
      setReceipts([]);
    } finally {
      setReceiptsLoading(false);
    }
  };

  // Function to download receipt
  const downloadReceipt = async (receiptId, format = "html") => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      alert("Please login to download receipt");
      return;
    }

    try {
      const response = await fetch(
        `/api/user/receipt/${receiptId}/download?format=${format}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to download receipt");
      }

      if (format === "html") {
        const html = await response.text();
        const blob = new Blob([html], { type: "text/html" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt-${receiptId}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (format === "text") {
        const text = await response.text();
        const blob = new Blob([text], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt-${receiptId}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error downloading receipt:", error);
      alert("Failed to download receipt. Please try again.");
    }
  };

  // Function to view receipt inline in modal
  const viewReceipt = async (receiptId) => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      alert("Please login to view receipt");
      return;
    }

    setViewReceiptLoading(true);
    setViewReceiptModal(true);
    setViewReceiptHtml("");

    try {
      const response = await fetch(
        `/api/user/receipt/${receiptId}/download?format=html`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load receipt");
      }

      const html = await response.text();
      setViewReceiptHtml(html);
    } catch (error) {
      console.error("Error viewing receipt:", error);
      alert("Failed to load receipt. Please try again.");
      setViewReceiptModal(false);
    } finally {
      setViewReceiptLoading(false);
    }
  };

  // Function to download PDF tax invoice
  const downloadTaxInvoice = async (paymentId) => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      alert("Please login to download invoice");
      return;
    }

    try {
      const response = await fetch(`/api/invoices/download/${paymentId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to download invoice");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TaxInvoice-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading tax invoice:", error);
      alert(
        error.message || "Failed to download tax invoice. Please try again.",
      );
    }
  };

  // Preview: open and load overview
  const openPreview = async (course) => {
    try {
      setPreviewOpen(true);
      setPreviewLoading(true);
      const resp = await fetch(
        `/api/courses/student/published-courses/${course._id}`,
      );
      if (resp.ok) {
        const d = await resp.json();
        setPreviewData(d.course || course);
      } else {
        setPreviewData(course);
      }
    } catch (_) {
      setPreviewData(course);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewData(null);
  };

  const downloadOverviewPdf = async () => {
    if (!previewRef.current) return;
    const el = previewRef.current;
    const canvas = await html2canvas(el, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let y = 10;
    if (imgHeight <= pageHeight - 20) {
      pdf.addImage(imgData, "PNG", 10, y, imgWidth, imgHeight);
    } else {
      let hLeft = imgHeight;
      let position = 10;
      const imgHeightPx = canvas.height;
      const pageHeightPx = ((pageHeight - 20) * canvas.width) / imgWidth;
      let sY = 0;
      while (hLeft > 0) {
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(pageHeightPx, imgHeightPx - sY);
        const ctx = pageCanvas.getContext("2d");
        ctx.drawImage(
          canvas,
          0,
          sY,
          canvas.width,
          pageCanvas.height,
          0,
          0,
          canvas.width,
          pageCanvas.height,
        );
        const pageImg = pageCanvas.toDataURL("image/png");
        if (position !== 10) pdf.addPage();
        pdf.addImage(
          pageImg,
          "PNG",
          10,
          10,
          imgWidth,
          (pageCanvas.height * imgWidth) / canvas.width,
        );
        hLeft -= pageHeightPx;
        sY += pageHeightPx;
        position = 20;
      }
    }
    const fname = (previewData?.name || "course-overview")
      .replace(/\s+/g, "-")
      .toLowerCase();
    pdf.save(`${fname}-overview.pdf`);
  };

  // Handle demo purchase for testing
  const handleDemoPurchase = async (course) => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      alert("Please login first!");
      return;
    }

    try {
      // Simulate payment verification directly
      const response = await fetch("/api/user/payment/verify-and-unlock", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          razorpay_order_id: "demo_order_" + Date.now(),
          razorpay_payment_id: "demo_payment_" + Date.now(),
          razorpay_signature: "demo_signature",
          courseId: course._id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert("✅ Demo course purchased successfully!");
        // Refresh my courses
        setTimeout(() => {
          loadMyCourses();
          setActiveSection("my-courses"); // Switch to My Courses
        }, 1000);
      } else {
        alert("❌ Demo purchase failed: " + data.message);
      }
    } catch (error) {
      console.error("Demo purchase error:", error);
      alert("❌ Demo purchase error: " + error.message);
    }
  };

  // Handle enrollment with authentication check
  const handleEnrollNow = async (course) => {
    const authToken = localStorage.getItem("authToken");
    const storedUser = JSON.parse(localStorage.getItem("user"));

    // Check if user is logged in
    if (!authToken || !storedUser) {
      // Store course details for after login
      localStorage.setItem("pendingCourse", JSON.stringify(course));
      alert("Please login to enroll in this course!");
      navigate("/login");
      return;
    }

    try {
      // Check if already enrolled
      const response = await fetch("/api/user/student/my-courses", {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("🔍 Checking enrollment for course:", course._id);
        console.log("📚 User enrolled courses:", data.courses);

        // Fix: Compare against courseId._id (populated course object) not c._id (enrollment ID)
        // Also filter out demo enrollments with fake IDs
        const realEnrollments = (data.courses || []).filter(
          (c) => c._id && !c._id.toString().startsWith("demo_"),
        );

        const alreadyEnrolled =
          course &&
          realEnrollments.some((c) => {
            const enrolledCourseId =
              (c.courseId && c.courseId._id) || c.courseId;
            const matches =
              enrolledCourseId &&
              enrolledCourseId.toString() === course._id.toString();
            console.log(
              `📋 Comparing ${enrolledCourseId} with ${course._id}: ${matches}`,
            );
            return matches;
          });

        console.log("✅ Final enrollment check result:", alreadyEnrolled);

        if (alreadyEnrolled) {
          alert("✅ You are already enrolled in this course!");
          setActiveSection("my-courses"); // Switch to My Courses section
          return;
        }
      }

      // Navigate to course purchase page with dynamic route
      navigate(`/course-purchase/${course._id}`, {
        state: {
          ...course,
          price: course.price || 30000,
          oldPrice: course.oldPrice || 120000,
          features: [
            "Complete CAT preparation material",
            "Live interactive classes",
            "Mock tests and practice sets",
            "Doubt clearing sessions",
            "Performance analysis",
            "Study materials download",
          ],
        },
      });
    } catch (error) {
      console.error("Error checking enrollment:", error);
      // If there's an error, still allow to proceed to purchase
      navigate(`/course-purchase/${course._id}`, {
        state: {
          ...course,
          price: course.price || 30000,
          oldPrice: course.oldPrice || 120000,
          features: [
            "Complete CAT preparation material",
            "Live interactive classes",
            "Mock tests and practice sets",
            "Doubt clearing sessions",
            "Performance analysis",
            "Study materials download",
          ],
        },
      });
    }
  };

  // Load study materials
  const loadStudyMaterials = async () => {
    setMaterialsLoading(true);
    try {
      const authToken = localStorage.getItem("authToken");
      const queryParams = new URLSearchParams({
        ...(materialFilters.subject !== "All Subjects" && {
          subject: materialFilters.subject,
        }),
        ...(materialFilters.type !== "All Types" && {
          type: materialFilters.type,
        }),
      });

      const headers = {
        "Content-Type": "application/json",
      };

      // Only add Authorization header if we have a valid token
      if (authToken && authToken !== "null" && authToken !== "undefined") {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(
        `/api/study-materials/student?${queryParams}`,
        {
          headers,
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStudyMaterials(data.data);
          console.log("✅ Study materials loaded:", data.data.length);
        } else {
          console.error("❌ Failed to load study materials:", data.message);
          setStudyMaterials([]);
        }
      } else {
        console.error("❌ Study materials API error:", response.status);
        setStudyMaterials([]);
      }
    } catch (error) {
      console.error("❌ Error loading study materials:", error);
      setStudyMaterials([]);
    } finally {
      setMaterialsLoading(false);
    }
  };

  // Handle material view
  const handleViewMaterial = async (material) => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken || authToken === "null" || authToken === "undefined") {
      alert("Please login to view study materials!");
      navigate("/login");
      return;
    }

    setSelectedMaterial(material);
    setMaterialViewerOpen(true);
    setMaterialViewerLoading(true);

    try {
      // Fetch the PDF with auth headers and convert to blob URL for iframe
      const response = await fetch(
        `/api/study-materials/view/${material._id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setMaterialPdfUrl(url);
      } else {
        console.error("Failed to load material");
        alert("Failed to load material. Please try again.");
        setMaterialViewerOpen(false);
      }
    } catch (error) {
      console.error("Error loading material:", error);
      alert("Error loading material. Please try again.");
      setMaterialViewerOpen(false);
    } finally {
      setMaterialViewerLoading(false);
    }
  };

  const closeMaterialViewer = () => {
    setMaterialViewerOpen(false);
    setMaterialPdfUrl(null);
    setSelectedMaterial(null);
  };

  // Load announcements
  const loadAnnouncements = async () => {
    setAnnouncementsLoading(true);
    try {
      const authToken = localStorage.getItem("authToken");
      const queryParams = new URLSearchParams({
        ...(announcementFilters.type !== "all" && {
          type: announcementFilters.type,
        }),
        limit: 20,
      });

      const headers = {
        "Content-Type": "application/json",
      };

      // Only add Authorization header if we have a valid token
      if (authToken && authToken !== "null" && authToken !== "undefined") {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(
        `/api/announcements/student?${queryParams}`,
        {
          headers,
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnnouncements(data.data);
          console.log("✅ Announcements loaded:", data.data.length);
        } else {
          console.error("❌ Failed to load announcements:", data.message);
          setAnnouncements([]);
        }
      } else {
        console.error("❌ Announcements API error:", response.status);
        setAnnouncements([]);
      }
    } catch (error) {
      console.error("❌ Error loading announcements:", error);
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  // Mark announcement as read
  const markAnnouncementAsRead = async (announcementId) => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken || authToken === "null" || authToken === "undefined") {
      return; // Skip if no auth token
    }

    try {
      await fetch(`/api/announcements/mark-read/${announcementId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("❌ Error marking announcement as read:", error);
    }
  };

  // Load study materials when filters change
  useEffect(() => {
    if (activeSection === "materials") {
      loadStudyMaterials();
    }
  }, [materialFilters, activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load announcements when filters change
  useEffect(() => {
    if (activeSection === "announcements") {
      loadAnnouncements();
    }
  }, [announcementFilters, activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load purchases data when purchases section becomes active
  useEffect(() => {
    if (activeSection === "purchases" && !purchasesLoadedRef.current) {
      purchasesLoadedRef.current = true;
      loadPaymentHistory();
      loadReceipts();
    } else if (activeSection !== "purchases") {
      purchasesLoadedRef.current = false;
    }
  }, [activeSection]);

  // Helper functions for announcements
  const getAnnouncementIcon = (type) => {
    switch (type) {
      case "important":
        return "🚨";
      case "update":
        return "📢";
      case "reminder":
        return "⏰";
      case "maintenance":
        return "🔧";
      default:
        return "📄";
    }
  };

  const formatAnnouncementDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} minutes ago`;
      }
      return `${hours} hours ago`;
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: FiHome },
    { id: "courses", label: "Available Courses", icon: FiBook },
    { id: "my-courses", label: "My Courses", icon: FiBook },
    { id: "live-classes", label: "Live Classes", icon: FiVideo },
    // { id: 'practice-tests', label: 'Practice Tests', icon: FiEdit3 },
    { id: "mock-tests", label: "Mock Tests", icon: FiTarget },
    { id: "analysis", label: "Analysis & Reports", icon: FiBarChart2 },
    { id: "doubts", label: "Doubts & Discussions", icon: FiMessageCircle },
    { id: "materials", label: "Study Materials", icon: FiDownload },
    // { id: 'schedule', label: 'Schedule', icon: FiCalendar },
    { id: "announcements", label: "Announcements", icon: FiBell },
    { id: "purchases", label: "Purchase History", icon: FiFileText },
    { id: "profile", label: "Profile", icon: FiUser },
  ];

  const renderPurchasesContent = () => {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount / 100);
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    const getStatusColor = (status) => {
      switch (status) {
        case "paid":
          return "#27ae60";
        case "created":
          return "#f39c12";
        case "failed":
          return "#e74c3c";
        default:
          return "#7f8c8d";
      }
    };

    return (
      <div className="purchases-content">
        <div className="section-header">
          <h2>Purchase History</h2>
          <p>View your course purchases and download receipts</p>
        </div>

        <div className="purchases-section">
          <div className="section-title">
            <h3>Payment History</h3>
            {paymentHistoryLoading && (
              <span className="loading-indicator">Loading...</span>
            )}
          </div>

          <form className="offline-upload" onSubmit={submitOfflinePayment}>
            <div className="upload-row">
              <div className="upload-field">
                <label>Course</label>
                <select
                  value={offlineForm.courseId}
                  onChange={(e) => onOfflineField("courseId", e.target.value)}
                >
                  <option value="">Select course</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="upload-field">
                <label>Amount (INR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={offlineForm.amount}
                  onChange={(e) => onOfflineField("amount", e.target.value)}
                />
              </div>
              <div className="upload-field">
                <label>Slip Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setOfflineFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="upload-field">
                <label>Note</label>
                <input
                  type="text"
                  value={offlineForm.note}
                  onChange={(e) => onOfflineField("note", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="upload-actions">
                <button
                  type="submit"
                  className="download-btn"
                  disabled={
                    offlineUploading ||
                    !offlineForm.courseId ||
                    !offlineForm.amount ||
                    !offlineFile
                  }
                >
                  {offlineUploading ? "Uploading…" : "Upload Offline Slip"}
                </button>
              </div>
            </div>
          </form>

          {paymentHistory.length === 0 && !paymentHistoryLoading ? (
            <div className="empty-state">
              <FiFileText size={48} />
              <h4>No Purchases Yet</h4>
              <p>Your course purchases will appear here</p>
            </div>
          ) : (
            <div className="purchases-grid">
              {paymentHistory.map((payment) => (
                <div key={payment._id} className="purchase-card">
                  <div className="purchase-header">
                    <div className="course-info">
                      <h4>{payment.courseId?.name || "Course"}</h4>
                      <p>
                        {payment.courseId?.description
                          ?.replace(/<[^>]*>/g, "")
                          .substring(0, 100)}
                        ...
                      </p>
                    </div>
                    <div className="purchase-status">
                      <span
                        className={`status-badge ${payment.status}`}
                        style={{
                          backgroundColor: getStatusColor(payment.status),
                        }}
                      >
                        {payment.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="purchase-details">
                    <div className="detail-row">
                      <span>Purchase Date:</span>
                      <span>{formatDate(payment.createdAt)}</span>
                    </div>
                    <div className="detail-row">
                      <span>Amount Paid:</span>
                      <span className="amount">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                    {payment.paymentMethod && (
                      <div className="detail-row">
                        <span>Method:</span>
                        <span>
                          {(payment.paymentMethod || "").toUpperCase()}
                        </span>
                      </div>
                    )}
                    {payment.offlineSlipUrl && (
                      <div className="detail-row">
                        <span>Slip:</span>
                        <a
                          className="link"
                          href={payment.offlineSlipUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      </div>
                    )}
                    {payment.validityEndDate && (
                      <div className="detail-row">
                        <span>Valid Until:</span>
                        <span>{formatDate(payment.validityEndDate)}</span>
                      </div>
                    )}
                    {payment.receiptNumber && (
                      <div className="detail-row">
                        <span>Receipt No:</span>
                        <span>{payment.receiptNumber}</span>
                      </div>
                    )}
                  </div>

                  {(payment.status === "paid" || payment.status === "captured" || payment.status === "success") && (
                    <div className="purchase-actions">
                      <button
                        className="download-btn"
                        onClick={() => {
                          const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
                          const url = `/api/invoices/download/${payment._id}?token=${encodeURIComponent(token)}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <FiDownload /> Tax Invoice
                      </button>
                      <button
                        className="download-btn"
                        onClick={() => downloadReceipt(payment._id, "html")}
                        style={{ marginLeft: 8 }}
                      >
                        <FiDownload /> Receipt
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="purchases-section">
          <div className="section-title">
            <h3>Receipts</h3>
            {receiptsLoading && (
              <span className="loading-indicator">Loading...</span>
            )}
          </div>

          {receipts.length === 0 && !receiptsLoading ? (
            <div className="empty-state">
              <FiDownload size={48} />
              <h4>No Receipts Available</h4>
              <p>Receipts for successful payments will appear here</p>
            </div>
          ) : (
            <div className="receipts-table">
              <table>
                <thead>
                  <tr>
                    <th>Receipt No.</th>
                    <th>Course</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Downloads</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt._id}>
                      <td>{receipt.receiptNumber}</td>
                      <td>{receipt.courseId?.name || "Course"}</td>
                      <td>{formatDate(receipt.generatedAt)}</td>
                      <td>{formatCurrency(receipt.totalAmount)}</td>
                      <td>{receipt.downloadCount}</td>
                      <td>
                        <div className="receipt-actions">
                          <button
                            className="download-btn small pdf-btn"
                            onClick={() =>
                              downloadTaxInvoice(
                                receipt.paymentId || receipt._id,
                              )
                            }
                            title="Download Tax Invoice PDF"
                          >
                            <FiDownload /> PDF
                          </button>
                          <button
                            className="download-btn small view-btn"
                            onClick={() => viewReceipt(receipt._id)}
                            title="View Receipt"
                          >
                            <FiEye /> View
                          </button>
                          <button
                            className="download-btn small"
                            onClick={() => downloadReceipt(receipt._id, "text")}
                            title="Download as Text"
                          >
                            TXT
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDashboardContent = () => (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1>Welcome back, {userDetails.name.split(" ")[0]}! 👋</h1>
        <p>Here's your learning progress today</p>
      </div>

      {/* Next Step Widget */}
      <div className="next-step-container">
        <NextStepCard />
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FiBook />
          </div>
          <div className="stat-info">
            <h3>{courses.length}</h3>
            <p>Available Courses</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <FiCheckCircle />
          </div>
          <div className="stat-info">
            <h3>{dashboardMetrics.completionRate || 0}%</h3>
            <p>Completion Rate</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <FiTarget />
          </div>
          <div className="stat-info">
            <h3>{dashboardMetrics.testsTaken || 0}</h3>
            <p>Tests Taken</p>
          </div>
        </div>
        {/* streak card removed per design */}
      </div>

      <div className="dashboard-grid">
        <div className="progress-chart-card">
          <h3>Learning Progress</h3>
          <Line
            data={{
              labels:
                dashboardMetrics.learningProgress?.length > 0
                  ? dashboardMetrics.learningProgress.map((d) => d.day)
                  : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
              datasets: [
                {
                  label: "Activities",
                  data:
                    dashboardMetrics.learningProgress?.length > 0
                      ? dashboardMetrics.learningProgress.map(
                          (d) => d.activities,
                        )
                      : [0, 0, 0, 0, 0, 0, 0],
                  borderColor: "#667eea",
                  backgroundColor: "rgba(102, 126, 234, 0.1)",
                  tension: 0.4,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } },
            }}
          />
        </div>

        <div className="upcoming-classes-card">
          <h3>Upcoming Classes</h3>
          <div className="class-list">
            {upcomingClasses.length === 0 ? (
              <div className="empty-state" style={{ padding: "12px 0" }}>
                <FiClock className="empty-icon" />
                <h4>No upcoming classes</h4>
                <p>Your scheduled classes will appear here after enrollment.</p>
              </div>
            ) : (
              upcomingClasses.map((it) => (
                <div key={it._id} className="class-item">
                  <div className="class-time">
                    <FiClock />
                    <span>{formatTime(it.startTime)}</span>
                  </div>
                  <div className="class-details">
                    <h4>{it.title}</h4>
                    <p>
                      {it.courseName ||
                        it.courseId?.name ||
                        it.platform?.toUpperCase() ||
                        "Live Class"}
                    </p>
                  </div>
                  {it.canJoin !== false && it.joinLink ? (
                    <a
                      className="join-btn"
                      href={it.joinLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FiPlay /> Join
                    </a>
                  ) : (
                    <button className="join-btn" disabled>
                      <FiPlay /> Locked
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="course-progress-card">
          <h3>Course Progress</h3>
          <Doughnut
            data={{
              labels: ["Completed", "In Progress", "Not Started"],
              datasets: [
                {
                  data: courseProgressData.summary?.chartData || [0, 0, 100],
                  backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
                  borderWidth: 0,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: { legend: { position: "bottom" } },
            }}
          />
        </div>
      </div>
    </div>
  );

  const renderMyCoursesContent = () => (
    <div className="courses-content">
      <div className="section-header">
        <h2>My Courses</h2>
        <div className="filter-buttons">
          <button className="filter-btn active">All</button>
          <button className="filter-btn">In Progress</button>
          <button className="filter-btn">Completed</button>
        </div>
      </div>

      {myCoursesLoading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your courses...</p>
        </div>
      ) : myCourses.length === 0 ? (
        <div className="empty-state">
          <FiBook className="empty-icon" />
          <h3>No courses enrolled yet</h3>
          <p>Browse available courses and start learning!</p>
          <button
            className="primary-btn"
            onClick={() => setActiveSection("courses")}
          >
            Browse Courses
          </button>
        </div>
      ) : (
        <div className="courses-grid">
          {myCourses.map((enrollmentData, index) => {
            // Handle both populated courseId objects and string IDs
            let course = enrollmentData.courseId || enrollmentData;

            // If courseId is just a string, try to find the course in available courses
            if (typeof course === "string") {
              const foundCourse = courses.find((c) => c._id === course);
              course = foundCourse || {
                _id: course,
                name: "Course Details Loading...",
                description: "Course information is being loaded.",
                thumbnail: "default-course.png",
              };
            }

            // Ensure course has required properties
            if (!course._id) {
              course._id = enrollmentData._id || `course-${index}`;
            }

            return (
              <div key={course._id} className="course-card enrolled">
                <div className="course-thumbnail">
                  {course.thumbnail &&
                  course.thumbnail !== "default-course.jpg" ? (
                    <img
                      src={`/uploads/${course.thumbnail}`}
                      alt={course.name}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="course-thumbnail-placeholder"
                    style={
                      course.thumbnail &&
                      course.thumbnail !== "default-course.jpg"
                        ? { display: "none" }
                        : {}
                    }
                  >
                    <FiBook />
                  </div>
                  <div className="enrolled-badge">
                    <FiCheckCircle /> Enrolled
                  </div>
                </div>
                <div className="course-details">
                  <div className="course-header">
                    <h3>{course.name}</h3>
                    <span className="status-badge enrolled">
                      {enrollmentData.status === "unlocked"
                        ? "Active"
                        : "Locked"}
                    </span>
                  </div>
                  <p className="course-description">
                    {cleanHtmlToText(course.description) ||
                      "Start your learning journey"}
                  </p>
                  <div className="course-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, courseProgress[course._id] || 0))}%`,
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {Math.round(courseProgress[course._id] || 0)}% Complete
                    </span>
                  </div>
                  <div className="course-actions">
                    <button
                      className="continue-btn primary"
                      onClick={() => {
                        if (course && course._id) {
                          navigate(`/student/course-content/${course._id}`);
                        } else {
                          console.error("Course ID not found:", course);
                        }
                      }}
                    >
                      <FiPlay /> Continue Learning
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderCoursesContent = () => (
    <div className="courses-content">
      <div className="section-header">
        <h2>Available Courses</h2>
        <div className="filter-buttons">
          <button className="filter-btn active">All Courses</button>
          <button className="filter-btn">Popular</button>
          <button className="filter-btn">Newest</button>
        </div>
      </div>

      {coursesLoading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading courses...</p>
        </div>
      ) : coursesError ? (
        <div className="error-state">
          <p className="error-message">⚠️ {coursesError}</p>
          <button
            className="retry-btn"
            onClick={loadCourses}
            disabled={coursesLoading}
          >
            {coursesLoading ? "Retrying..." : "Retry"}
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <FiBook className="empty-icon" />
          <h3>No courses available</h3>
          <p>Check back later for new courses!</p>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <div key={course._id} className="course-card">
              <div className="course-thumbnail">
                {course.thumbnail &&
                course.thumbnail !== "default-course.jpg" ? (
                  <img
                    src={`/uploads/${course.thumbnail}`}
                    alt={course.name}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="course-thumbnail-placeholder"
                  style={
                    course.thumbnail &&
                    course.thumbnail !== "default-course.jpg"
                      ? { display: "none" }
                      : {}
                  }
                >
                  <FiBook />
                </div>
              </div>
              <div className="course-details">
                <div className="course-header">
                  <h3>{course.name}</h3>
                  <span className="price-badge">
                    ₹{course.price?.toLocaleString("en-IN") || "Free"}
                  </span>
                </div>
                <p className="course-description">
                  {cleanHtmlToText(course.description) ||
                    "No description available"}
                </p>
                <div className="course-actions">
                  <button
                    className="enroll-btn"
                    onClick={() => handleEnrollNow(course)}
                  >
                    <FiPlay /> Enroll Now
                  </button>
                  <button
                    className="preview-btn"
                    onClick={() => openPreview(course)}
                  >
                    <FiEye /> Preview
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderLiveClassesContent = () => {
    return <StudentLiveClasses />;
  };

  const renderPracticeTestsContent = () => (
    <div className="practice-tests-content">
      <div className="section-header">
        <h2>Practice Tests</h2>
        <div className="test-filters">
          <select className="filter-select">
            <option>All Subjects</option>
            <option>Quantitative Aptitude</option>
            <option>Verbal Ability</option>
            <option>Data Interpretation</option>
          </select>
        </div>
      </div>

      <div className="tests-grid">
        {[
          {
            subject: "Quantitative Aptitude",
            tests: 25,
            attempted: 18,
            accuracy: 78,
          },
          { subject: "Verbal Ability", tests: 20, attempted: 15, accuracy: 82 },
          {
            subject: "Data Interpretation",
            tests: 18,
            attempted: 12,
            accuracy: 75,
          },
          {
            subject: "Logical Reasoning",
            tests: 22,
            attempted: 10,
            accuracy: 80,
          },
        ].map((test, index) => (
          <div key={index} className="test-subject-card">
            <div className="test-header">
              <h3>{test.subject}</h3>
              <span className="accuracy-badge">{test.accuracy}%</span>
            </div>
            <div className="test-stats">
              <div className="stat">
                <span className="stat-number">{test.tests}</span>
                <span className="stat-label">Total Tests</span>
              </div>
              <div className="stat">
                <span className="stat-number">{test.attempted}</span>
                <span className="stat-label">Attempted</span>
              </div>
              <div className="stat">
                <span className="stat-number">{test.accuracy}%</span>
                <span className="stat-label">Accuracy</span>
              </div>
            </div>
            <button className="start-test-btn">Start Practice</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMockTestsContent = () => <MockTestPage />;

  const renderAnalysisContent = () => {
    const {
      summary,
      attempts,
      performanceTrend,
      sectionAnalysis,
      userRank,
      totalParticipants,
    } = analyticsData;
    const percentile =
      totalParticipants > 0 && userRank
        ? ((1 - userRank / totalParticipants) * 100).toFixed(1)
        : 0;

    if (analyticsLoading) {
      return (
        <div className="analysis-content">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
            <div className="loading-spinner"></div>
            <p style={{ marginLeft: "10px" }}>Loading your analytics...</p>
          </div>
        </div>
      );
    }

    const trendChartData = performanceTrend.length > 0 ? {
      labels: performanceTrend.map(t => t.testName),
      datasets: [
        {
          label: 'Score',
          data: performanceTrend.map(t => t.score),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102,126,234,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#667eea',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
        },
        {
          label: 'Score %',
          data: performanceTrend.map(t => t.percentage),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.1)',
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          yAxisID: 'y1',
        }
      ]
    } : null;

    const sectionBarData = sectionAnalysis.length > 0 ? {
      labels: sectionAnalysis.map(s => s.section),
      datasets: [
        {
          label: 'Your Avg Score',
          data: sectionAnalysis.map(s => s.averageScore),
          backgroundColor: 'rgba(102,126,234,0.8)',
          borderColor: '#667eea',
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: 'Top 10 Avg Score',
          data: sectionAnalysis.map(s => s.top10AverageScore),
          backgroundColor: 'rgba(16,185,129,0.8)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 6,
        }
      ]
    } : null;

    const accuracyDoughnutData = summary && summary.totalAttempts > 0 ? {
      labels: ['Accuracy', 'Remaining'],
      datasets: [{
        data: [summary.averageAccuracy || 0, 100 - (summary.averageAccuracy || 0)],
        backgroundColor: ['#667eea', '#e8e8e8'],
        borderWidth: 0,
        cutout: '75%',
      }]
    } : null;

    return (
      <div className="analysis-content">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h2 style={{ margin: 0 }}>Analysis & Reports</h2>
          <button onClick={loadAnalyticsData} style={{ padding: "8px 16px", borderRadius: "6px", background: "#667eea", color: "white", border: "none", cursor: "pointer", fontSize: '14px' }}>
            Refresh
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "15px", marginBottom: "25px" }}>
          {[
            { icon: "📝", value: summary?.totalAttempts || 0, label: "Tests Taken", color: "#667eea" },
            { icon: "📊", value: summary?.averageScore || 0, label: "Avg Score", color: "#764ba2" },
            { icon: "🏆", value: summary?.bestScore || 0, label: "Best Score", color: "#f59e0b" },
            { icon: "🎯", value: `${summary?.averageAccuracy || 0}%`, label: "Accuracy", color: "#10b981" },
            { icon: "⏱️", value: `${summary?.averageTimeMinutes || 0}m`, label: "Avg Time", color: "#ef4444" },
          ].map((card, i) => (
            <div key={i} style={{ background: "white", borderRadius: "12px", padding: "18px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderLeft: `4px solid ${card.color}` }}>
              <div style={{ fontSize: "20px", marginBottom: "6px" }}>{card.icon}</div>
              <h3 style={{ fontSize: "26px", margin: "0", color: "#1a1a2e" }}>{card.value}</h3>
              <p style={{ color: "#888", margin: "4px 0 0", fontSize: "13px" }}>{card.label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '25px' }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <h3 style={{ margin: "0 0 15px", fontSize: '16px' }}>Your Ranking</h3>
            <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: "36px", fontWeight: "bold", color: "#667eea" }}>#{userRank || "-"}</div>
                <div style={{ fontSize: "12px", color: "#888" }}>Current Rank</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: "36px", fontWeight: "bold", color: "#10b981" }}>{totalParticipants || 0}</div>
                <div style={{ fontSize: "12px", color: "#888" }}>Total Students</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: "36px", fontWeight: "bold", color: "#764ba2" }}>{percentile}%</div>
                <div style={{ fontSize: "12px", color: "#888" }}>Percentile</div>
              </div>
            </div>
          </div>

          {accuracyDoughnutData && (
            <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ width: '140px', height: '140px', position: 'relative' }}>
                <Doughnut data={accuracyDoughnutData} options={{ plugins: { legend: { display: false }, tooltip: { enabled: false } }, maintainAspectRatio: true }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#667eea' }}>{summary?.averageAccuracy || 0}%</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>Accuracy</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {trendChartData && (
          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "25px" }}>
            <h3 style={{ margin: "0 0 15px", fontSize: '16px' }}>Performance Trend</h3>
            <div style={{ height: '280px' }}>
              <Line data={trendChartData} options={{
                responsive: true, maintainAspectRatio: false,
                scales: {
                  y: { beginAtZero: true, title: { display: true, text: 'Score' }, grid: { color: 'rgba(0,0,0,0.05)' } },
                  y1: { beginAtZero: true, position: 'right', max: 100, title: { display: true, text: 'Percentage' }, grid: { display: false } },
                  x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 11 } } }
                },
                plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } }
              }} />
            </div>
          </div>
        )}

        {sectionBarData && (
          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "25px" }}>
            <h3 style={{ margin: "0 0 15px", fontSize: '16px' }}>Section-wise Comparison with Top 10</h3>
            <div style={{ height: '260px' }}>
              <Bar data={sectionBarData} options={{
                responsive: true, maintainAspectRatio: false,
                scales: {
                  y: { beginAtZero: true, title: { display: true, text: 'Avg Score' }, grid: { color: 'rgba(0,0,0,0.05)' } },
                  x: { grid: { display: false } }
                },
                plugins: { legend: { position: 'top' } }
              }} />
            </div>
          </div>
        )}

        {sectionAnalysis.length > 0 && (
          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "25px" }}>
            <h3 style={{ margin: "0 0 15px", fontSize: '16px' }}>Compare with Top 10 Performers</h3>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(sectionAnalysis.length, 4)}, 1fr)`, gap: "15px" }}>
              {sectionAnalysis.map((section) => (
                <div key={section.section} style={{ background: "#f8f9fa", borderRadius: "10px", padding: "15px" }}>
                  <h4 style={{ margin: "0 0 12px", color: "#333", fontSize: '14px' }}>{section.section}</h4>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontSize: "22px", fontWeight: "bold", color: "#667eea" }}>{section.averageScore}</div>
                      <div style={{ fontSize: "11px", color: "#888" }}>Your Score</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "22px", fontWeight: "bold", color: "#10b981" }}>{section.top10AverageScore || 0}</div>
                      <div style={{ fontSize: "11px", color: "#888" }}>Top 10 Avg</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "22px", fontWeight: "bold", color: parseFloat(section.scoreDifference) >= 0 ? "#10b981" : "#ef4444" }}>
                        {parseFloat(section.scoreDifference) >= 0 ? "+" : ""}{section.scoreDifference}
                      </div>
                      <div style={{ fontSize: "11px", color: "#888" }}>Diff</div>
                    </div>
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    <div style={{ fontSize: "11px", marginBottom: "3px", color: '#555' }}>Your Accuracy: {section.averageAccuracy}%</div>
                    <div style={{ background: "#e0e0e0", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, section.averageAccuracy)}%`, height: "100%", background: "#667eea", borderRadius: "4px" }}></div>
                    </div>
                    <div style={{ fontSize: "11px", marginTop: "6px", marginBottom: "3px", color: '#555' }}>Top 10: {section.top10AverageAccuracy || 0}%</div>
                    <div style={{ background: "#e0e0e0", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, section.top10AverageAccuracy || 0)}%`, height: "100%", background: "#10b981", borderRadius: "4px" }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "25px" }}>
          <h3 style={{ margin: "0 0 15px", fontSize: '16px' }}>Your Test Attempts</h3>
          {attempts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋</div>
              <p style={{ fontSize: '16px', marginBottom: '15px' }}>You haven't completed any tests yet.</p>
              <button onClick={() => setActiveSection("mockTests")} style={{ padding: "10px 24px", background: "#667eea", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: '14px' }}>
                Take a Test Now
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8f9fa" }}>
                    {["Test Name", "Score", "Accuracy", "Time", "Rank", "Date", "Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: h === "Test Name" ? "left" : "center", borderBottom: "2px solid #e0e0e0", fontSize: '13px', color: '#555' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt, index) => (
                    <tr key={attempt.attemptId || index} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "10px 12px", fontSize: '13px' }}>
                        {attempt.testName}
                        {attempt.isCourseTest && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#e8f4ff', color: '#667eea', padding: '2px 6px', borderRadius: '3px' }}>Course</span>}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: "bold", color: "#667eea", fontSize: '13px' }}>
                        {attempt.score}{attempt.maxScore > 0 ? `/${attempt.maxScore}` : ''}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: '13px' }}>
                        <span style={{ color: attempt.accuracy >= 70 ? '#10b981' : attempt.accuracy >= 40 ? '#f59e0b' : '#ef4444', fontWeight: 'bold' }}>{attempt.accuracy}%</span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: '13px' }}>{attempt.timeTakenMinutes} min</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: '13px', fontWeight: 'bold' }}>#{attempt.rank || "-"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: '13px' }}>{attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString("en-IN") : '-'}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <button onClick={() => loadLeaderboard(attempt.testId, attempt.testName)} style={{ padding: "5px 10px", background: "#10b981", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: '12px', marginRight: "5px" }}>
                          Leaderboard
                        </button>
                        <button onClick={() => navigate(`/student/mock-test/review/${attempt.attemptId}`)} style={{ padding: "5px 10px", background: "#667eea", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: '12px' }}>
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedTestForLeaderboard && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "white", borderRadius: "12px", padding: "30px", maxWidth: "700px", width: "90%", maxHeight: "80vh", overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0 }}>Leaderboard: {selectedTestForLeaderboard.name}</h3>
                <button onClick={() => { setSelectedTestForLeaderboard(null); setLeaderboardData(null); }} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer" }}>x</button>
              </div>
              {leaderboardLoading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>Loading leaderboard...</div>
              ) : leaderboardData ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "20px", padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#667eea" }}>#{leaderboardData.currentUserRank || "-"}</div>
                      <div style={{ fontSize: "12px", color: "#888" }}>Your Rank</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981" }}>{leaderboardData.currentUserScore || 0}</div>
                      <div style={{ fontSize: "12px", color: "#888" }}>Your Score</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#764ba2" }}>{leaderboardData.totalParticipants || 0}</div>
                      <div style={{ fontSize: "12px", color: "#888" }}>Total Participants</div>
                    </div>
                  </div>
                  <h4 style={{ marginBottom: "15px" }}>Top 10 Students</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8f9fa" }}>
                        {["Rank", "Student", "Score", "Time"].map(h => (
                          <th key={h} style={{ padding: "10px", textAlign: h === "Student" ? "left" : "center", borderBottom: "2px solid #e0e0e0" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(leaderboardData.topTen || []).map((student) => (
                        <tr key={student.rank} style={{ background: student.isCurrentUser ? "#e8f4ff" : "transparent", borderBottom: "1px solid #e0e0e0" }}>
                          <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>
                            {student.rank === 1 ? "🥇" : student.rank === 2 ? "🥈" : student.rank === 3 ? "🥉" : `#${student.rank}`}
                          </td>
                          <td style={{ padding: "10px" }}>
                            {student.studentName}
                            {student.isCurrentUser && <span style={{ marginLeft: "8px", fontSize: "12px", background: "#667eea", color: "white", padding: "2px 6px", borderRadius: "4px" }}>You</span>}
                          </td>
                          <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold", color: "#667eea" }}>{student.score}</td>
                          <td style={{ padding: "10px", textAlign: "center" }}>{student.timeTakenMinutes} min</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>No leaderboard data available</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDoubtsContent = () => <DiscussionForum />;

  const renderMaterialsContent = () => (
    <div className="materials-content">
      <div className="section-header">
        <h2>Study Materials</h2>
        <div className="materials-filters">
          <select
            value={materialFilters.subject}
            onChange={(e) =>
              setMaterialFilters((prev) => ({
                ...prev,
                subject: e.target.value,
              }))
            }
          >
            <option>All Subjects</option>
            <option>Quantitative Aptitude</option>
            <option>Verbal Ability</option>
            <option>Data Interpretation</option>
            <option>Logical Reasoning</option>
            <option>General Knowledge</option>
          </select>
          <select
            value={materialFilters.type}
            onChange={(e) =>
              setMaterialFilters((prev) => ({ ...prev, type: e.target.value }))
            }
          >
            <option>All Types</option>
            <option>PDF</option>
            <option>Video</option>
            <option>Practice Sets</option>
            <option>Notes</option>
          </select>
        </div>
      </div>

      <div className="materials-grid">
        {materialsLoading ? (
          <div className="loading-materials">
            <div className="loading-spinner"></div>
            <p>Loading study materials...</p>
          </div>
        ) : studyMaterials.length === 0 ? (
          <div className="no-materials">
            <FiFileText size={48} />
            <h3>No Study Materials Found</h3>
            <p>Check back later for new materials or try different filters.</p>
          </div>
        ) : (
          studyMaterials.map((material) => (
            <div key={material._id} className="material-card">
              <div className="material-icon">
                {material.type === "PDF" ? (
                  <FiFileText />
                ) : material.type === "Video" ? (
                  <FiPlay />
                ) : (
                  <FiFileText />
                )}
              </div>
              <div className="material-info">
                <h4>{material.title}</h4>
                <div className="material-meta">
                  <span className="material-type">{material.type}</span>
                  <span className="material-size">{material.fileSize}</span>
                  <span className="material-downloads">
                    {material.viewCount || 0} views
                  </span>
                </div>
                {material.description && (
                  <p className="material-description">{material.description}</p>
                )}
                <div className="material-subject">
                  <small>{material.subject}</small>
                </div>
              </div>
              <div className="material-actions">
                <button
                  className="view-btn"
                  onClick={() => handleViewMaterial(material)}
                  title="View Material"
                >
                  <FiEye /> View
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderScheduleContent = () => (
    <div className="schedule-content">
      <div className="section-header">
        <h2>Schedule</h2>
        <div className="view-toggle">
          <button className="toggle-btn active">Week View</button>
          <button className="toggle-btn">Month View</button>
        </div>
      </div>

      <div className="schedule-calendar">
        <div className="calendar-controls">
          <button className="nav-btn">���</button>
          <h3>January 2024</h3>
          <button className="nav-btn">❯</button>
        </div>

        <div className="weekly-schedule">
          {[
            {
              day: "Monday",
              date: "15",
              events: [
                { time: "2:00 PM", title: "Quant Class", type: "class" },
              ],
            },
            {
              day: "Tuesday",
              date: "16",
              events: [{ time: "4:00 PM", title: "Mock Test", type: "test" }],
            },
            {
              day: "Wednesday",
              date: "17",
              events: [
                { time: "3:00 PM", title: "Verbal Class", type: "class" },
              ],
            },
            {
              day: "Thursday",
              date: "18",
              events: [
                { time: "2:00 PM", title: "DI Practice", type: "practice" },
              ],
            },
            {
              day: "Friday",
              date: "19",
              events: [
                { time: "4:00 PM", title: "Doubt Session", type: "doubt" },
              ],
            },
            {
              day: "Saturday",
              date: "20",
              events: [{ time: "10:00 AM", title: "Mock Test", type: "test" }],
            },
            { day: "Sunday", date: "21", events: [] },
          ].map((day, index) => (
            <div key={index} className="schedule-day">
              <div className="day-header">
                <h4>{day.day}</h4>
                <span className="date">{day.date}</span>
              </div>
              <div className="day-events">
                {day.events.map((event, eventIndex) => (
                  <div key={eventIndex} className={`event event-${event.type}`}>
                    <span className="event-time">{event.time}</span>
                    <span className="event-title">{event.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAnnouncementsContent = () => (
    <div className="announcements-content">
      <div className="section-header">
        <h2>Announcements</h2>
        <div className="announcement-filters">
          <button
            className={`filter-btn ${announcementFilters.type === "all" ? "active" : ""}`}
            onClick={() =>
              setAnnouncementFilters((prev) => ({ ...prev, type: "all" }))
            }
          >
            All
          </button>
          <button
            className={`filter-btn ${announcementFilters.type === "important" ? "active" : ""}`}
            onClick={() =>
              setAnnouncementFilters((prev) => ({ ...prev, type: "important" }))
            }
          >
            Important
          </button>
          <button
            className={`filter-btn ${announcementFilters.type === "update" ? "active" : ""}`}
            onClick={() =>
              setAnnouncementFilters((prev) => ({ ...prev, type: "update" }))
            }
          >
            Updates
          </button>
          <button
            className={`filter-btn ${announcementFilters.type === "reminder" ? "active" : ""}`}
            onClick={() =>
              setAnnouncementFilters((prev) => ({ ...prev, type: "reminder" }))
            }
          >
            Reminders
          </button>
        </div>
      </div>

      <div className="announcements-list">
        {announcementsLoading ? (
          <div className="loading-announcements">
            <div className="loading-spinner"></div>
            <p>Loading announcements...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="no-announcements">
            <FiBell size={48} />
            <h3>No Announcements</h3>
            <p>Check back later for new announcements.</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement._id}
              className={`announcement-card ${announcement.isUnread ? "unread" : ""}`}
              onClick={() => {
                if (announcement.isUnread) {
                  markAnnouncementAsRead(announcement._id);
                }
              }}
            >
              <div className="announcement-header">
                <h3>
                  {announcement.isPinned && (
                    <span className="pin-badge">📌</span>
                  )}
                  {getAnnouncementIcon(announcement.type)} {announcement.title}
                </h3>
                <span className="announcement-date">
                  {announcement.timeAgo ||
                    announcement.formattedDate ||
                    formatAnnouncementDate(announcement.createdAt)}
                </span>
              </div>
              <p>{announcement.content}</p>
              <div className="announcement-actions">
                <span className={`announcement-type ${announcement.type}`}>
                  {announcement.type.toUpperCase()}
                </span>
                <span
                  className={`announcement-priority priority-${announcement.priority}`}
                >
                  {announcement.priority.toUpperCase()}
                </span>
                {announcement.isUnread && (
                  <span className="unread-indicator">New</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderProfileContent = () => (
    <div className="profile-content-pro">
      <div className="profile-header-pro">
        <div className="profile-header-left">
          <h1>My Profile</h1>
          <p>Manage your account settings and preferences</p>
        </div>
        <button
          className="save-profile-btn"
          onClick={handleProfileUpdate}
          disabled={profileSaving}
        >
          <FiCheckCircle />
          {profileSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="profile-main-grid">
        <div className="profile-sidebar-card">
          <div className="profile-avatar-section">
            <div className="avatar-container">
              {userDetails.profileImage ? (
                <img
                  src={userDetails.profileImage}
                  alt="Profile"
                  className="profile-avatar-img"
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  <FiUser />
                </div>
              )}
              <button
                className="avatar-edit-btn"
                onClick={() => profileImageInputRef.current?.click()}
                disabled={profileImageUploading}
              >
                <FiEdit3 />
              </button>
            </div>
            <input
              type="file"
              ref={profileImageInputRef}
              onChange={handleProfileImageUpload}
              accept="image/*"
              style={{ display: "none" }}
            />
            <h2 className="profile-name-pro">
              {userDetails.name || "Student"}
            </h2>
            <p className="profile-email-pro">
              {userDetails.email || "student@example.com"}
            </p>
            {userDetails.phoneNumber && (
              <p className="profile-phone-pro">
                <FiPhone /> {userDetails.phoneNumber}
              </p>
            )}
          </div>

          {/* profile stats (streak/points) removed */}

          <button className="logout-btn-pro" onClick={handleLogout}>
            <FiLogOut /> Sign Out
          </button>
        </div>

        <div className="profile-details-section">
          <div className="profile-form-card">
            <div className="form-card-header">
              <FiUser className="form-card-icon" />
              <h3>Personal Information</h3>
            </div>
            <div className="form-grid-pro">
              <div className="form-group-pro">
                <label>Full Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group-pro">
                <label>Email Address</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="Enter your email"
                />
              </div>
              <div className="form-group-pro">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={profileForm.phoneNumber}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      phoneNumber: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group-pro">
                <label>Current Location</label>
                <input
                  type="text"
                  placeholder="City, State"
                  value={profileForm.city}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="profile-form-card">
            <div className="form-card-header">
              <FiTarget className="form-card-icon" />
              <h3>Exam Preferences</h3>
            </div>
            <div className="form-grid-pro">
              <div className="form-group-pro full-width">
                <label>Target Exam</label>
                <select
                  value={profileForm.targetExam}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      targetExam: e.target.value,
                    }))
                  }
                >
                  <option value="">Select your target exam</option>
                  <option value="CAT 2025">CAT 2025</option>
                  <option value="CAT 2026">CAT 2026</option>
                  <option value="XAT 2025">XAT 2025</option>
                  <option value="XAT 2026">XAT 2026</option>
                  <option value="NMAT 2025">NMAT 2025</option>
                  <option value="SNAP 2025">SNAP 2025</option>
                  <option value="IIFT 2025">IIFT 2025</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return renderDashboardContent();
      case "courses":
        return renderCoursesContent();
      case "my-courses":
        return renderMyCoursesContent();
      case "live-classes":
        return renderLiveClassesContent();
      case "practice-tests":
        return renderPracticeTestsContent();
      case "mock-tests":
        return renderMockTestsContent();
      case "analysis":
        return renderAnalysisContent();
      case "doubts":
        return renderDoubtsContent();
      case "materials":
        return renderMaterialsContent();
      case "schedule":
        return renderScheduleContent();
      case "announcements":
        return renderAnnouncementsContent();
      case "purchases":
        return renderPurchasesContent();
      case "profile":
        return renderProfileContent();
      default:
        return renderDashboardContent();
    }
  };

  return (
    <div className="student-lms">
      {/* Sidebar */}
      <div className={`lms-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">


        

<div className="logo">
  <Link to="/" className="logo-link" aria-label="Go to Home">
    <img src={logo} alt="TathaGat LMS" className="logo-img" />
  </Link>

  {/* <h2>TathaGat LMS</h2> */}
</div>




          <button
            className="close-sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX />
          </button>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? "active" : ""}`}
              onClick={() => {
                setActiveSection(item.id);
                setSidebarOpen(false);
              }}
            >
              <item.icon className="nav-icon" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="lms-main" ref={lmsMainRef}>
        {/* Top Navigation */}
        <header className="lms-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(true)}
            >
              <FiMenu />
            </button>
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input type="text" placeholder="Search courses, materials..." />
            </div>
          </div>

          <div className="header-right">
            <div className="profile-dropdown" ref={profileDropdownRef}>
              <button
                className="profile-btn"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div className="profile-avatar">
                  {userDetails.profileImage ? (
                    <img
                      src={userDetails.profileImage}
                      alt="Profile"
                      className="header-avatar-img"
                    />
                  ) : (
                    <FiUser />
                  )}
                </div>
                <span>{userDetails.name.split(" ")[0]}</span>
                <FiChevronDown />
              </button>

              {profileDropdownOpen && (
                <div className="dropdown-menu profile-info-dropdown">
                  <div className="profile-info-header">
                    <div className="profile-info-avatar">
                      {userDetails.profileImage ? (
                        <img
                          src={userDetails.profileImage}
                          alt="Profile"
                          className="dropdown-avatar-img"
                        />
                      ) : (
                        <FiUser />
                      )}
                    </div>
                    <div className="profile-info-details">
                      <h4>{userDetails.name}</h4>
                      {userDetails.phoneNumber && (
                        <p>
                          <FiPhone /> {userDetails.phoneNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <hr />
                  <button className="logout-btn" onClick={handleLogout}>
                    <FiLogOut /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="lms-content">{renderContent()}</main>
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div
          className="preview-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closePreview}
        >
          <div className="preview-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3 className="preview-title">Course Overview</h3>
              <button
                className="preview-close"
                onClick={closePreview}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <div className="preview-body" ref={previewRef}>
              {previewLoading ? (
                <div className="preview-loading">Loading...</div>
              ) : (
                <div className="overview-content">
                  <h4 className="ov-title">{previewData?.name}</h4>
                  <p className="ov-desc">
                    {previewData?.overview?.description ||
                      previewData?.description ||
                      "No description available."}
                  </p>
                  <div className="ov-section">
                    <h5>Material Includes</h5>
                    {Array.isArray(previewData?.overview?.materialIncludes) &&
                    previewData.overview.materialIncludes.length ? (
                      <ul className="ov-list">
                        {previewData.overview.materialIncludes.map(
                          (it, idx) => (
                            <li key={idx}>{it}</li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <p className="ov-muted">No materials listed.</p>
                    )}
                  </div>
                  <div className="ov-section">
                    <h5>Requirements</h5>
                    {Array.isArray(previewData?.overview?.requirements) &&
                    previewData.overview.requirements.length ? (
                      <ul className="ov-list">
                        {previewData.overview.requirements.map((it, idx) => (
                          <li key={idx}>{it}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="ov-muted">No requirements specified.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="preview-actions">
              <button
                className="download-btn"
                onClick={downloadOverviewPdf}
                disabled={previewLoading}
              >
                <FiDownload /> Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material Viewer Modal */}
      {materialViewerOpen && (
        <div
          className="material-viewer-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeMaterialViewer}
        >
          <div
            className="material-viewer-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="material-viewer-header">
              <h3 className="material-viewer-title">
                {selectedMaterial?.title}
              </h3>
              <button
                className="material-viewer-close"
                onClick={closeMaterialViewer}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <div className="material-viewer-body">
              {materialViewerLoading ? (
                <div className="material-viewer-loading">
                  Loading material...
                </div>
              ) : materialPdfUrl ? (
                <div className="material-viewer-content">
                  <div className="material-details">
                    <div className="detail-section">
                      <label>Type:</label>
                      <span>{selectedMaterial?.type}</span>
                    </div>
                    <div className="detail-section">
                      <label>Subject:</label>
                      <span>{selectedMaterial?.subject}</span>
                    </div>
                    <div className="detail-section">
                      <label>File Size:</label>
                      <span>{selectedMaterial?.fileSize}</span>
                    </div>
                    <div className="detail-section">
                      <label>Views:</label>
                      <span>{selectedMaterial?.viewCount || 0}</span>
                    </div>
                    {selectedMaterial?.description && (
                      <div className="detail-section full-width">
                        <label>Description:</label>
                        <p>{selectedMaterial.description}</p>
                      </div>
                    )}
                  </div>
                  <div className="material-pdf-container">
                    <iframe
                      src={`${materialPdfUrl}#toolbar=0&navpanes=0`}
                      title="Material Preview"
                      className="material-pdf-viewer"
                    />
                  </div>
                </div>
              ) : (
                <div className="material-viewer-error">
                  Failed to load material. Please try again.
                </div>
              )}
            </div>
            <div className="material-viewer-actions">
              <button className="close-btn" onClick={closeMaterialViewer}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt View Modal */}
      {viewReceiptModal && (
        <div
          className="receipt-view-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewReceiptModal(false)}
        >
          <div
            className="receipt-view-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="receipt-view-header">
              <h3>Receipt</h3>
              <button
                className="receipt-view-close"
                onClick={() => setViewReceiptModal(false)}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <div className="receipt-view-body">
              {viewReceiptLoading ? (
                <div className="receipt-view-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading receipt...</p>
                </div>
              ) : viewReceiptHtml ? (
                <iframe
                  srcDoc={viewReceiptHtml}
                  title="Receipt Preview"
                  className="receipt-iframe"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="receipt-view-error">
                  Failed to load receipt.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default StudentDashboard;
