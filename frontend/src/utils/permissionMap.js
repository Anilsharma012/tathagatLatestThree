const ROUTE_PERMISSION_MAP = {
  "/admin/dashboard": "dashboard",
  "/admin/add-courses": "courses",
  "/admin/course-content-manager": "courses",
  "/admin/view-courses": "courses",
  "/admin/courses": "courses",
  "/admin/practice-tests": "practiceTests",
  "/admin/mock-tests": "mockTests",
  "/admin/mock-test-feedback": "mockTestFeedback",
  "/admin/student-performance": "reports",
  "/admin/iim-colleges": "iimPredictor",
  "/admin/response-sheet-submissions": "responseSheets",
  "/admin/bschools": "bschools",
  "/admin/study-materials": "studyMaterials",
  "/admin/pdf-management": "pdfManagement",
  "/admin/announcements": "announcements",
  "/admin/popup-announcements": "popupAnnouncements",
  "/admin/discussions": "discussions",
  "/admin/blogs": "blogs",
  "/admin/demo-videos": "demoVideos",
  "/admin/image-gallery": "gallery",
  "/admin/downloads": "downloads",
  "/admin/scorecard-management": "scoreCards",
  "/admin/success-stories": "successStories",
  "/admin/top-performers": "topPerformers",
  "/admin/course-purchase-content": "coursePurchaseContent",
  "/admin/live-batches": "liveBatches",
  "/admin/live-classes": "liveClasses",
  "/admin/inquiries": "crm",
  "/admin/enquiries": "crm",
  "/admin/counseling-enquiries": "crm",
  "/admin/billing-settings": "billing",
  "/admin/coupons": "coupons",
  "/admin/onboarding-categories": "dashboard",
  "/admin/payments": "payments",
  "/admin/all-students": "students",
  "/admin/all-users": "students",
  "/admin/all-teachers": "faculty",
  "/admin/user-management": "students",
  "/admin/role-management": "roleManagement",
  "/admin/bulk-upload": "students",
  "/admin/hierarchy": "courses",
  "/admin/zoom": "liveClasses",
  "/admin/reports": "reports",
  "/admin/evaluation": "mockTests",
  "/admin/notifications": "notifications",
};

const ALWAYS_ALLOWED_ROUTES = [
  "/admin/dashboard",
  "/admin/profile",
  "/admin",
];

export function getRequiredPermission(pathname) {
  if (ALWAYS_ALLOWED_ROUTES.includes(pathname)) return null;

  if (ROUTE_PERMISSION_MAP[pathname]) return ROUTE_PERMISSION_MAP[pathname];

  const matchingKey = Object.keys(ROUTE_PERMISSION_MAP).find(
    (route) => pathname.startsWith(route + "/")
  );
  return matchingKey ? ROUTE_PERMISSION_MAP[matchingKey] : null;
}

export function hasPermission(permissions, module, action = "view") {
  if (!permissions || !module) return false;
  return permissions[module]?.[action] === true;
}

export function getStoredPermissions() {
  try {
    const perms = localStorage.getItem("adminPermissions");
    return perms ? JSON.parse(perms) : null;
  } catch {
    return null;
  }
}

export function getStoredAdminUser() {
  try {
    const user = localStorage.getItem("adminUser");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function isSuperAdmin() {
  const user = getStoredAdminUser();
  return user?.userType === "superadmin";
}

export const SIDEBAR_ITEMS = [
  { path: "/admin/dashboard", label: "Dashboard", icon: "FaTachometerAlt", module: null },

  { section: "courses", label: "Courses" },
  { path: "/admin/add-courses", label: "Add Courses", icon: "FaBookOpen", module: "courses" },
  { path: "/admin/course-content-manager", label: "Manage Subjects", icon: "FaBookOpen", module: "courses" },
  { path: "/admin/view-courses", label: "View Courses", icon: "FaBookOpen", module: "courses" },

  { section: "tests", label: "Tests & Performance" },
  { path: "/admin/practice-tests", label: "Practice Tests", icon: "FaClipboardList", module: "practiceTests" },
  { path: "/admin/mock-tests", label: "Mock Tests", icon: "FaGraduationCap", module: "mockTests" },
  { path: "/admin/mock-test-feedback", label: "Test Feedback", icon: "FaComments", module: "mockTestFeedback" },
  { path: "/admin/student-performance", label: "Student Performance", icon: "FaUserGraduate", module: "reports" },
  { path: "/admin/iim-colleges", label: "IIM Predictor", icon: "FaUniversity", module: "iimPredictor" },
  { path: "/admin/response-sheet-submissions", label: "Response Sheets", icon: "FaFileInvoice", module: "responseSheets" },
  { path: "/admin/bschools", label: "B-Schools", icon: "FaUniversity", module: "bschools" },

  { section: "content", label: "Content Management" },
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

  { section: "liveClasses", label: "Live Classes" },
  { path: "/admin/live-batches", label: "Live Batches", icon: "FaVideo", module: "liveBatches" },

  { section: "analytics", label: "Analytics & CRM" },
  { path: "/admin/inquiries", label: "All Inquiries", icon: "FaChartBar", module: "crm" },
  { path: "/admin/enquiries", label: "New Enquiries", icon: "FaChartBar", module: "crm" },
  { path: "/admin/counseling-enquiries", label: "Counseling Enquiries", icon: "FaChartBar", module: "crm" },
  { path: "/admin/billing-settings", label: "Billing Settings", icon: "FaCog", module: "billing" },
  { path: "/admin/coupons", label: "Coupon Management", icon: "FaTag", module: "coupons" },
  { path: "/admin/onboarding-categories", label: "Exam Categories", icon: "FaListAlt", module: null },

  { section: "users", label: "Users & Permissions" },
  { path: "/admin/user-management", label: "User Management", icon: "FaUserPlus", module: "students" },
  { path: "/admin/all-users", label: "All Users", icon: "FaUsers", module: "students" },
  { path: "/admin/all-students", label: "All Students", icon: "FaUserGraduate", module: "students" },
  { path: "/admin/all-teachers", label: "All Teachers", icon: "FaChalkboardTeacher", module: "faculty" },
  { path: "/admin/role-management", label: "Permissions", icon: "FaUserShield", module: "roleManagement" },
];

export default ROUTE_PERMISSION_MAP;
