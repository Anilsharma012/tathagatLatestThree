import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { FaTachometerAlt, FaBookOpen, FaUsers, FaUserGraduate, FaChalkboardTeacher, FaUserCircle, FaSignOutAlt, FaClipboardList, FaFileAlt, FaBullhorn, FaComments, FaGraduationCap, FaUniversity, FaBlog, FaYoutube, FaTrophy, FaFileInvoice, FaDownload, FaStar, FaCog, FaFilePdf, FaImages, FaUserPlus, FaChevronDown, FaChevronRight, FaUserShield, FaVideo, FaChartBar, FaTag } from "react-icons/fa";
import logo from "../../../images/tgLOGO.png";
import "./AdminSidebar.css";

const STORAGE_KEY_SCROLL = "adminSidebarScrollPos";
const STORAGE_KEY_SECTIONS = "adminSidebarSections";

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
    sessionStorage.removeItem(STORAGE_KEY_SCROLL);
    sessionStorage.removeItem(STORAGE_KEY_SECTIONS);
    navigate("/admin/login");
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

        <div className="admin-group-title" onClick={() => toggleSection("courses")}>
          <span>Courses</span>
          {expandedSections.courses ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
        </div>
        {expandedSections.courses && (
          <div className="admin-group-items">
            <NavLink to="/admin/add-courses" className="admin-link">
              <FaBookOpen className="admin-icon" /> Add Courses
            </NavLink>
            <NavLink to="/admin/course-content-manager" className="admin-link">
              <FaBookOpen className="admin-icon" /> Manage Subjects
            </NavLink>
            <NavLink to="/admin/view-courses" className="admin-link">
              <FaBookOpen className="admin-icon" /> View Courses
            </NavLink>
          </div>
        )}

        <div className="admin-group-title" onClick={() => toggleSection("tests")}>
          <span>Tests & Performance</span>
          {expandedSections.tests ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
        </div>
        {expandedSections.tests && (
          <div className="admin-group-items">
            <NavLink to="/admin/practice-tests" className="admin-link">
              <FaClipboardList className="admin-icon" /> Practice Tests
            </NavLink>
            <NavLink to="/admin/mock-tests" className="admin-link">
              <FaGraduationCap className="admin-icon" /> Mock Tests
            </NavLink>
            <NavLink to="/admin/mock-test-feedback" className="admin-link">
              <FaComments className="admin-icon" /> Test Feedback
            </NavLink>
            <NavLink to="/admin/student-performance" className="admin-link">
              <FaUserGraduate className="admin-icon" /> Student Performance
            </NavLink>
            <NavLink to="/admin/iim-colleges" className="admin-link">
              <FaUniversity className="admin-icon" /> IIM Predictor
            </NavLink>
            <NavLink to="/admin/response-sheet-submissions" className="admin-link">
              <FaFileInvoice className="admin-icon" /> Response Sheets
            </NavLink>
            <NavLink to="/admin/bschools" className="admin-link">
              <FaUniversity className="admin-icon" /> B-Schools
            </NavLink>
          </div>
        )}

        <div className="admin-group-title" onClick={() => toggleSection("content")}>
          <span>Content Management</span>
          {expandedSections.content ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
        </div>
        {expandedSections.content && (
          <div className="admin-group-items">
            <NavLink to="/admin/study-materials" className="admin-link">
              <FaFileAlt className="admin-icon" /> Study Materials
            </NavLink>
            <NavLink to="/admin/pdf-management" className="admin-link">
              <FaFilePdf className="admin-icon" /> PDF Management
            </NavLink>
            <NavLink to="/admin/announcements" className="admin-link">
              <FaBullhorn className="admin-icon" /> Announcements
            </NavLink>
            <NavLink to="/admin/popup-announcements" className="admin-link">
              <FaBullhorn className="admin-icon" /> Homepage Popups
            </NavLink>
            <NavLink to="/admin/discussions" className="admin-link">
              <FaComments className="admin-icon" /> Discussions
            </NavLink>
            <NavLink to="/admin/blogs" className="admin-link">
              <FaBlog className="admin-icon" /> Blog Management
            </NavLink>
            <NavLink to="/admin/demo-videos" className="admin-link">
              <FaYoutube className="admin-icon" /> Demo Videos
            </NavLink>
            <NavLink to="/admin/image-gallery" className="admin-link">
              <FaImages className="admin-icon" /> Image Gallery
            </NavLink>
            <NavLink to="/admin/downloads" className="admin-link">
              <FaDownload className="admin-icon" /> Downloads
            </NavLink>
            <NavLink to="/admin/scorecard-management" className="admin-link">
              <FaTrophy className="admin-icon" /> Score Cards
            </NavLink>
            <NavLink to="/admin/success-stories" className="admin-link">
              <FaTrophy className="admin-icon" /> Success Stories
            </NavLink>
            <NavLink to="/admin/top-performers" className="admin-link">
              <FaStar className="admin-icon" /> Best Results
            </NavLink>
            <NavLink to="/admin/course-purchase-content" className="admin-link">
              <FaFileAlt className="admin-icon" /> Course Page Content
            </NavLink>
          </div>
        )}

        <div className="admin-group-title" onClick={() => toggleSection("liveClasses")}>
          <span>Live Classes</span>
          {expandedSections.liveClasses ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
        </div>
        {expandedSections.liveClasses && (
          <div className="admin-group-items">
            <NavLink to="/admin/live-batches" className="admin-link">
              <FaVideo className="admin-icon" /> Live Batches
            </NavLink>
          </div>
        )}

        <div className="admin-group-title" onClick={() => toggleSection("analytics")}>
          <span>Analytics & CRM</span>
          {expandedSections.analytics ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
        </div>
        {expandedSections.analytics && (
          <div className="admin-group-items">
            <NavLink to="/admin/inquiries" className="admin-link">
              <FaChartBar className="admin-icon" /> All Inquiries
            </NavLink>
            <NavLink to="/admin/enquiries" className="admin-link">
              <FaChartBar className="admin-icon" /> New Enquiries
            </NavLink>
            <NavLink to="/admin/counseling-enquiries" className="admin-link">
              <FaChartBar className="admin-icon" /> Counseling Enquiries
            </NavLink>
            <NavLink to="/admin/billing-settings" className="admin-link">
              <FaCog className="admin-icon" /> Billing Settings
            </NavLink>
            <NavLink to="/admin/coupons" className="admin-link">
              <FaTag className="admin-icon" /> Coupon Management
            </NavLink>
          </div>
        )}

        <div className="admin-group-title" onClick={() => toggleSection("users")}>
          <span>Users & Permissions</span>
          {expandedSections.users ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
        </div>
        {expandedSections.users && (
          <div className="admin-group-items">
            <NavLink to="/admin/user-management" className="admin-link">
              <FaUserPlus className="admin-icon" /> User Management
            </NavLink>
            <NavLink to="/admin/all-users" className="admin-link">
              <FaUsers className="admin-icon" /> All Users
            </NavLink>
            <NavLink to="/admin/all-students" className="admin-link">
              <FaUserGraduate className="admin-icon" /> All Students
            </NavLink>
            <NavLink to="/admin/all-teachers" className="admin-link">
              <FaChalkboardTeacher className="admin-icon" /> All Teachers
            </NavLink>
            <NavLink to="/admin/role-management" className="admin-link">
              <FaUserShield className="admin-icon" /> Permissions
            </NavLink>
          </div>
        )}

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
