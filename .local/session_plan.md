# Objective
Fix 7 issues across admin panel, student LMS, and frontend pages.

# Tasks

### T001: Admin Profile - Remove "Member since" + Remove "All Teachers" from sidebar
- **Blocked By**: []
- **Details**:
  - In AdminProfile.jsx, remove the "profile-stats" div (lines 205-213) that shows "Member Since"
  - In AdminSidebar.jsx, remove the "All Teachers" item from the SECTIONS array (line 84)
  - Files: frontend/src/pages/mainAdmin/AdminProfile/AdminProfile.jsx, frontend/src/pages/mainAdmin/AdminSidebar/AdminSidebar.jsx
  - Acceptance: No "Member since" on admin profile, no "All Teachers" in sidebar

### T002: User Management - Show Selected Exam + Add Invoice button
- **Blocked By**: []
- **Details**:
  - In the users table, change "Category" column to show "Selected Exam" (from user.selectedExam) instead of selectedCategory
  - In the user detail panel, ensure selectedExam is prominently shown
  - Add an "View Invoice" button in the user detail panel or payment history section
  - Files: frontend/src/pages/mainAdmin/UserManagement/UserManagement.jsx
  - Acceptance: Table shows exam, detail panel shows exam, invoice button works

### T003: Offline Admission - Admin configurable invoice number format
- **Blocked By**: []
- **Details**:
  - The invoice format is already configurable via BillingSettings (prefix + counter). Need to check if the offline admission page shows the invoice number format and if the admin can configure it from there
  - Ensure the invoice number format setting is visible/editable in the offline admission flow or billing settings
  - Files: backend/models/BillingSettings.js, frontend offline admission page

### T004: UPI Payment - Fix Access Denied after verify
- **Blocked By**: []
- **Details**:
  - After UPI payment is verified, the course shows in student LMS but gives "Access Denied"
  - Check the manual payment verification route to ensure it properly sets enrolledCourses status to "unlocked"
  - Check StudentCourseController.checkCourseAccess for any issues
  - Files: backend/routes/manualPaymentRoutes.js, backend/controllers/StudentCourseController.js

### T005: Downloads page - Fix redirect to userdetails
- **Blocked By**: []
- **Details**:
  - Clicking any button on the Downloads page redirects to userdetails route instead of showing content
  - Check the Downloads page component routing and authentication logic
  - Files: frontend Downloads page component, route config

### T006: Student profile image disappears on refresh
- **Blocked By**: []
- **Details**:
  - Profile image disappears when page is refreshed because localStorage isn't updated when image is uploaded
  - Fix: After uploading profile pic, update localStorage user object with new profilePic path
  - Also ensure verify-token API returns profilePic and localStorage gets updated
  - Files: frontend/src/components/StudentTopbar/StudentTopbar.jsx, frontend/src/context/UserContext.js, frontend/src/pages/Student/Profile/StudentProfile.jsx
