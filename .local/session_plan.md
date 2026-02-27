# Objective
Build comprehensive payment management in the Offline Admission system. The "Recent Admissions" tab needs to show student-course level payment ledger with: total paid, pending amount, study material / tuition fees breakdown, payment history, ability to add installment payments, and invoice links for each payment.

# Tasks

### T001: Backend - Student Ledger API
- **Blocked By**: []
- **Details**:
  - Add GET `/api/offline-admissions/student-ledger` endpoint that returns student+course groupings with:
    - Student info (name, phone, email)
    - Course info (name, price, studyMaterialPrice, tuitionFeesPrice)
    - All payments for that student+course
    - Total paid, remaining balance, payment status
  - Add POST `/api/offline-admissions/add-payment` endpoint for adding installment payment to existing student+course (without re-enrollment logic, just new Payment record + invoice number)
  - Files: backend/routes/offlineAdmissionRoutes.js
  - Acceptance: Endpoints return correct grouped data and successfully create new payments

### T002: Frontend - Enhanced Recent Admissions Tab
- **Blocked By**: [T001]
- **Details**:
  - Redesign "Recent Admissions" tab to show student-course ledger view
  - Each row shows: Student Name, Phone, Course, Total Fee, Study Material/Tuition breakdown, Paid, Pending, Status
  - Expandable detail view showing all individual payments with dates, amounts, payment method, invoice link
  - "Add Payment" button per student-course that opens inline form/modal to record installment
  - Files: frontend/src/pages/mainAdmin/OfflineAdmission/OfflineAdmission.jsx, frontend/src/pages/mainAdmin/OfflineAdmission/OfflineAdmission.css
  - Acceptance: Admin can see full payment picture per student, add payments, view invoices

### T003: Test and Verify
- **Blocked By**: [T002]
- **Details**:
  - Restart workflows
  - Take screenshot to verify UI
  - Verify invoice generation works for new payments
  - Files: N/A
  - Acceptance: Everything works end-to-end
