# School Management System – Codebase Overview

This document provides a high-level description of the structure and purpose of each main directory and file in the project. Use this as a reference to understand the organization and responsibilities of the codebase.

---

## 1. `app.js`
- **Purpose:** Main entry point of the application. Sets up the Express server, middleware, routes, and error handling.

## 2. `controllers/`
- **Purpose:** Contains logic for handling requests and responses for different features.
  - `attendanceController.js`: Manages attendance-related operations.
  - `chatController.js`: Handles chat and messaging features.
  - `dashboardController.js`: Controls dashboard data for different user roles.
  - `profileController.js`: Manages user profile operations.
  - `rest.js`: RESTful API logic for various resources.

## 3. `middleware/`
- **Purpose:** Express middleware functions.
  - `auth.js`: Handles authentication and authorization logic.

## 4. `models/`
- **Purpose:** Mongoose (MongoDB) models representing database collections.
  - `admin.js`, `parent.js`, `student.js`, `teacher.js`: User models for different roles.
  - `Announcement.js`: Model for announcements.
  - `Attendance.js`: Model for attendance records.
  - `Class.js`: Model for class information.
  - `Exam.js`: Model for exams.
  - `grade.js`: Model for grades.
  - `log.js`: Model for system logs.
  - `messages.js`: Model for chat/messages.
  - `Subject.js`: Model for subjects.

## 5. `routes/`
- **Purpose:** Defines Express routes/endpoints.
  - `routes.js`: Main routing file, connects URLs to controllers.

## 6. `services/`
- **Purpose:** Business logic and utility functions.
  - `errorService.js`: Handles error processing and reporting.
  - `jwtService.js`: Manages JWT token creation and verification.
  - `logService.js`: Handles logging.
  - `teacherSubjectService.js`: Manages teacher-subject relationships.

## 7. `public/`
- **Purpose:** Static assets served to the client (images, CSS, JS).
  - `css/`: Stylesheets.
  - `js/`: Client-side JavaScript.
  - `uploads/`: Uploaded files (e.g., avatars).
  - Various images/icons for UI.

## 8. `views/`
- **Purpose:** EJS templates for rendering HTML pages.
  - Main pages: `admin-login.ejs`, `dashboard.ejs`, `login.ejs`, etc.
  - `pages/`: Subfolders for feature-specific views (announcements, attendance, chat, classes, exams, logs, messages, profile, results, students, subjects, teachers).
  - `partials/`: Reusable UI components (header, navbar, sidebar).

## 9. `scripts/`
- **Purpose:** Utility and debug scripts for development and maintenance.
  - Seeding scripts: Add test data (e.g., `seed_admin.js`, `seed_students.js`).
  - Debug scripts: Test or debug specific features (e.g., `debug_login.js`, `debug_sessions.js`).
  - Fix scripts: Repair data issues (e.g., `fix_teacher_subjects.js`).
  - Test scripts: Automated tests for features (e.g., `test_auth_flow.js`).

## 10. `documentation/`
- **Purpose:** Markdown files with guides, troubleshooting, and manuals for setup, authentication, permissions, and more.

## 11. `package.json` / `package-lock.json`
- **Purpose:** Node.js dependency management and project metadata.

---

## Usage
- **For new developers:** Use this summary to understand where to look for specific logic or features.
- **For documentation:** Expand each section with more details as needed.
- **For maintenance:** Quickly locate files related to a feature or bug.

---

*For detailed descriptions of specific files, folders, or functions, refer to the respective source files or request further documentation.* 