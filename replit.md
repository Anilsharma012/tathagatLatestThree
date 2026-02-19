# TathaGat - CAT Exam Preparation Platform

## Overview
TathaGat is a full-stack education platform for CAT/XAT/SNAP exam preparation. It includes course management, mock tests, live classes, study materials, discussion forums, and payment integration.

## Project Architecture

### Frontend (React CRA)
- **Location**: `/frontend`
- **Port**: 5000 (bound to 0.0.0.0)
- **Framework**: Create React App (React 18)
- **Key Libraries**: react-router-dom, axios, chart.js, recharts, framer-motion, react-toastify, razorpay integration
- **Proxy**: `/api` and `/uploads` requests are proxied to the backend at `http://127.0.0.1:3001` via `src/setupProxy.js`

### Backend (Express.js)
- **Location**: `/backend`
- **Port**: 3001 (bound to 0.0.0.0)
- **Framework**: Express.js with Mongoose ORM
- **Database**: MongoDB Atlas (external)
- **Key Features**: JWT authentication, file uploads (multer), Razorpay payments, email (nodemailer), SMS (Karix), rate limiting, CORS

### Database
- **Type**: MongoDB Atlas (cloud-hosted)
- **Connection**: Via `MONGO_URI` environment secret
- **ORM**: Mongoose

## Environment Variables & Secrets

### Secrets (stored in Replit Secrets)
- `MONGO_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - JWT signing key
- `RAZORPAY_KEY_ID` - Razorpay payment key
- `RAZORPAY_KEY_SECRET` - Razorpay payment secret
- `EMAIL_PASSWORD` - Gmail SMTP app password
- `KARIX_API_KEY` - Karix SMS API key

### Environment Variables
- `EMAIL` - Gmail address for SMTP
- `KARIX_SENDER_ID`, `KARIX_DLT_ENTITY_ID`, `KARIX_DLT_TEMPLATE_ID` - SMS config
- `KARIX_SMS_URL` - SMS API endpoint
- `NODE_ENV` - development/production
- `SKIP_SEED` - Skip database seeding (set to 1)

## Workflows
- **Backend Server**: `cd backend && node index.js` (port 3001)
- **Frontend**: `cd frontend && react-scripts start` (port 5000, webview)

## Recent Changes
- 2026-02-16: Authentication Flow Migration (Password-Based)
  - Added password field to UserSchema with bcrypt hashing (pre-save hook) and comparePassword method
  - New backend endpoints: /api/auth/phone/register (signup with OTP), /api/auth/phone/verify-registration, /api/auth/phone/login-password
  - Login page redesigned: mobile + password fields, show/hide password toggle, links to Signup
  - New Signup page: Full Name, Mobile, Password, Confirm Password, City, Gender, DOB, OTP verification step
  - Signup route added at /signup in App.js
  - AdminLayout import fix in App.js (was undefined)
  - Ban enforcement in password-based login
  - Development mode OTP bypass for testing
- 2026-02-16: Navigation & Scroll Fixes
  - Student Dashboard: Auto-scroll to top when switching sidebar sections (Analysis & Reports, etc.)
  - Admin Sidebar: Scroll position and collapsed/expanded state persisted across page navigations via sessionStorage
  - Role Management: Added loading states and error feedback for API calls; improved empty state messaging
- 2026-02-16: Admin UI/UX Fixes
  - Collapsible sidebar sections (Courses, Tests, Content, Live Classes, Analytics, Users & Permissions)
  - LiveBatchManagement wrapped with AdminLayout
  - User Management search icon alignment fix
  - Student Reports scroll control
  - All Teachers and Permissions sidebar links
- 2026-02-16: Comprehensive Super Admin User Management
  - 3-tab UI: All Users, Pending Registrations, Payments with search/filters/pagination
  - Backend endpoints: user CRUD, ban/unban, pending registrations, payments (aggregation pipeline), bulk CSV upload, approve/reject payment
  - Enrollment modal with full course details (price, type, validity, dates, status)
  - User detail side panel with personal info, enrollments, payment history
  - Bulk CSV upload with row-by-row validation and error reporting
  - Ban enforcement in all OTP login flows (verifyPhoneOtp, verifyEmailOtp, loginWithPhone, dev mode)
  - Admin create endpoint now requires adminAuth
  - Payment search uses MongoDB aggregation for accurate pagination
  - AdminSidebar link with FaUserPlus icon at `/admin/user-management`
- 2026-02-19: Modal-Based OTP Authentication Flow
  - Created LoginModal component: phone entry → OTP send → 6-digit verification → dashboard redirect
  - Created SignupModal component: user details → OTP verification → course category selection → exam selection → dashboard
  - Backend sendPhoneOtp now returns 404 "User not registered" for unknown numbers (login-only flow)
  - Header shows profile avatar with dropdown (name, phone, dashboard link, logout) when logged in
  - Header shows "Log In" button that opens LoginModal when not logged in
  - Profile dropdown with initials circle (orange) when no profile image available
  - Logout clears localStorage token/user and resets header state
  - Mobile-responsive: profile info and logout button in hamburger menu
  - Course categories in signup: MBA, After 12, GMAT, Govt Exams with exam sub-selections
  - Existing /Login and /signup page routes maintained for backward compatibility
- 2026-02-19: Signup & Onboarding Flow Updates
  - Removed password, confirm password fields and OTP step from Signup page
  - Signup flow: Fill details → Click Sign Up → Account created directly → Navigate to /exam-category
  - OTP is only used during Login, not during Signup
  - Backend registerWithPhone creates user and returns token immediately (no OTP)
  - After signup, redirects to /exam-category → /exam-selection → dashboard
  - isOnboardingComplete set to false during registration, true after exam selection (save-exam)
  - Added image upload with visible preview on left panel of ExamCategory and ExamSelection pages
  - Used shared axiosConfig across all UserDetails components for consistent API calls
  - Added defensive null checks for localStorage user in image upload handlers
- 2026-02-19: CRM Lead Status Tracking & Action Buttons
  - Added Action column with status dropdown to All Inquiries, New Enquiries, and Counseling Enquiries tables
  - Lead statuses: New, Contacted, Hot Lead, Cold Lead, Response Pending, Follow Up, Not Interested, Demo Scheduled, Converted, Lost
  - Added `leadStatus` field to CRMLead model for persistent status tracking
  - Updated Enquiry model with expanded status enum and remarks field
  - Added PUT endpoint for enquiry status/remarks updates (enquiryRoutes.js)
  - Remarks/Notes modal for adding notes to each inquiry
  - Color-coded status badges in all inquiry tables
  - CSS styles for action dropdowns, remarks buttons, and status badges
- 2026-02-19: Invoice Download System
  - Replaced puppeteer-based PDF generation with HTML-based invoice rendering (browser print-to-PDF)
  - Invoice opens in new tab with professional toolbar (Download/Print PDF + Close buttons)
  - Uses existing taxInvoice.hbs Handlebars template with company details from BillingSettings
  - Auth via query token parameter for new-tab opens (tokenFromQuery middleware)
  - Full tax invoice with GST breakdown (CGST/SGST or IGST), student details, payment info
  - Amount calculations handle paise-to-rupees conversion, discount display
  - PurchaseHistory "Tax Invoice" button opens invoice in new tab
  - Installed handlebars dependency; removed puppeteer dependency
- 2026-02-19: Coupon Code System & Admin Management
  - Coupon model: code, discountPercent, applicableTo (all/specific), courses array, maxUses, maxUsesPerUser, expiryDate, isActive, usedBy tracking
  - Backend CRUD endpoints at /api/coupons (create, all, validate, toggle, update, delete)
  - Coupon validation in createOrder: discount applied, originalAmount saved, usedBy updated
  - Payment model extended with couponCode, discountPercent, originalAmount fields
  - CouponManagement admin page at /admin/coupons with full CRUD, course selection, status toggle
  - CoursePurchase page: coupon input field with apply/remove, discounted price display
  - Admin sidebar: Coupon Management link under Analytics section (FaTag icon)
- 2026-02-19: Email Sender Configuration
  - Changed email sender from tathagat949@gmail.com to payment@tathagat.co.in
  - Added SENDER_EMAIL environment variable for configurable sender address
- 2026-02-19: Admin User List Enhancements
  - AllStudents, AllUsers, AllTeachers: search, pagination (20/page), CSV export
- 2026-02-19: Course Test Options Display Fix
  - Fixed data format mismatch: backend was sending options as `[{ id, text }]` array but frontend expected `{ A, B, C, D }` object format
  - Changed `startTest` and `getAttemptData` in MockTestController to return options as `{ A, B, C, D }` object for course tests
  - Added `option.text` fallback in MockTestAttempt.jsx for backward compatibility with any cached `{ id, text }` format data
  - Images uploaded via JoditEditor in question options now display correctly in student test view
- 2026-02-19: Admin Student Performance Analytics Enhancement
  - Added getDashboardAnalytics endpoint: overview stats (students, tests, attempts), daily activity chart, score distribution, top 10 performers, recent attempts
  - Dashboard counts include both MockTest and CourseTest models for accurate totals
  - Fixed hardcoded VARC/DILR/QA sections in getStudentPerformance to be dynamic (supports any section names)
  - Added CourseTest model lookup for resolving test names in admin student performance view
  - Enhanced StudentPerformance.jsx with 3-tab layout: Dashboard (charts + tables), By Student (split panel with charts), By Test (leaderboard)
  - Chart.js integration: Line chart for daily activity, Bar charts for score distribution and section performance, score trend charts per student
  - Modern CSS with card-based design, medal badges for top 3, avatar sidebar, responsive grid layouts
- 2026-02-19: Policy Pages & Footer Links
  - Created Privacy Policy page at /privacy-policy with full content (8 sections: Registration, Cookies, User Communications, Log Info, Confidential, Feedback, Improvement, Queries)
  - Created Refund & Cancellation Policy page at /refund-policy with Important Notice callout (offline-only refund, no online refunds)
  - Created Terms & Conditions page at /terms-and-conditions with full content (Trademark, Copyright, Shipping, Order, Payment, Refund, Electronic Communication, Reviews, Terms of Use, Applicable Law)
  - Shared PolicyPages.css with professional styling: clean white cards, indigo accents, highlighted notices, responsive design
  - Added 3 links under "Explore" section in Footer component
  - Routes added in App.js for all 3 policy pages
- 2026-02-14: Initial Replit setup - migrated from GitHub import
  - Moved sensitive credentials from `.env` to Replit Secrets
  - Configured workflows for frontend and backend
  - Set up `.gitignore`
  - Backend binds to 0.0.0.0:3001, frontend to 0.0.0.0:5000
