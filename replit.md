# TathaGat - CAT Exam Preparation Platform

## Overview
TathaGat is a comprehensive full-stack education platform designed for students preparing for competitive exams like CAT, XAT, and SNAP. Its primary purpose is to provide a complete ecosystem for exam preparation, offering features such as course management, mock tests, live classes, study materials, discussion forums, and integrated payment solutions. The platform aims to enhance the learning experience through structured content, interactive tools, and robust administrative capabilities, positioning itself as a leading solution in the online test preparation market.

## User Preferences
I prefer clear and concise communication.
I value an iterative development approach with frequent, small updates.
I like to be asked before major architectural changes or significant feature removals.
I expect detailed explanations for complex implementations.
Do not make changes to folder `node_modules`.
Do not make changes to file `package-lock.json`.

## System Architecture

### Frontend
The frontend is built using Create React App (React 18) and located in the `/frontend` directory, running on port 5000. It utilizes `react-router-dom` for navigation, `axios` for API calls, `chart.js` and `recharts` for data visualization, `framer-motion` for animations, and `react-toastify` for notifications. Razorpay is integrated for payment processing. API and upload requests are proxied to the backend.

### Backend
The backend, located in `/backend`, is an Express.js application running on port 3001, using Mongoose for MongoDB ORM. Key functionalities include JWT authentication, `multer` for file uploads, Razorpay payment gateway integration, `nodemailer` for email services, Karix for SMS notifications, rate limiting, and CORS handling.

### Database
MongoDB Atlas serves as the cloud-hosted database, connected via a `MONGO_URI` secret. Mongoose is used as the ORM.

### UI/UX Decisions
The platform features a clean, professional design with consistent styling across student and admin interfaces. Policy pages utilize a modern aesthetic with white cards and indigo accents. Admin dashboards are designed for comprehensive management with features like searchable, paginated tables, CSV export, and clear action buttons for various entities (users, courses, inquiries). Role-Based Access Control (RBAC) is implemented for granular permissions. The student experience focuses on intuitive navigation, clear presentation of course content, and accessible mock test interfaces.

### Core Features
- **Course Management**: Creation, organization, and delivery of study materials, video lectures, and quizzes.
- **Mock Tests**: Comprehensive testing module with detailed analytics, score distribution, and performance tracking.
- **Live Classes**: Integration for conducting and managing live online sessions.
- **User Authentication & Authorization**: JWT-based authentication with password-based login and OTP verification flows. Robust RBAC system for admin and super-admin roles.
- **Payment & Enrollment**: Integrated Razorpay for online payments, with support for manual UPI payments and offline admission processing. Coupon code system for discounts.
- **CRM**: Lead status tracking, inquiry management, and follow-up functionalities for sales and support.
- **Reporting & Analytics**: Admin dashboards for student performance, daily activity, and comprehensive user management.
- **Content Delivery**: Optimized display of course content, including support for rich media in questions.
- **Policy Pages**: Dedicated pages for Privacy Policy, Refund & Cancellation Policy, and Terms & Conditions.
- **Offline Admission System**: Admin interface for walk-in student enrollment, course selection, payment recording, and invoice generation.
- **Invoice System**: HTML-based professional tax invoice generation with GST breakdown, downloadable as PDF.

## External Dependencies

- **MongoDB Atlas**: Cloud-hosted NoSQL database.
- **Razorpay**: Payment gateway for online transactions.
- **Nodemailer**: Email sending service (SMTP via Gmail).
- **Karix**: SMS notification service.
- **Chart.js**: JavaScript charting library for data visualization.
- **Recharts**: Redesigned charting library built with React and D3.
- **Handlebars**: Templating engine used for invoice generation.