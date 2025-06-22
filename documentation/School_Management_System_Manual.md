# 📖 School Management System Manual

## Table of Contents
1. [System Overview](#system-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Authentication & Access](#authentication--access)
4. [Dashboard Features](#dashboard-features)
    - [Admin Dashboard](#admin-dashboard)
    - [Teacher Dashboard](#teacher-dashboard)
    - [Student Dashboard](#student-dashboard)
    - [Parent Dashboard](#parent-dashboard)
5. [Core Modules](#core-modules)
    - [Students](#students)
    - [Teachers](#teachers)
    - [Classes](#classes)
    - [Subjects](#subjects)
    - [Exams](#exams)
    - [Results](#results)
    - [Attendance](#attendance)
    - [Announcements](#announcements)
    - [Messaging](#messaging)
6. [Data Seeding & Testing](#data-seeding--testing)
7. [Troubleshooting & FAQ](#troubleshooting--faq)
8. [Extending the System](#extending-the-system)

---

## 1. System Overview

This School Management System is a full-stack web application built with Node.js, Express, MongoDB, and EJS. It supports role-based dashboards and management for students, teachers, parents, and admins. The system covers authentication, class/subject/exam/result management, attendance, announcements, and messaging.

---

## 2. User Roles & Permissions

- **Admin:** Full access to all modules, can manage users, classes, subjects, exams, results, announcements.
- **Teacher:** Can view/manage their classes, students, mark attendance, send messages to parents, manage exams/results for their classes.
- **Student:** Can view their dashboard, upcoming exams, results, attendance, and announcements.
- **Parent:** Can view their child's dashboard, attendance, results, upcoming exams, and communicate with teachers.

---

## 3. Authentication & Access

- **Login:** Each user logs in with their credentials (ID/email and password).
- **Session-based authentication** is used for secure access.
- **Role-based access control** ensures users only see features relevant to their role.

---

## 4. Dashboard Features

### Admin Dashboard
- **Summary cards:** Total students, teachers, classes, subjects, upcoming exams.
- **Recent announcements:** Quick view and management.
- **Navigation:** Access to all modules via sidebar.

### Teacher Dashboard
- **Summary cards:** Number of classes, total students (in their classes), upcoming exams.
- **Recent announcements:** For teachers.
- **Messages:** Communicate with parents.
- **Attendance:** Mark and review attendance for their classes.

### Student Dashboard
- **Summary cards:** Number of subjects, upcoming exams, attendance rate.
- **Recent announcements:** For students.
- **Results:** View exam results.
- **Attendance:** View personal attendance records.

### Parent Dashboard
- **Summary cards:** Child info, upcoming exams, announcements.
- **Attendance:** View child's attendance.
- **Results:** View child's results.
- **Messages:** Communicate with teachers.

---

## 5. Core Modules

### Students
- **Admin:** Add, edit, delete, and view students.
- **Teacher:** View students in their classes.
- **Student/Parent:** View own/child's info.

### Teachers
- **Admin:** Add, edit, delete, and view teachers.
- **Teacher:** View own profile.

### Classes
- **Admin:** Manage all classes.
- **Teacher:** View assigned classes.

### Subjects
- **Admin/Teacher:** Manage/view subjects.

### Exams
- **Admin/Teacher:** Add, edit, delete, and view exams.
- **Student/Parent:** View upcoming exams.

### Results
- **Admin/Teacher:** Add, edit, delete, and view results.
- **Student/Parent:** View own/child's results.

### Attendance
- **Admin/Teacher:** Mark and review attendance for classes.
- **Student/Parent:** View own/child's attendance and attendance rate.

### Announcements
- **Admin:** Create, edit, delete, and view announcements.
- **All roles:** View relevant announcements.

### Messaging
- **Teacher/Parent:** Send and reply to messages.
- **Inbox:** View all sent/received messages.

---

## 6. Data Seeding & Testing

- **Seeder scripts** are provided for students, teachers, classes, subjects, and exams.
- To seed data, run the appropriate script (e.g., `node seed_students.js`, `node seed_exams.js`).
- Exams and students are seeded for all forms/sections for comprehensive testing.

---

## 7. Troubleshooting & FAQ

- **Login issues:** Ensure correct credentials and role.
- **Dashboard shows 0 students/exams:** Check that students are assigned to the correct grade/section and exams are linked to the teacher and have future dates.
- **Attendance not saving:** Ensure the attendance POST route is implemented and the Attendance model exists.
- **Dual navbar:** Ensure only one layout/header is included per page.
- **[Deleted Parent]/[Deleted Teacher]:** Indicates a message references a user that no longer exists.

---

## 8. Extending the System

- **Add new roles:** Update models, middleware, and views.
- **Add new modules:** Create new models, routes, controllers, and views as needed.
- **UI/UX improvements:** Update EJS views and CSS in `public/css/`.
- **Notifications:** Add real-time or email notifications for messages, announcements, or results.

---

## Quick Reference: Common Tasks

- **Mark Attendance:** Teacher/Admin → Attendance → Select class → Mark status → Save.
- **View Attendance:** Student/Parent → Attendance → See table of records and attendance rate.
- **Send Message:** Teacher/Parent → Messages → New/Reply.
- **Add Exam/Result:** Admin/Teacher → Exams/Results → Add/Edit/Delete.
- **View Results:** Student/Parent → Results.

---

## Support

For further help, check the code comments, review the controllers and views, or contact the system maintainer. 