# School Management System Documentation

## Overview
A comprehensive school management system built with Node.js, Express, MongoDB, and EJS. The system supports multiple user roles (Admin, Teacher, Student, Parent) with features for attendance tracking, exam management, results processing, and communication.

## Project Structure

```
full-stack-school-main/
├── app.js                          # Main application entry point
├── controllers/                    # Business logic controllers
│   ├── rest.js                    # Authentication and core functions
│   ├── dashboardController.js     # Dashboard logic
│   ├── attendanceController.js    # Attendance management
│   └── profileController.js       # User profile management
├── middleware/                     # Express middleware
│   └── auth.js                    # Authentication and authorization
├── models/                        # MongoDB schemas
│   ├── admin.js                   # Admin user model
│   ├── student.js                 # Student model
│   ├── teacher.js                 # Teacher model
│   ├── parent.js                  # Parent model
│   ├── Exam.js                    # Exam model
│   ├── grade.js                   # Results/Grades model
│   ├── Attendance.js              # Attendance model
│   ├── Class.js                   # Class model
│   ├── Subject.js                 # Subject model
│   ├── Announcement.js            # Announcements model
│   ├── messages.js                # Messages model
│   └── log.js                     # System logs model
├── routes/                        # Express routes
│   └── routes.js                  # All application routes
├── services/                      # Business services
│   ├── jwtService.js              # JWT token management
│   ├── logService.js              # Logging service
│   └── teacherSubjectService.js   # Teacher-subject management
├── views/                         # EJS templates
│   ├── layouts/                   # Layout templates
│   ├── pages/                     # Page templates
│   └── partials/                  # Reusable components
├── public/                        # Static assets
│   ├── css/                       # Stylesheets
│   ├── js/                        # Client-side JavaScript
│   └── images/                    # Images and icons
├── scripts/                       # Utility and test scripts
└── documentation/                 # Project documentation
```

## Recent Updates

### Authentication System
- **JWT + Session Hybrid**: Implemented dual authentication system using both JWT tokens and Express sessions
- **Secure Cookies**: Enhanced cookie security with proper SameSite and Secure flags
- **Production Ready**: Configured for both development and production environments

### Results Management
- **CRUD Operations**: Complete Create, Read, Update, Delete functionality for exam results
- **Data Validation**: Comprehensive validation for marks, grades, and student-exam relationships
- **Cache Busting**: Implemented cache-busting mechanisms to ensure fresh data display
- **Role-Based Access**: Admin and Teacher access controls for results management

### Code Cleanup
- **Removed Console Logs**: Cleaned up all debugging console.log statements
- **Organized Documentation**: Moved all documentation to dedicated `/documentation` folder
- **Improved Error Handling**: Enhanced error handling throughout the application

## User Roles and Permissions

### Admin
- Full system access
- User management (students, teachers, parents)
- Class and subject management
- Exam creation and management
- Results management
- System logs access

### Teacher
- View assigned classes and subjects
- Take attendance
- Create and manage exams
- Add and edit results for assigned subjects
- View student information

### Student
- View personal information
- Check attendance records
- View exam schedules
- Access results and grades

### Parent
- View child's information
- Check child's attendance
- View child's results and grades
- Receive announcements

## Key Features

### Authentication & Security
- JWT token-based authentication
- Session management
- Role-based access control
- Secure cookie handling
- Password hashing with bcrypt

### Data Management
- MongoDB with Mongoose ODM
- Data validation and sanitization
- Relationship management between entities
- Audit logging for important actions

### User Interface
- Responsive Bootstrap-based design
- EJS templating engine
- Client-side JavaScript for enhanced UX
- Real-time form validation

## Environment Configuration

### Required Environment Variables
```env
NODE_ENV=development|production
MONGODB_URI=mongodb://localhost:27017/school_management
SESSION_SECRET=your-secret-key
JWT_SECRET=your-jwt-secret
DOMAIN=your-domain.com (for production)
PORT=4000
```

### Production Considerations
- Set `NODE_ENV=production`
- Use HTTPS in production
- Configure proper domain settings
- Set secure session and JWT secrets
- Enable MongoDB authentication

## API Endpoints

### Authentication
- `POST /login/admin` - Admin login
- `POST /login/teacher` - Teacher login
- `POST /login/student` - Student login
- `POST /login/parent` - Parent login
- `GET /logout` - Logout

### Results Management
- `GET /results` - View all results
- `GET /results/add` - Add result form
- `POST /results/add` - Create new result
- `GET /results/edit/:id` - Edit result form
- `POST /results/edit/:id` - Update result
- `POST /results/delete/:id` - Delete result
- `GET /results/refresh` - Force refresh results

### User Management
- `GET /students` - View students
- `GET /teachers` - View teachers
- `GET /classes` - View classes
- `GET /subjects` - View subjects

## Database Schema

### Key Models
- **User Models**: Admin, Teacher, Student, Parent
- **Academic Models**: Class, Subject, Exam, Grade (Results)
- **Operational Models**: Attendance, Announcement, Message, Log

### Relationships
- Students belong to Classes
- Teachers are assigned to Subjects and Classes
- Results link Students, Exams, and Subjects
- Parents are linked to Students

## Development Guidelines

### Code Style
- Use ES6+ features
- Follow Express.js conventions
- Implement proper error handling
- Use async/await for database operations
- Maintain consistent naming conventions

### Testing
- Use the provided test scripts in `/scripts`
- Test authentication flows
- Verify role-based access controls
- Test CRUD operations for all entities

### Deployment
- Ensure all environment variables are set
- Configure MongoDB connection
- Set up proper logging
- Test all user roles and permissions

## Troubleshooting

### Common Issues
1. **Authentication Problems**: Check JWT and session configuration
2. **Database Connection**: Verify MongoDB URI and credentials
3. **Cookie Issues**: Check SameSite and Secure settings for production
4. **Permission Errors**: Verify user roles and middleware configuration

### Debug Scripts
- `scripts/debug_results_update.js` - Test results functionality
- `scripts/test_results_edit.js` - Test results editing
- `scripts/debug_production_permissions.js` - Test production permissions

## Contributing
1. Follow the established code structure
2. Test all changes thoroughly
3. Update documentation as needed
4. Ensure proper error handling
5. Maintain security best practices

## License
This project is for educational purposes. Please ensure compliance with local data protection regulations when deploying in production environments. 