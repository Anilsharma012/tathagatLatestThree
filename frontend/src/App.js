import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  Navigate,
  useLocation,
  Form,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/global-responsive.css";
import "./utils/razorpayBuy";
import DevNotification from "./components/DevNotification/DevNotification";

// Import sab pages yaha rakh de
import Home from "./pages/Home/Home";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";

import Login from "./components/Login/Login";
import Signup from "./components/Signup/Signup";
import AuthLogin from "./pages/Auth/AuthLogin";
import StudentOnboarding from "./pages/Student/Onboarding/StudentOnboarding";
import StudentProfile from "./pages/Student/Profile/StudentProfile";

import UserDetails from "./components/UserDetails/Userdetails/UserDetails";
import ExamCategory from "./components/UserDetails/ExamCategory/ExamCategory";
import ExamSelection from "./components/UserDetails/ExamSelection/ExamSelection";

import AdminLogin from "./pages/mainAdmin/AdminLogin";

import SubAdminLogin from "./pages/MainSubAdmin/SubAdminLogin/SubAdminLogin";
import SubAdminDashboard from "./pages/MainSubAdmin/SubAdminDashboard/SubAdminDashboard";
import StudentInformation from "./components/StudentInformation/StudentInformation";
import IIMPredictor from "./pages/IIMPredictor/IIMPredictor";
import IIMPredictorResult from "./components/IIMPredictorResult/IIMPredictorResult";
import ManageInstructors from "./pages/SubAdmin/ManageInstructors/ManageInstructors";

// import AddCourse from "./subpages/ManageCourses/AddCourse";

import ExamPage from "./subpages/ExamPage/ExamPage";
import ResultPage from "./subpages/ResultPage/ResultPage";

import StudentDashboard from "./pages/Student/Dashboard";
import AboutUs from "./pages/AboutUs/AboutUs";
import OurBlogs from "./pages/ourBlogs/OurBlogs";
import BlogView from "./pages/ourBlogs/BlogView";
import Tips from "./pages/Tips/Tips";
import GetInTouch from "./pages/GetInTouch/GetInTouch";

import ResourcesPage from "./pages/Resources/ResourcesPage";
import OurFaculity from "./pages/ourFaculity/OurFaculity";
import PrivacyPolicy from "./pages/PolicyPages/PrivacyPolicy";
import RefundPolicy from "./pages/PolicyPages/RefundPolicy";
import TermsConditions from "./pages/PolicyPages/TermsConditions";
import CourseDetails from "./pages/CourseDetails/CourseDetails";
import CoursePurchase from "./pages/CousePurchase/CoursePurchase";
// import MyCourses from "./pages/Student/MyCourses/MyCourses";
import StudentLayout from "./pages/Student/StudentLayout/StudentLayout";

import AdminDashboard from "./pages/mainAdmin/AdminDashboard";
import AdminLayout from "./pages/mainAdmin/AdminLayout/AdminLayout";
import AllStudents from "./pages/mainAdmin/AllStudents/AllStudents";
import AllTeachers from "./pages/mainAdmin/AllTeachers/AllTeachers";
import AdminProfile from "./pages/mainAdmin/AdminProfile/AdminProfile";
import AddCourse from "./pages/mainAdmin/AddCourse/AddCourse";
import AllUsers from "./pages/mainAdmin/AllUsers/AllUsers";
import UserManagement from "./pages/mainAdmin/UserManagement/UserManagement";
import CourseContentManager from "./pages/mainAdmin/CourseContentManager/CourseContentManager";
import CourseTreeView from "./pages/mainAdmin/CourseTreeView/CourseTreeView";
import CourseStructure from "./pages/mainAdmin/CourseTreeView/CourseStructure";
import PracticeTestManagement from "./pages/mainAdmin/PracticeTestManagement/PracticeTestManagement";
import StudyMaterials from "./pages/mainAdmin/StudyMaterials/StudyMaterials";
import PdfManagement from "./pages/mainAdmin/PdfManagement/PdfManagement";
import Announcements from "./pages/mainAdmin/Announcements/Announcements";
import DiscussionManagement from "./pages/mainAdmin/DiscussionManagement/DiscussionManagement";
import MockTestManagement from "./pages/mainAdmin/MockTestManagement/MockTestManagement";
import MockTestFeedback from "./pages/Admin/MockTestFeedback";
import StudentPerformance from "./pages/mainAdmin/StudentPerformance/StudentPerformance";
import IIMCollegeManagement from "./pages/mainAdmin/IIMCollegeManagement/IIMCollegeManagement";
import BSchoolManagement from "./pages/mainAdmin/BSchoolManagement/BSchoolManagement";
import PopupAnnouncementManagement from "./pages/mainAdmin/PopupAnnouncements/PopupAnnouncementManagement";
import StudentPracticeTests from "./pages/Student/PracticeTests/StudentPracticeTests";
import TestInstructions from "./pages/Student/PracticeTests/TestInstructions";
import MockTestPage from "./pages/Student/MockTests/MockTestPage";
import MockTestInstructions from "./pages/Student/MockTests/MockTestInstructions";
import MockTestTerms from "./pages/Student/MockTests/MockTestTerms";
import MockTestAttempt from "./pages/Student/MockTests/MockTestAttempt";
import MockTestReview from "./pages/Student/MockTests/MockTestReview";
import CourseViewer from "./pages/Student/CourseViewer/CourseViewer";
import StudentCourseContentManager from "./pages/Student/CourseContentManager/StudentCourseContentManager";
import StudentMyProgress from "./pages/Student/Progress/StudentMyProgress";
import StudentOCRUpload from "./pages/Student/OCR/StudentOCRUpload";
import StudentOMRUpload from "./pages/Student/OMR/StudentOMRUpload";
import StudentReports from "./pages/Student/Reports/StudentReports";
import SuccessStory from "./pages/SuccessStory/SuccessStory";
import Faq from "./pages/Faq/Faq";
import ScoreCard from "./pages/ScoreCard/ScoreCard";
import Team from "./pages/Team/Team";
import ImageGallery from "./pages/ImageGallery/ImageGallery";
import MockTest from "./pages/MockTest/MockTest";
import FinalResource from "./pages/FinalResource/FinalResource";
import WhySection from "./components/whySection/WhySection";
import Cat from "./pages/cat/Cat";
import Testimonial from "./pages/Testimonial/Testimonial";
import CourseComprasion from "./components/CourseComprasion/CourseComprasion";
import FAQ from "./components/FAQ/FAQ";
import Mycourse from "./components/MyCourses/Mycourse";
import MyCourses from "./pages/MyCourses/MyCourses";
import ExploreBlog from "./components/ExploreBlog/ExploreBlog";
import Instruction from "./components/Instruction/Instruction";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import DevModeNotification from "./components/DevModeNotification/DevModeNotification";
import Myteam from "./components/myTeam/Myteam";
import CRMLeads from "./pages/mainAdmin/CRM/CRMLeads";
import NewEnquiries from "./pages/mainAdmin/CRM/NewEnquiries";
import CounselingEnquiries from "./pages/mainAdmin/CRM/CounselingEnquiries";
import CRMLeadForm from "./pages/mainAdmin/CRM/CRMLeadForm";
import CRMLeadDetail from "./pages/mainAdmin/CRM/CRMLeadDetail";
import CRMPipeline from "./pages/mainAdmin/CRM/CRMPipeline";
import CRMInvoices from "./pages/mainAdmin/CRM/CRMInvoices";
import CRMSettings from "./pages/mainAdmin/CRM/CRMSettings";
import InquiryManagement from "./pages/mainAdmin/CRM/InquiryManagement";
import PaymentManagement from "./pages/mainAdmin/PaymentManagement/PaymentManagement";
import AdminStudentDetail from "./pages/mainAdmin/CRM/AdminStudentDetail";
import AdminEvaluateAnswers from "./pages/mainAdmin/Evaluation/AdminEvaluateAnswers";
import OCRDashboard from "./pages/mainAdmin/Evaluation/OCRDashboard";
import AdminReports from "./pages/mainAdmin/Reports/AdminReports";
import AdminLiveClasses from "./pages/mainAdmin/LiveClasses/AdminLiveClasses";
import LiveBatchManagement from "./pages/mainAdmin/LiveClasses/LiveBatchManagement";
import BatchManagement from "./pages/mainAdmin/BatchManagement/BatchManagement";
import BlogManagement from "./pages/mainAdmin/BlogManagement/BlogManagement";
import DemoVideoManagement from "./pages/mainAdmin/DemoVideoManagement/DemoVideoManagement";
import ImageGalleryManagement from "./pages/mainAdmin/ImageGalleryManagement/ImageGalleryManagement";
import DownloadsManagement from "./pages/mainAdmin/DownloadsManagement/DownloadsManagement";
import ScoreCardManagement from "./pages/mainAdmin/ScoreCardManagement/ScoreCardManagement";
import SuccessStoryManagement from "./pages/mainAdmin/SuccessStoryManagement/SuccessStoryManagement";
import TopPerformerManagement from "./pages/mainAdmin/TopPerformerManagement/TopPerformerManagement";
import CoursePurchaseContentManagement from "./pages/mainAdmin/CoursePurchaseContentManagement/CoursePurchaseContentManagement";
import ResponseSheetSubmissions from "./pages/mainAdmin/ResponseSheetSubmissions/ResponseSheetSubmissions";
import BillingSettings from "./pages/mainAdmin/BillingSettings/BillingSettings";
import CouponManagement from "./pages/mainAdmin/CouponManagement/CouponManagement";
import OnboardingCategoryManagement from "./pages/mainAdmin/OnboardingCategoryManagement/OnboardingCategoryManagement";
import RoleManagement from "./pages/mainAdmin/RoleManagement/RoleManagement";
import UpiSettingsPage from "./pages/mainAdmin/UpiSettings/UpiSettings";
import ManualPaymentVerification from "./pages/mainAdmin/ManualPaymentVerification/ManualPaymentVerification";
import OfflineAdmission from "./pages/mainAdmin/OfflineAdmission/OfflineAdmission";
import PermissionGuard from "./components/PermissionGuard/PermissionGuard";
import Unauthorized from "./components/Unauthorized/Unauthorized";
import RoleLogin from "./pages/mainAdmin/RoleLogin/RoleLogin";
import TeacherLiveClasses from "./pages/MainSubAdmin/LiveClasses/TeacherLiveClasses";
import StudentLiveClasses from "./pages/Student/LiveClasses/StudentLiveClasses";
import ContinueLearning from "./pages/Student/ContinueLearning/ContinueLearning";
import LiveClassPage from "./pages/Student/LiveClasses/LiveClassPage";
import PurchaseHistory from "./pages/Student/PurchaseHistory/PurchaseHistory";

import DevNotificationComp from "./components/DevNotification/DevNotification"; // (alias safe)
import Cet2026 from "./footerPages/Cet2026";
import XAT from "./footerPages/XAT";
import CAT2026 from "./footerPages/CAT2026";
import SRCC2025 from "./footerPages/SRCC";
import SNAP from "./footerPages/SNAP";
import GMAT from "./footerPages/GMAT";
import MAT from "./footerPages/MAT";
import MICA from "./footerPages/MICA";
import TISSNET from "./footerPages/TISSNET";
import IIMIndore from "./footerPages/IIMIndore";
import IIMRohtak from "./footerPages/IIMRohtak";
import JIPMAT from "./footerPages/JIPMAT";
import IPUCET from "./footerPages/IPUCET";
import AboutCUET from "./footerPages/AboutCUET";
import NPAT from "./footerPages/NPAT";
import SET from "./footerPages/SET";
import ChristUniversity from "./footerPages/ChristUniversity";

import Cat26Online from "./CoursePurchasepage/Cat26Online";
import Cat2026Classes from "./CoursePurchasepage/Cat2026Classes";
import Cat26AdvanceCurse from "./CoursePurchasepage/Cat26AdvanceCourse";
import Cat26OMETOnline from "./CoursePurchasepage/Cat26OMETOnline";

import Staticourse from "./components/StaticCourse/Staticourse";
import Chatbox from "./components/Chat/Chatbox";

// Auto-login functionality is handled in AppContent useEffect

// PrivateRoute: Flexible to handle admin and subadmin tokens
const PrivateRoute = ({ children, tokenName }) => {
  const token = localStorage.getItem(tokenName);
  return token ? (
    children
  ) : (
    <Navigate to={tokenName === "adminToken" ? "/admin" : "/subadmin"} />
  );
};

/** 🔝 Global ScrollToTop on route change */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
};

// Main app content
const AppContent = () => {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const existingToken = localStorage.getItem("adminToken");
      if (!existingToken) {
        const devAdminToken = "dev_admin_token_12345";
        localStorage.setItem("adminToken", devAdminToken);
        localStorage.setItem("adminUser", JSON.stringify({ userType: "superadmin", fullName: "Dev Admin" }));
        console.log("🔧 Development: Auto-set admin token");
      }
    }
  }, []);

  // Check if current route is admin/subadmin login page to hide header/footer
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/role/");
  const isSubAdminRoute =
    location.pathname.startsWith("/subadmin") &&
    !location.pathname.startsWith("/subadmin/dashboard");
  const isStudentDashboard = location.pathname.startsWith("/student");

  return (
    <>
      <DevModeNotification />
      {!isAdminRoute && !isSubAdminRoute && !isStudentDashboard && (
        <Header user={user} setUser={setUser} />
      )}

      <Routes>
        {/* Public and user routes */}
        <Route path="/" element={<Home />} />
        <Route
          path="/Login"
          element={<Login setUser={setUser} onClose={() => {}} />}
        />
        <Route path="/signup" element={<Signup setUser={setUser} />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/unauthorized" element={<Unauthorized />} />
        <Route path="/admin/dashboard" element={<PrivateRoute tokenName="adminToken"><PermissionGuard><AdminDashboard /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/all-students" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="students"><AllStudents /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/all-teachers" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="faculty"><AllTeachers /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/profile" element={<PrivateRoute tokenName="adminToken"><AdminProfile /></PrivateRoute>} />
        <Route path="/admin/add-courses" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="courses"><AddCourse /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/all-users" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="students"><AllUsers /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/user-management" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="students"><UserManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/course-content-manager" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="courses"><CourseContentManager /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/view-courses" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="courses"><CourseTreeView /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/courses/:courseId/structure" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="courses"><CourseStructure /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/practice-tests" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="practiceTests"><PracticeTestManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/study-materials" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="studyMaterials"><StudyMaterials /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/pdf-management" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="pdfManagement"><PdfManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/announcements" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="announcements"><Announcements /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/discussions" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="discussions"><DiscussionManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/blogs" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="blogs"><BlogManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/demo-videos" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="demoVideos"><DemoVideoManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/image-gallery" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="gallery"><ImageGalleryManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/downloads" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="downloads"><DownloadsManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/scorecard-management" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="scoreCards"><ScoreCardManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/success-stories" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="successStories"><SuccessStoryManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/top-performers" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="topPerformers"><TopPerformerManagement /></PermissionGuard></PrivateRoute>} />
        <Route
          path="/admin/course-purchase-content"
          element={
            <PrivateRoute tokenName="adminToken">
              <PermissionGuard module="coursePurchaseContent">
              <CoursePurchaseContentManagement />
              </PermissionGuard>
            </PrivateRoute>
          }
        />

        <Route path="/admin/mock-tests" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="mockTests"><MockTestManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/mock-test-feedback" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="mockTestFeedback"><MockTestFeedback /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/student-performance" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="reports"><StudentPerformance /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/iim-colleges" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="iimPredictor"><IIMCollegeManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/response-sheet-submissions" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="responseSheets"><ResponseSheetSubmissions /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/bschools" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="bschools"><BSchoolManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/popup-announcements" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="popupAnnouncements"><PopupAnnouncementManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/students/:id" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="students"><AdminStudentDetail /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/live-classes" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="liveClasses"><AdminLiveClasses /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/live-batches" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="liveBatches"><AdminLayout><LiveBatchManagement /></AdminLayout></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/batch-management" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="batches"><BatchManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/evaluation" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="mockTests"><AdminEvaluateAnswers /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/ocr" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="mockTests"><OCRDashboard /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/evaluate-answers" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="mockTests"><AdminEvaluateAnswers /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/reports" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="reports"><AdminReports /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/inquiries" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="crm"><InquiryManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/enquiries" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="crm"><NewEnquiries /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/counseling-enquiries" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="crm"><CounselingEnquiries /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/crm/leads" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="crm"><CRMLeads /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/crm/leads/new" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="crm"><CRMLeadForm /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/crm/leads/:id" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="crm"><CRMLeadDetail /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/crm/pipeline" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="crm"><CRMPipeline /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/crm/invoices" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="crm"><CRMInvoices /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/crm/settings" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="crm"><CRMSettings /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/payments" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="payments"><PaymentManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/billing-settings" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="billing"><BillingSettings /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/coupons" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="coupons"><CouponManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/onboarding-categories" element={<PrivateRoute tokenName="adminToken"><OnboardingCategoryManagement /></PrivateRoute>} />
        <Route path="/admin/role-management" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="roleManagement"><RoleManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/roles" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="roleManagement"><RoleManagement /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/upi-settings" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="billing"><UpiSettingsPage /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/manual-payment-verification" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="payments"><ManualPaymentVerification /></PermissionGuard></PrivateRoute>} />
        <Route path="/admin/offline-admission" element={<PrivateRoute tokenName="adminToken"><PermissionGuard module="payments"><OfflineAdmission /></PermissionGuard></PrivateRoute>} />

        {/* SubAdmin routes */}
        <Route path="/subadmin" element={<SubAdminLogin />} />
        <Route
          path="/subadmin/dashboard"
          element={
            <PrivateRoute tokenName="subadminToken">
              <SubAdminDashboard />
            </PrivateRoute>
          }
        />
        {/* Teacher Live Classes */}
        <Route
          path="/teacher/live-classes"
          element={
            <PrivateRoute tokenName="subadminToken">
              <TeacherLiveClasses />
            </PrivateRoute>
          }
        />

        {/* Auth routes */}
        <Route path="/auth/login" element={<AuthLogin />} />
        <Route path="/student/onboarding" element={<StudentOnboarding />} />

        {/* Other routes */}
        <Route path="/user-details" element={<UserDetails />} />
        <Route path="/exam-category" element={<ExamCategory />} />
        <Route path="/exam-selection/:category" element={<ExamSelection />} />
        {/* <Route path="/study-zone" element={<StudentDashboard />} /> */}
        <Route path="/student-information" element={<StudentInformation />} />
        <Route path="/IIM-Predictor" element={<IIMPredictor />} />
        <Route path="/iim-results/:userId" element={<IIMPredictorResult />} />
        <Route path="/manage-instructors" element={<ManageInstructors />} />
        <Route path="/add-course" element={<AddCourse />} />
        <Route path="/exam" element={<ExamPage />} />
        <Route path="/exam/result" element={<ResultPage />} />

        <Route path="/AboutUs" element={<AboutUs />} />
        <Route path="/Tips" element={<Tips />} />
        <Route path="/GetInTouch" element={<GetInTouch />} />
        <Route path="/Testimonial" element={<Testimonial />} />
        <Route path="/resourcespage" element={<ResourcesPage />} />
        <Route path="/ourfaculity" element={<OurFaculity />} />
        <Route path="/course-details" element={<CourseDetails />} />
        <Route path="/course-purchase/:courseId" element={<CoursePurchase />} />
        <Route path="/course-purchase" element={<CoursePurchase />} />
        <Route path="/success-stories" element={<SuccessStory />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/score-card" element={<ScoreCard />} />
        <Route path="/team" element={<Team />} />
        <Route path="/image-gallery" element={<ImageGallery />} />
        <Route path="/mock-test" element={<MockTest />} />
        <Route path="/resource" element={<FinalResource />} />
        <Route path="/ourBlog" element={<OurBlogs />} />
        <Route path="/blog/:slug" element={<BlogView />} />
        <Route path="/myteam" element={<Myteam />} />
        <Route path="/why" element={<WhySection />} />
        <Route path="/cat" element={<Cat />} />
        <Route path="/compare" element={<CourseComprasion />} />
        <Route path="/faqs" element={<FAQ />} />
        <Route path="/my-courses" element={<MyCourses />} />
        <Route path="/explore-blog" element={<ExploreBlog />} />
        <Route path="/instruction" element={<Instruction />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/refund" element={<RefundPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsConditions />} />

        <Route path="/student" element={<StudentLayout />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="practice-tests" element={<StudentPracticeTests />} />
          <Route
            path="practice-tests/:testId/instructions"
            element={<TestInstructions />}
          />
          <Route path="mock-tests" element={<MockTestPage />} />
          <Route
            path="mock-test/:testId/instructions"
            element={<MockTestInstructions />}
          />
          <Route path="mock-test/:testId/terms" element={<MockTestTerms />} />
          <Route
            path="mock-test/:testId/attempt/:attemptId"
            element={<MockTestAttempt />}
          />
          <Route
            path="mock-test/review/:attemptId"
            element={<MockTestReview />}
          />
          <Route path="my-courses" element={<MyCourses />} />
          <Route path="my-progress" element={<StudentMyProgress />} />
          <Route path="ocr-upload" element={<StudentOCRUpload />} />
          <Route path="omr-upload" element={<StudentOMRUpload />} />
          <Route path="reports" element={<StudentReports />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="course/:courseId" element={<CourseViewer />} />
          <Route
            path="course-content/:courseId"
            element={<StudentCourseContentManager />}
          />
          <Route path="continue-learning" element={<ContinueLearning />} />
          <Route path="live-class" element={<LiveClassPage />} />
          <Route path="live-classes" element={<StudentLiveClasses />} />
          <Route path="purchase-history" element={<PurchaseHistory />} />
        </Route>

        {/* Redirect all unknown routes to admin login */}
        {/* <Route path="*" element={<Navigate to="/admin" />} /> */}
        <Route path="/cet2026" element={<Cet2026 />} />
        <Route path="/XAT" element={<XAT />} />
        <Route path="/TISSNET" element={<TISSNET />} />
        <Route path="/MICA" element={<MICA />} />
        <Route path="/MAT" element={<MAT />} />
        <Route path="/GMAT" element={<GMAT />} />
        <Route path="/SNAP" element={<SNAP />} />
        <Route path="/SRCC" element={<SRCC2025 />} />
        <Route path="/CAT2026" element={<CAT2026 />} />

        <Route path="/AboutCUET" element={<AboutCUET />} />
        <Route path="/NPAT" element={<NPAT />} />
        <Route path="/SET" element={<SET />} />
        <Route path="/ChristUniversity" element={<ChristUniversity />} />
        <Route path="/IIMIndore" element={<IIMIndore />} />
        <Route path="/IIMRohtak" element={<IIMRohtak />} />
        <Route path="/IPUCET" element={<IPUCET />} />
        <Route path="/JIPMAT" element={<JIPMAT />} />

        <Route path="/Cat26Online" element={<Cat26Online />} />
        <Route path="/Cat2026Classes" element={<Cat2026Classes />} />
        <Route path="/Cat26Advance" element={<Cat26AdvanceCurse />} />
        <Route path="/Cat26OMETOnline" element={<Cat26OMETOnline />} />

        <Route path="/Staticcourse" element={<Staticourse />} />
        <Route path="/Chat" element={<Chatbox />} />

        {/* Dynamic role-based login routes */}
        <Route path="/role/:roleSlug" element={<RoleLogin />} />
      </Routes>

      {!isAdminRoute && !isSubAdminRoute && !isStudentDashboard && <Footer />}
    </>
  );
};

const App = () => {
  // Disable browser's automatic scroll restoration
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  return (
    <ErrorBoundary>
      <DevNotificationComp />
      <BrowserRouter>
        {/* 🔝 ensure every route change scrolls to top */}
        <ScrollToTop />
        <AppContent />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
