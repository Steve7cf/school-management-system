# Scripts Directory

This directory contains various utility scripts for the School Management System.

## Seeding Scripts

### `seed_admin.js`
Creates a new admin user in the database.
- **Usage**: `node scripts/seed_admin.js`
- **Default Credentials**: 
  - Email: `admin@school.com`
  - Password: `admin123`
- **Features**: 
  - Uses database connection from `.env` file
  - Password hashing with bcrypt
  - Duplicate check to prevent creating multiple admins
  - MongoDB connection handling with proper error reporting
  - Enhanced console output with emojis and status information

### `seed_class.js`
Seeds class data into the database.
- **Usage**: `node scripts/seed_class.js`

### `seed_exams.js`
Seeds exam data into the database.
- **Usage**: `node scripts/seed_exams.js`

### `seed_students.js`
Seeds student data into the database.
- **Usage**: `node scripts/seed_students.js`

### `seed_subject.js`
Seeds subject data into the database.
- **Usage**: `node scripts/seed_subject.js`

## Fix Scripts

### `check_and_fix_teachers.js`
Checks and fixes teacher data inconsistencies.
- **Usage**: `node scripts/check_and_fix_teachers.js`

### `fix_teacher_subjects.js`
Fixes teacher-subject relationships.
- **Usage**: `node scripts/fix_teacher_subjects.js`

### `fix_teacher_subjects_advanced.js`
Advanced teacher-subject relationship fixes.
- **Usage**: `node scripts/fix_teacher_subjects_advanced.js`

### `update_student_subjects.js`
Updates student subject assignments.
- **Usage**: `node scripts/update_student_subjects.js`

## Testing Scripts

### `test_teacher_data.js`
Tests teacher data integrity.
- **Usage**: `node scripts/test_teacher_data.js`

### `test_teacher_results.js`
Tests teacher result data.
- **Usage**: `node scripts/test_teacher_results.js`

### `check_exams.js`
Checks exam data integrity.
- **Usage**: `node scripts/check_exams.js`

### `debug_parent_login.js`
Debug script for parent login issues.
- **Usage**: `node scripts/debug_parent_login.js`

## Cleanup Scripts

### `cleanup_dummy_teachers.js`
Removes dummy teacher data from the database.
- **Usage**: `node scripts/cleanup_dummy_teachers.js`

## Update Scripts

### `update_results_route.js`
Updates result routes and data.
- **Usage**: `node scripts/update_results_route.js`

## Prerequisites

Before running any script, ensure:
1. MongoDB is running
2. `.env` file is configured with proper database connection
3. All dependencies are installed (`npm install`)

## Database Connection

All scripts use the database connection string from the `.env` file:
- **Environment Variable**: `MONGODB_URI`
- **Default Fallback**: `mongodb://localhost:27017/school_management`

The `.env` file should contain:
```env
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
PORT=3000
```

## Running Scripts

To run any script, navigate to the project root and execute:

```bash
node scripts/[script-name].js
```

## Notes

- All scripts include proper error handling and MongoDB connection management
- Seeding scripts check for existing data to avoid duplicates
- Fix scripts include logging and validation
- Test scripts provide detailed output for debugging
- The admin seeding script provides enhanced console output with emojis and detailed status information 