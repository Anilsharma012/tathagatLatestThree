import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { FaTachometerAlt, FaBookOpen, FaUsers, FaUserGraduate, FaChalkboardTeacher, FaUserCircle, FaSignOutAlt, FaClipboardList, FaFileAlt, FaBullhorn, FaComments, FaGraduationCap, FaUniversity, FaBlog, FaYoutube, FaTrophy, FaFileInvoice, FaDownload, FaStar, FaCog, FaFilePdf, FaImages, FaUserPlus, FaChevronDown, FaChevronRight, FaUserShield, FaVideo, FaChartBar, FaTag, FaListAlt } from "react-icons/fa";
import logo from "../../../images/tgLOGO.png";
import { getStoredPermissions, isSuperAdmin } from "../../../utils/permissionMap";
import "./AdminSidebar.css";

const STORAGE_KEY_SCROLL = "adminSidebarScrollPos";
const STORAGE_KEY_SECTIONS = "adminSidebarSections";

const ICON_MAP = {
  FaTachometerAlt, FaBookOpen, FaUsers, FaUserGraduate, FaChalkboardTeacher,
  FaClipboardList, FaFileAlt, FaBullhorn, FaComments, FaGraduationCap,
  FaUniversity, FaBlog, FaYoutube, FaTrophy, FaFileInvoice, FaDownload,
  FaStar, FaCog, FaFilePdf, FaImages, FaUserPlus, FaUserShield, FaVideo,
  FaChartBar, FaTag, FaListAlt, FaUserCircle, FaSignOutAlt,
};

const SECTIONS = [
  {
    key: "courses", label: "Courses",
    items: [
      { path: "/admin/add-courses", label: "Add Courses", icon: "FaBookOpen", module: "courses" },
      { path: "/admin/course-content-manager", label: "Manage Subjects", icon: "FaBookOpen", module: "courses" },
      { path: "/admin/view-courses", label: "View Courses", icon: "FaBookOpen", module: "courses" },
    ]
  },
  {
    key: "tests", label: "Tests & Performance",
    items: [
      { path: "/admin/practice-tests", label: "Practice Tests", icon: "FaClipboardList", module: "practiceTests" },
      { path: "/admin/mock-tests", label: "Mock Tests", icon: "FaGraduationCap", module: "mockTests" },
      { path: "/admin/mock-test-feedback", label: "Test Feedback", icon: "FaComments", module: "mockTestFeedback" },
      { path: "/admin/student-performance", label: "Student Performance", icon: "FaUserGraduate", module: "reports" },
      { path: "/admin/iim-colleges", label: "IIM Predictor", icon: "FaUniversity", module: "iimPredictor" },
      { path: "/admin/response-sheet-submissions", label: "Response Sheets", icon: "FaFileInvoice", module: "responseSheets" },
      { path: "/admin/bschools", label: "B-Schools", icon: "FaUniversity", module: "bschools" },
    ]
  },
  {
    key: "content", label: "Content Management",
    items: [
      { path: "/admin/study-materials", label: "Study Materials", icon: "FaFileAlt", module: "studyMaterials" },
      { path: "/admin/pdf-management", label: "PDF Management", icon: "FaFilePdf", module: "pdfManagement" },
      { path: "/admin/announcements", label: "Announcements", icon: "FaBullhorn", module: "announcements" },
      { path: "/admin/popup-announcements", label: "Homepage Popups", icon: "FaBullhorn", module: "popupAnnouncements" },
      { path: "/admin/discussions", label: "Discussions", icon: "FaComments", module: "discussions" },
      { path: "/admin/blogs", label: "Blog Management", icon: "FaBlog", module: "blogs" },
      { path: "/admin/demo-videos", label: "Demo Videos", icon: "FaYoutube", module: "demoVideos" },
      { path: "/admin/image-gallery", label: "Image Gallery", icon: "FaImages", module: "gallery" },
      { path: "/admin/downloads", label: "Downloads", icon: "FaDownload", module: "downloads" },
      { path: "/admin/scorecard-management", label: "Score Cards", icon: "FaTrophy", module: "scoreCards" },
      { path: "/admin/success-stories", label: "Success Stories", icon: "FaTrophy", module: "successStories" },
      { path: "/admin/top-performers", label: "Best Results", icon: "FaStar", module: "topPerformers" },
      { path: "/admin/course-purchase-content", label: "Course Page Content", icon: "FaFileAlt", module: "coursePurchaseContent" },
    ]
  },
  {
    key: "liveClasses", label: "Live Classes",
    items: [
      { path: "/admin/live-batches", label: "Live Batches", icon: "FaVideo", module: "liveBatches" },
    ]
  },
  {
    key: "analytics", label: "Analytics & CRM",
    items: [
      { path: "/admin/inquiries", label: "All Inquiries", icon: "FaChartBar", module: "crm" },
      { path: "/admin/enquiries", label: "New Enquiries", icon: "FaChartBar", module: "crm" },
      { path: "/admin/counseling-enquiries", label: "Counseling Enquiries", icon: "FaChartBar", module: "crm" },
      { path: "/admin/billing-settings", label: "Billing Settings", icon: "FaCog", module: "billing" },
      { path: "/admin/upi-settings", label: "UPI Settings", icon: "FaCog", module: "billing" },
      { path: "/admin/manual-payment-verification", label: "Manual Payments", icon: "FaFileInvoice", module: "payments" },
      { path: "/admin/coupons", label: "Coupon Management", icon: "FaTag", module: "coupons" },
      { path: "/admin/onboarding-categories", label: "Exam Categories", icon: "FaListAlt", module: null },
    ]
  },
  {
    key: "users", label: "Users & Permissions",
    items: [
      { path: "/admin/user-management", label: "User Management", icon: "FaUserPlus", module: "students" },
      { path: "/admin/all-users", label: "All Users", icon: "FaUsers", module: "students" },
      { path: "/admin/all-students", label: "All Students", icon: "FaUserGraduate", module: "students" },
      { path: "/admin/all-teachers", label: "All Teachers", icon: "FaChalkboardTeacher", module: "faculty" },
      { path: "/admin/role-management", label: "Permissions", icon: "FaUserShield", module: "roleManagement" },
    ]
  },
];

const getInitialSections = () => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY_SECTIONS);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    courses: true,
    tests: true,
    content: true,
    analytics: true,
    crm: true,
    liveClasses: true,
    users: true,
    settings: true,
  };
};

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef(null);
  const [expandedSections, setExpandedSections] = useState(getInitialSections);

  const superAdmin = isSuperAdmin();
  const permissions = getStoredPermissions();

  const canView = (module) => {
    if (!module) return true;
    if (superAdmin || !permissions) return true;
    return permissions[module]?.view === true;
  };

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const savedPos = sessionStorage.getItem(STORAGE_KEY_SCROLL);
    if (savedPos) {
      requestAnimationFrame(() => {
        el.scrollTop = parseInt(savedPos, 10);
      });
    }
  }, [location.pathname]);

  const handleScroll = useCallback(() => {
    if (sidebarRef.current) {
      sessionStorage.setItem(STORAGE_KEY_SCROLL, String(sidebarRef.current.scrollTop));
    }
  }, []);

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => {
      const next = { ...prev, [section]: !prev[section] };
      try { sessionStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminPermissions");
    localStorage.removeItem("adminUser");
    sessionStorage.removeItem(STORAGE_KEY_SCROLL);
    sessionStorage.removeItem(STORAGE_KEY_SECTIONS);
    navigate("/admin/login");
  };

  const renderIcon = (iconName) => {
    const IconComp = ICON_MAP[iconName];
    return IconComp ? <IconComp className="admin-icon" /> : null;
  };

  return (
    <div className="admin-sidebar" ref={sidebarRef}>
      <div className="admin-logo">
        <img src={logo} alt="" />
      </div>
      <nav className="admin-nav">
        <NavLink to="/admin/dashboard" className="admin-link">
          <FaTachometerAlt className="admin-icon" /> Dashboard
        </NavLink>

        {SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => canView(item.module));
          if (visibleItems.length === 0) return null;

          return (
            <React.Fragment key={section.key}>
              <div className="admin-group-title" onClick={() => toggleSection(section.key)}>
                <span>{section.label}</span>
                {expandedSections[section.key] ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
              </div>
              {expandedSections[section.key] && (
                <div className="admin-group-items">
                  {visibleItems.map((item) => (
                    <NavLink key={item.path} to={item.path} className="admin-link">
                      {renderIcon(item.icon)} {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}

        <div className="admin-group-divider" />

        <NavLink to="/admin/profile" className="admin-link">
          <FaUserCircle className="admin-icon" /> Profile
        </NavLink>
        <a href="#" className="admin-link" onClick={handleLogout}>
          <FaSignOutAlt className="admin-icon" /> Logout
        </a>
      </nav>
    </div>
  );
};

export default AdminSidebar;
