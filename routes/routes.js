const express = require("express")
const router = express.Router()
const rest = require("../controllers/rest")
const dashboardController = require("../controllers/dashboardController")
const {
    isAuthenticated,
    isAdmin,
    isTeacher,
    isStudent,
    isParent,
    isAdminOrTeacher,
    isTeacherOrAdmin
} = require("../middleware/auth");
const Announcement = require('../models/Announcement')
const Exam = require('../models/Exam')
const Subject = require('../models/Subject')
const Teacher = require('../models/teacher')
const Grade = require('../models/grade')
const Admin = require('../models/admin')
const Student = require('../models/student')
const Class = require('../models/Class')
const Message = require('../models/messages')
const Parent = require('../models/parent')
const Attendance = require('../models/Attendance')
const bcrypt = require('bcrypt')
const { logEvent } = require('../services/logService')
const mongoose = require('mongoose')
const crypto = require('crypto')
const attendanceController = require('../controllers/attendanceController');
const profileController = require('../controllers/profileController');
const multer = require('multer');

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/avatars/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, req.session.user.id + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB limit
});

// Public routes
router.get("/", (req, res) => {res.render("welcome")})
router.get("/login", (req, res) => {res.render("login", {info:req.flash('info')})})
router.get("/signup", async (req, res) => {
  try {
    const subjects = await Subject.find({ isActive: true });
    res.render("signup", { info: req.flash('info'), subjects });
  } catch (err) {
    res.render("signup", { info: req.flash('info'), subjects: [] });
  }
})

// Registration success page
router.get("/registration-success", (req, res) => {
  const { studentId, teacherId } = req.query;
  res.render("registration-success", { 
    studentId: studentId ? decodeURIComponent(studentId) : undefined,
    teacherId: teacherId ? decodeURIComponent(teacherId) : undefined,
    layout: false 
  });
})

router.get("/admin/login", (req, res) => {res.render("admin-login", {info:req.flash('info')})})
router.get('/forgot-password', (req, res) => res.render('forgot-password', {info:req.flash('info')}));

// Authentication routes
router.post("/login/student", rest.authStudent)
router.post("/login/parent", rest.authParent)
router.post("/login/teacher", rest.authTeacher)
router.post("/login/admin", rest.authAdmin)
router.post("/register/student", rest.registerStudent)
router.post("/register/parent", rest.registerParent)
router.post("/register/teacher", rest.registerTeacher)

// Dashboard routes
router.get('/', isAuthenticated, (req, res) => res.redirect('/dashboard'))
router.get('/dashboard', isAuthenticated, dashboardController.index)
router.get('/dashboard/admin', isAuthenticated, isAdmin, dashboardController.adminDashboard)
router.get('/dashboard/student', isAuthenticated, isStudent, dashboardController.studentDashboard)
router.get('/dashboard/teacher', isAuthenticated, isTeacher, dashboardController.teacherDashboard)
router.get('/dashboard/parent', isAuthenticated, isParent, dashboardController.parentDashboard)

// Logout route
router.get("/logout", rest.logout)

// --- STUDENT ROUTES ---
// NOTE: Specific routes must come before dynamic routes (e.g., /students/create before /students/:id)

// Show form to create a new student
router.get('/students/create', isAdminOrTeacher, async (req, res) => {
  try {
    const classes = await Class.find();
    res.render('pages/students/create', { classes, info: req.flash('info'), errors: [] });
  } catch (error) {
    req.flash('info', ['Error loading form', 'danger']);
    res.redirect('/students');
  }
});

// Handle creation of a new student
router.post('/students/create', isAdmin, async (req, res) => {
    try {
        const { firstName, lastName, dateOfBirth, gender, class: classInfo, parentEmail, address, parentFirstName, parentLastName, parentPhone } = req.body;

        if (!classInfo || !classInfo.includes('-')) {
            req.flash('info', ['Invalid class format selected.', 'danger']);
            return res.redirect('/students/create');
        }

        const [gradeLevel, section] = classInfo.split('-');

        // Check for existing parent or create a new one
        let parent = await Parent.findOne({ email: parentEmail });
        if (!parent && parentEmail) {
            // Only create parent account if parent details are provided
            if (parentFirstName && parentLastName && parentPhone) {
                const parentPassword = crypto.randomBytes(8).toString('hex');
                const salt = await bcrypt.genSalt(10);
                const hashedParentPassword = await bcrypt.hash(parentPassword, salt);

                // Create temporary studentId for parent (will be updated after student creation)
                const tempStudentId = `TEMP_${Date.now()}`;

                parent = new Parent({
                    firstName: parentFirstName,
                    lastName: parentLastName,
                    email: parentEmail,
                    phone: parentPhone,
                    password: hashedParentPassword,
                    studentId: tempStudentId
                });
                await parent.save();
                await logEvent('parent_created_auto', req.session.user.id, { parentEmail });
            }
            // If parent details are not provided, that's fine - parent can register later using the email
        }

        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        const studentId = `F${gradeLevel}/${year}/${random}`;

        const tempPassword = crypto.randomBytes(8).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        const newStudent = new Student({
            firstName,
            lastName,
            studentId,
            dateOfBirth,
            gender,
            gradeLevel,
            section,
            parentEmail,
            address,
            password: hashedPassword,
        });

        await newStudent.save();

        // Automatically assign all subjects for the student's grade level
        const subjects = await Subject.find({ gradeLevel: parseInt(gradeLevel) });
        if (subjects.length > 0) {
            newStudent.subjects = subjects.map(subject => subject._id);
            await newStudent.save();
        }

        // Update parent's studentId to point to the actual student
        if (parent) {
            parent.studentId = newStudent.studentId;
            await parent.save();
        }
        
        await logEvent('student_created', req.session.user.id, { studentId: newStudent.studentId, studentName: `${firstName} ${lastName}` });

        req.flash('info', ['Student created successfully!', 'success']);
        res.redirect(`/students?newStudentId=${studentId}&newStudentPassword=${tempPassword}`);

    } catch (error) {
        req.flash('info', ['Failed to create student. Check all fields.', 'danger']);
        res.redirect('/students');
    }
});

// Show form to edit a student
router.get('/students/edit/:id', isAdmin, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        const classes = await Class.find();
        if (!student) {
            req.flash('info', ['Student not found.', 'danger']);
            return res.redirect('/students');
        }
        if (student.dateOfBirth && !(student.dateOfBirth instanceof Date)) {
            student.dateOfBirth = new Date(student.dateOfBirth);
        }
        const subjects = await Subject.find();
        let parent = null;
        if (student.parentEmail) {
            parent = await Parent.findOne({ email: student.parentEmail });
        }
        res.render('pages/students/edit', { title: 'Edit Student', student, classes, parent, subjects });
    } catch (error) {
        req.flash('info', ['Error loading edit form.', 'danger']);
        res.redirect('/students');
    }
});

// Handle edit student POST
router.post('/students/edit/:id', isAdmin, async (req, res) => {
    try {
        const { firstName, lastName, dateOfBirth, section, studentId, address, subjects } = req.body;
        
        const updateData = {
            firstName,
            lastName,
            dateOfBirth,
            section,
            studentId,
            address
        };

        // Handle subjects if provided
        if (subjects) {
            const subjectIds = Array.isArray(subjects) ? subjects : [subjects];
            updateData.subjects = subjectIds.filter(s => s); // Remove empty values
        }

        await Student.findByIdAndUpdate(req.params.id, updateData);
        
        await logEvent('student_updated', req.session.user.id, { studentId: req.params.id });
        
        req.flash('info', ['Student updated successfully', 'success']);
        res.redirect('/students');
    } catch (error) {
        req.flash('info', ['Failed to update student.', 'danger']);
        res.redirect(`/students/edit/${req.params.id}`);
    }
});

// View a specific student's details
router.get('/students/:id', isAdminOrTeacher, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).populate('subjects');
        if (!student) {
            req.flash('info', ['Student not found.', 'danger']);
            return res.redirect('/students');
        }
        let parent = null;
        if (student.parentEmail) {
            parent = await Parent.findOne({ email: student.parentEmail });
        }
        res.render('pages/students/show', { title: 'Student Details', student, parent });
    } catch (error) {
        req.flash('info', ['Error loading student details.', 'danger']);
        res.redirect('/students');
    }
});

// List all students
router.get('/students', isAdminOrTeacher, async (req, res) => {
    try {
        const { search, gradeLevel, section } = req.query;
        let query = {};
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { studentId: { $regex: search, $options: 'i' } }
            ];
        }
        if (gradeLevel) query.gradeLevel = gradeLevel;
        if (section) query.section = section;
        const students = await Student.find(query);
        // Fetch parent info for each student
        const parentsMap = {};
        for (const student of students) {
            if (student.parentEmail) {
                parentsMap[student._id] = await Parent.findOne({ email: student.parentEmail });
            } else {
                parentsMap[student._id] = null;
            }
        }
        const classes = await Class.find();
        res.render('pages/students/index', {
            title: 'Students',
            students,
            parentsMap,
            newStudentId: req.query.newStudentId,
            newStudentPassword: req.query.newStudentPassword,
            classes,
            search,
            gradeLevel,
            section,
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Error loading students', 'danger']);
        res.redirect('/dashboard');
    }
});

// Handle deletion of a student
router.post('/students/delete/:id', isAdmin, async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        if (student) {
            // After deleting a student, check if their parent has other children
            const parent = await Parent.findOne({ email: student.parentEmail });
            if (parent) {
                const remainingChildren = await Student.countDocuments({ parentEmail: parent.email });
                if (remainingChildren === 0) {
                    await Parent.findByIdAndDelete(parent._id);
                    await logEvent('parent_auto_deleted', req.session.user.id, { parentEmail: parent.email });
                }
            }
            await logEvent('student_deleted', req.session.user.id, { studentId: student.studentId });
            req.flash('info', ['Student and associated data deleted successfully.', 'success']);
        } else {
            req.flash('info', ['Student not found.', 'danger']);
        }
        res.redirect('/students');
    } catch (error) {
        req.flash('info', ['Failed to delete student.', 'danger']);
        res.redirect('/students');
    }
});

// Teacher routes

router.get('/teachers', isAdmin, async (req, res) => {
    try {
        const { search, subject, gradeLevel, section, sortBy, sortOrder } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { teacherId: { $regex: search, $options: 'i' } }
            ];
        }

        if (subject) {
            query.subjects = subject;
        }

        if (gradeLevel && section) {
            query.assignedClasses = { $elemMatch: { gradeLevel, section } };
        } else if (gradeLevel) {
            query['assignedClasses.gradeLevel'] = gradeLevel;
        }

        const sortOptions = {};
        if (sortBy) {
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        } else {
            sortOptions['lastName'] = 1; // Default sort
        }

        const teachers = await Teacher.find(query).populate('subjects').sort(sortOptions);
        const subjects = await Subject.find();
        const classes = await Class.find();
        
        res.render('pages/teachers/index', {
            title: 'Teachers',
            teachers,
            subjects,
            classes,
            selectedSubject: subject,
            selectedGradeLevel: gradeLevel,
            selectedSection: section,
            user: req.session.user,
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Error loading teachers', 'danger']);
        // Also render the index page on error, but with empty data
        res.render('pages/teachers/index', {
            title: 'Teachers',
            teachers: [],
            subjects: [],
            classes: [],
            user: req.session.user,
            info: req.flash('info'),
            layout: false
        });
    }
});

// View teacher details
router.get('/teachers/:id', isAdmin, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).populate('subjects');
    if (!teacher) {
      req.flash('info', ['Teacher not found', 'danger']);
      return res.redirect('/teachers');
    }
    res.render('pages/teachers/show', { title: 'Teacher Details', teacher });
  } catch (error) {
    req.flash('info', ['Error loading teacher', 'danger']);
    res.redirect('/teachers');
  }
});

// Edit teacher form
router.get('/teachers/edit/:id', isAdmin, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).populate('subjects');
    const subjects = await Subject.find({ isActive: true });
    if (!teacher) {
      req.flash('info', ['Teacher not found', 'danger']);
      return res.redirect('/teachers');
    }
    res.render('pages/teachers/edit', { title: 'Edit Teacher', teacher, subjects });
  } catch (error) {
    req.flash('info', ['Error loading teacher', 'danger']);
    res.redirect('/teachers');
  }
});

// Handle edit teacher POST
router.post('/teachers/edit/:id', isAdmin, async (req, res) => {
  try {
    let { firstName, lastName, email, subjects, assignedClasses } = req.body;
    if (!Array.isArray(subjects)) subjects = [subjects];
    if (subjects.length > 3) {
      req.flash('info', ['A teacher cannot be assigned more than 3 subjects.', 'danger']);
      return res.redirect(`/teachers/edit/${req.params.id}`);
    }
    
    // Parse assignedClasses from form values like '1-A'
    let assignedClassesArr = [];
    if (assignedClasses) {
      if (!Array.isArray(assignedClasses)) assignedClasses = [assignedClasses];
      assignedClassesArr = assignedClasses.map(val => {
        const [gradeLevel, section] = val.split('-');
        return { gradeLevel, section };
      });
    }

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      req.flash('info', ['Teacher not found.', 'danger']);
      return res.redirect('/teachers');
    }

    // Update basic teacher information
    teacher.firstName = firstName;
    teacher.lastName = lastName;
    teacher.email = email;
    teacher.assignedClasses = assignedClassesArr;

    // Handle subject assignments
    const currentSubjectIds = teacher.subjects.map(s => s.toString());
    const newSubjectIds = subjects.filter(s => s); // Remove empty values

    // Remove subjects that are no longer assigned
    for (const subjectId of currentSubjectIds) {
      if (!newSubjectIds.includes(subjectId)) {
        try {
          await teacher.removeSubject(subjectId);
        } catch (error) {
          console.error('Error removing subject:', error);
        }
      }
    }

    // Add new subjects
    for (const subjectId of newSubjectIds) {
      if (!currentSubjectIds.includes(subjectId)) {
        try {
          await teacher.addSubject(subjectId);
        } catch (error) {
          req.flash('info', [error.message, 'danger']);
          return res.redirect(`/teachers/edit/${req.params.id}`);
        }
      }
    }

    await logEvent('teacher_updated', req.session.user.id, { teacherId: req.params.id, changes: { firstName, lastName, email, subjects, assignedClasses: assignedClassesArr } });
    req.flash('info', ['Teacher updated successfully', 'success']);
    res.redirect('/teachers');
  } catch (error) {
    req.flash('info', ['Error updating teacher', 'danger']);
    res.redirect(`/teachers/edit/${req.params.id}`);
  }
});

// Delete teacher
router.post('/teachers/delete/:id', isAdmin, async (req, res) => {
  try {
    await Teacher.findByIdAndDelete(req.params.id);
    await logEvent('teacher_deleted', req.session.user.id, { teacherId: req.params.id });
    req.flash('info', ['Teacher deleted successfully', 'success']);
    res.redirect('/teachers');
  } catch (error) {
    req.flash('info', ['Error deleting teacher', 'danger']);
    res.redirect('/teachers');
  }
});

// Class routes
router.get('/classes', isAdmin, async (req, res) => {
    try {
        const classes = await Class.find().populate('teacherId');
        const students = await Student.find();
        const teachers = await Teacher.find();

        res.render('pages/classes/index', { title: 'Classes', classes, teachers, students, user: req.session.user, info: req.flash('info'), errors: [] });
    } catch (error) {
        req.flash('info', ['Failed to load classes.', 'danger']);
        res.redirect('/dashboard');
    }
})

// View single class
router.get('/classes/:id', isAdmin, async (req, res) => {
    try {
        const classObj = await Class.findById(req.params.id).populate('teacherId');
        if (!classObj) {
            req.flash('info', ['Class not found', 'danger']);
            return res.redirect('/classes');
        }
        // Find all students with matching gradeLevel and section
        const students = await Student.find({ gradeLevel: String(classObj.gradeLevel), section: classObj.section });
        res.render('pages/classes/show', { 
            title: classObj.name, 
            classObj, 
            students, 
            user: req.session.user,
            info: req.flash('info'),
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Error loading class', 'danger']);
        res.redirect('/classes');
    }
});

// Edit class form
router.get('/classes/edit/:id', isAdmin, async (req, res) => {
    try {
        const classObj = await Class.findById(req.params.id).populate('teacherId');
        const teachers = await Teacher.find();
        if (!classObj) {
            req.flash('info', ['Class not found', 'danger']);
            return res.redirect('/classes');
        }
        res.render('pages/classes/edit', { 
            title: 'Edit Class', 
            classObj, 
            teachers, 
            user: req.session.user,
            info: req.flash('info'),
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Error loading class for edit', 'danger']);
        res.redirect('/classes');
    }
});

// Update class
router.post('/classes/edit/:id', isAdmin, async (req, res) => {
    try {
        let { gradeLevel, section, teacherId } = req.body;
        
        // Handle empty teacherId - convert empty string to null
        if (!teacherId || teacherId.trim() === '') {
            teacherId = null;
        } else if (typeof teacherId === 'string' && teacherId.match(/^[a-fA-F0-9]{24}$/)) {
            teacherId = new mongoose.Types.ObjectId(teacherId);
        }
        
        await Class.findByIdAndUpdate(req.params.id, { gradeLevel, section, teacherId });
        req.flash('info', ['Class updated successfully', 'success']);
        res.redirect('/classes');
    } catch (error) {
        req.flash('info', ['Error updating class', 'danger']);
        res.redirect('/classes');
    }
});

// Delete class
router.post('/classes/delete/:id', isAdmin, async (req, res) => {
    try {
        await Class.findByIdAndDelete(req.params.id);
        req.flash('info', ['Class deleted successfully', 'success']);
        res.redirect('/classes');
    } catch (error) {
        req.flash('info', ['Error deleting class', 'danger']);
        res.redirect('/classes');
    }
});

// Add new class
router.post('/classes', isAdmin, async (req, res) => {
    try {
        let { gradeLevel, section, teacherId } = req.body;
        
        // Handle empty teacherId - convert empty string to null
        if (!teacherId || teacherId.trim() === '') {
            teacherId = null;
        } else if (typeof teacherId === 'string' && teacherId.match(/^[a-fA-F0-9]{24}$/)) {
            teacherId = new mongoose.Types.ObjectId(teacherId);
        }
        
        await Class.create({ gradeLevel, section, teacherId, academicYear: new Date().getFullYear().toString() });
        req.flash('info', ['Class added successfully', 'success']);
        res.redirect('/classes');
    } catch (error) {
        req.flash('info', ['Error adding class', 'danger']);
        res.redirect('/classes');
    }
});

// Subject routes
router.get('/subjects', isAdminOrTeacher, async (req, res) => {
    try {
        const subjects = await Subject.find().populate('teacherId');
        const teachers = await Teacher.find();
        const classes = await Class.find();
        res.render('pages/subjects/index', { title: 'Subjects', subjects, teachers, classes, user: req.session.user });
    } catch (error) {
        res.status(500).send("Error fetching subjects");
    }
});

// Show single subject
router.get('/subjects/:id', isAdminOrTeacher, async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id).populate('teacherId');
        if (!subject) {
            req.flash('info', ['Subject not found', 'danger']);
            return res.redirect('/subjects');
        }
        res.render('pages/subjects/show', {
            title: subject.name,
            subject,
            user: req.session.user,
            info: req.flash('info'),
            errors: [],
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Error loading subject', 'danger']);
        res.redirect('/subjects');
    }
});

// Create a new subject
router.post('/subjects', isAdmin, async (req, res) => {
    try {
        const { name, code, gradeLevel, credits, class: classId, teacher: teacherId } = req.body;
        
        // Basic validation
        if (!name || !code || !gradeLevel || !credits) {
            req.flash('info', ['Subject name, code, grade, and credits are required.', 'danger']);
            return res.redirect('/subjects');
        }

        const newSubject = new Subject({
            name,
            code,
            gradeLevel,
            credits,
            teacherId: null, // Start with no teacher
        });

        await newSubject.save();

        // If a teacher was assigned, use the assignTeacher method
        if (teacherId) {
            try {
                await newSubject.assignTeacher(teacherId);
            } catch (error) {
                // If teacher assignment fails, delete the subject and show error
                await Subject.findByIdAndDelete(newSubject._id);
                req.flash('info', [error.message, 'danger']);
                return res.redirect('/subjects');
            }
        }
        
        await logEvent('subject_created', req.session.user.id, { subjectId: newSubject._id, name, code, gradeLevel, credits, teacherId });
        req.flash('info', ['Subject created successfully!', 'success']);
        res.redirect('/subjects');
    } catch (error) {
        if (error.code === 11000) { // Handle duplicate key error
            req.flash('info', ['A subject with that name or code already exists.', 'danger']);
        } else {
            req.flash('info', ['Error creating subject.', 'danger']);
        }
        res.redirect('/subjects');
    }
});

// Edit Subject Form
router.get('/subjects/edit/:id', isAdmin, async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) {
            req.flash('info', ['Subject not found.', 'danger']);
            return res.redirect('/subjects');
        }
        const teachers = await Teacher.find();
        res.render('pages/subjects/edit', {
            title: 'Edit Subject',
            subject,
            teachers,
            user: req.session.user,
            info: req.flash('info'),
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Failed to load subject for editing.', 'danger']);
        res.redirect('/subjects');
    }
});

// Handle Edit Subject
router.post('/subjects/edit/:id', isAdmin, async (req, res) => {
    try {
        const { name, code, gradeLevel, credits, teacherId, description } = req.body;
        const subjectId = req.params.id;

        const subject = await Subject.findById(subjectId);
        if (!subject) {
            req.flash('info', ['Subject not found.', 'danger']);
            return res.redirect('/subjects');
        }

        // Update basic subject information
        subject.name = name;
        subject.code = code;
        subject.gradeLevel = gradeLevel;
        subject.credits = credits;
        subject.description = description || '';
        await subject.save();

        // Handle teacher assignment using the assignTeacher method
        try {
            await subject.assignTeacher(teacherId || null);
        } catch (error) {
            req.flash('info', [error.message, 'danger']);
            return res.redirect(`/subjects/edit/${req.params.id}`);
        }

        await logEvent('subject_updated', req.session.user.id, { subjectId: subjectId, changes: req.body });
        req.flash('info', ['Subject updated successfully!', 'success']);
        res.redirect('/subjects');
    } catch (error) {
        req.flash('info', ['Failed to update subject.', 'danger']);
        res.redirect(`/subjects/edit/${req.params.id}`);
    }
});

// Delete a subject
router.post('/subjects/delete/:id', isAdmin, async (req, res) => {
    try {
        const subjectId = req.params.id;
        const subject = await Subject.findById(subjectId);

        if (!subject) {
            req.flash('info', ['Subject not found.', 'danger']);
            return res.redirect('/subjects');
        }

        // Remove subject from teacher's subjects array
        if (subject.teacherId) {
            await Teacher.findByIdAndUpdate(subject.teacherId, { 
                $pull: { subjects: subjectId } 
            });
        }

        // Delete the subject
        await Subject.findByIdAndDelete(subjectId);

        await logEvent('subject_deleted', req.session.user.id, { subjectId: subjectId, name: subject.name, code: subject.code });
        req.flash('info', ['Subject deleted successfully!', 'success']);
        res.redirect('/subjects');
    } catch (error) {
        req.flash('info', ['Error deleting subject.', 'danger']);
        res.redirect('/subjects');
    }
});

// Exam routes
router.get('/exams', isAuthenticated, async (req, res) => {
    try {
        let query = {};
        if (req.session.user.role === 'teacher') {
            const teacher = await Teacher.findById(req.session.user.id).populate('subjects');
            const subjectIds = teacher.subjects.map(s => s._id);
            const assignedClasses = teacher.assignedClasses || [];
            const classIds = assignedClasses.map(c => c._id);
            
            query = {
                $or: [
                    { teacherId: req.session.user.id },
                    { targetClasses: { $in: classIds } }
                ]
            };
        }

        const exams = await Exam.find(query)
            .populate('subject')
            .populate('targetClasses')
            .sort({ date: -1 });

        res.render('pages/exams/index', {
            title: 'Exams',
            exams,
            user: req.session.user,
            info: req.flash('info'),
            errors: [],
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Error loading exams', 'danger']);
        res.redirect('/dashboard');
    }
})

router.get('/exams/add', isAuthenticated, async (req, res) => {
    try {
        const classes = await Class.find().sort({ gradeLevel: 1, section: 1 });
        res.render('pages/exams/add', {
            title: 'Add Exam',
            user: req.session.user,
            info: req.flash('info'),
            errors: [],
            classes,
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Error loading form', 'danger']);
        res.redirect('/exams');
    }
});

router.post('/exams/add', isAuthenticated, async (req, res) => {
    try {
        const { title, type, date, targetClasses, isPublic } = req.body;
        
        const exam = new Exam({
            title,
            type,
            date,
            targetClasses: targetClasses || [],
            teacherId: req.session.user.role === 'teacher' ? req.session.user.id : null
        });
        await exam.save();

        const announcement = new Announcement({
            title: `New Exam Scheduled: ${title}`,
            content: `A new exam of type '${type}' has been scheduled for ${new Date(date).toLocaleDateString()}. Further details will be provided by the subject teachers.`,
            author: req.session.user.id,
            authorModel: req.session.user.role === 'teacher' ? 'Teacher' : 'Admin',
            targetAudience: ['student', 'parent', 'teacher'],
            targetClasses: isPublic ? [] : targetClasses || [],
            priority: 'Medium'
        });
        await announcement.save();

        await logEvent('exam_created', req.session.user.id, { examId: exam._id, title, type, date, targetClasses, isPublic });
        req.flash('info', ['Exam and announcement created successfully', 'success']);
        res.redirect('/exams');
    } catch (error) {
        req.flash('info', ['Error adding exam', 'danger']);
        res.redirect('/exams/add');
    }
});

// Edit Exam - GET
router.get('/exams/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id).populate('subject');
        const teachers = await Teacher.find();
        const classes = await Class.find().sort({ gradeLevel: 1, section: 1 });
        // Fetch subjects for the current teacher (if any)
        let subjects = [];
        if (exam && exam.teacherId) {
            subjects = await Subject.find({ teacherId: exam.teacherId });
        }
        res.render('pages/exams/edit', {
            title: 'Edit Exam',
            user: req.session.user,
            exam,
            teachers,
            subjects,
            classes,
            info: req.flash('info'),
            errors: [],
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Error loading exam for edit', 'danger']);
        res.redirect('/exams');
    }
});

// Edit Exam - POST
router.post('/exams/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const { title, date, type, targetClasses, subject, duration, startTime } = req.body;
        
        // Validate required fields
        if (!title || !date || !type) {
            req.flash('info', ['Title, date, and type are required', 'danger']);
            return res.redirect(`/exams/edit/${req.params.id}`);
        }
        
        // Check if exam exists and user has permission to edit it
        const existingExam = await Exam.findById(req.params.id);
        if (!existingExam) {
            req.flash('info', ['Exam not found', 'danger']);
            return res.redirect('/exams');
        }
        
        // Only allow admin or the teacher who created the exam to edit it
        if (req.session.user.role !== 'admin' && 
            (req.session.user.role !== 'teacher' || existingExam.teacherId?.toString() !== req.session.user.id)) {
            req.flash('info', ['You do not have permission to edit this exam', 'danger']);
            return res.redirect('/exams');
        }
        
        // Prepare update data
        let updateData = { 
            title: title.trim(), 
            date: new Date(date), 
            type: type,
            targetClasses: Array.isArray(targetClasses) ? targetClasses : (targetClasses ? [targetClasses] : [])
        };

        // Add teacher-specific fields
        if (req.session.user.role === 'teacher') {
            if (subject) {
                updateData.subject = subject;
            }
            if (duration) {
                updateData.duration = parseInt(duration);
            }
            if (startTime) {
                updateData.startTime = startTime;
            }
            // Ensure teacherId is set for teacher-created exams
            updateData.teacherId = req.session.user.id;
        }

        // Update the exam
        const updatedExam = await Exam.findByIdAndUpdate(
            req.params.id, 
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedExam) {
            req.flash('info', ['Failed to update exam', 'danger']);
            return res.redirect(`/exams/edit/${req.params.id}`);
        }

        // Create announcement for exam update
        const announcement = new Announcement({
            title: `[UPDATE] Exam Details Changed: ${updateData.title}`,
            content: `The details for the exam '${updateData.title}' scheduled on ${new Date(updateData.date).toLocaleDateString()} have been updated. Please check the exam schedule for the latest information.`,
            author: req.session.user.id,
            authorModel: req.session.user.role === 'teacher' ? 'Teacher' : 'Admin',
            targetAudience: ['student', 'parent', 'teacher'],
            targetClasses: updateData.targetClasses || [],
            priority: 'Medium'
        });
        await announcement.save();

        await logEvent('exam_updated', req.session.user.id, { 
            examId: req.params.id, 
            changes: updateData,
            oldData: {
                title: existingExam.title,
                date: existingExam.date,
                type: existingExam.type
            }
        });
        
        req.flash('info', ['Exam updated and announcement sent successfully', 'success']);
        res.redirect('/exams');
    } catch (error) {
        req.flash('info', ['Error updating exam: ' + error.message, 'danger']);
        res.redirect(`/exams/edit/${req.params.id}`);
    }
});

// Delete Exam - POST (for form submissions)
router.post('/exams/delete/:id', isAuthenticated, async (req, res) => {
    try {
        // Check if user has permission to delete this exam
        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            req.flash('info', ['Exam not found', 'danger']);
            return res.redirect('/exams');
        }
        
        // Only allow admin or the teacher who created the exam to delete it
        if (req.session.user.role !== 'admin' && 
            (req.session.user.role !== 'teacher' || exam.teacherId?.toString() !== req.session.user.id)) {
            req.flash('info', ['You do not have permission to delete this exam', 'danger']);
            return res.redirect('/exams');
        }
        
        await Exam.findByIdAndDelete(req.params.id);
        await logEvent('exam_deleted', req.session.user.id, { examId: req.params.id });
        req.flash('info', ['Exam deleted successfully', 'success']);
        res.redirect('/exams');
    } catch (error) {
        req.flash('info', ['Error deleting exam', 'danger']);
        res.redirect('/exams');
    }
});

// Delete Exam - DELETE (for API calls)
router.delete('/exams/:id', isAuthenticated, async (req, res) => {
    try {
        // Check if user has permission to delete this exam
        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }
        
        // Only allow admin or the teacher who created the exam to delete it
        if (req.session.user.role !== 'admin' && 
            (req.session.user.role !== 'teacher' || exam.teacherId?.toString() !== req.session.user.id)) {
            return res.status(403).json({ success: false, message: 'Permission denied' });
        }
        
        await Exam.findByIdAndDelete(req.params.id);
        await logEvent('exam_deleted', req.session.user.id, { examId: req.params.id });
        res.json({ success: true, message: 'Exam deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting exam' });
    }
});

// Results routes
router.get('/results', isAuthenticated, async (req, res) => {
    try {
        const results = await Grade.find().sort({ createdAt: -1 });
        const exams = await Exam.find().populate('subject').sort({ date: -1 });
        const classes = await Class.find().sort({ gradeLevel: 1, section: 1 });
        const subjects = await Subject.find().sort({ name: 1 });
        const students = await Student.find().sort({ firstName: 1, lastName: 1 });
        
        // Process results to add student, class, and exam information
        const processedResults = await Promise.all(results.map(async (result) => {
            // Find student by studentId
            const student = students.find(s => s.studentId === result.studentId);
            
            // Find class by student's gradeLevel and section
            let classObj = null;
            if (student) {
                classObj = classes.find(
                    c => c.gradeLevel == student.gradeLevel && c.section == student.section
                );
            }
            
            // Find the exam for this result
            let exam = null;
            if (result.examId) {
                // If result has examId, use that
                exam = await Exam.findById(result.examId).populate('subject');
            } else {
                // Fallback: find exam by subject and type
                exam = exams.find(e => {
                    if (e.subject && e.subject.name === result.subject && e.type === result.examType) {
                        return true;
                    }
                    return false;
                });
            }

            return {
                ...result.toObject(),
                student: student || { 
                    firstName: 'Unknown', 
                    lastName: 'Student', 
                    gradeLevel: '', 
                    section: '',
                    studentId: result.studentId || 'Unknown'
                },
                classObj: classObj || { 
                    name: 'Unknown Class', 
                    section: '',
                    gradeLevel: ''
                },
                exam: exam || { 
                    subject: { name: result.subject || 'Unknown' }, 
                    type: result.examType || 'Unknown',
                    title: 'Unknown Exam'
                }
            };
        }));
        
        res.render('pages/results/index', {
            title: 'Results',
            results: processedResults,
            exams,
            classes,
            subjects,
            students,
            user: req.session.user,
            info: req.flash('info'),
            errors: [],
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Error loading results', 'danger']);
        res.redirect('/dashboard');
    }
});

// Edit Result - GET
router.get('/results/edit/:id', isAdminOrTeacher, async (req, res) => {
    try {
        const result = await Grade.findById(req.params.id);
        if (!result) {
            req.flash('info', ['Result not found', 'danger']);
            return res.redirect('/results');
        }

        // Get related data
        const students = await Student.find().sort({ firstName: 1, lastName: 1 });
        const exams = await Exam.find().populate('subject').sort({ date: -1 });
        const classes = await Class.find().sort({ gradeLevel: 1, section: 1 });
        const subjects = await Subject.find().sort({ name: 1 });

        // Find the student for this result
        const student = students.find(s => s.studentId === result.studentId);
        
        // Find the exam for this result
        let exam = null;
        if (result.examId) {
            // If result has examId, use that
            exam = await Exam.findById(result.examId).populate('subject');
        } else {
            // Fallback: find exam by subject and type
            exam = exams.find(e => {
                if (e.subject && e.subject.name === result.subject && e.type === result.examType) {
                    return true;
                }
                return false;
            });
        }

        const renderData = {
            title: 'Edit Result',
            result,
            student: student || { firstName: 'Unknown', lastName: 'Student' },
            exam: exam || { title: 'Unknown Exam', subject: { name: result.subject } },
            students,
            exams,
            classes,
            subjects,
            user: req.session.user,
            info: req.flash('info'),
            errors: [],
            layout: false
        };

        res.render('pages/results/edit', renderData);
    } catch (error) {
        req.flash('info', ['Error loading result for edit', 'danger']);
        res.redirect('/results');
    }
});

// Edit Result - POST
router.post('/results/edit/:id', isAdminOrTeacher, async (req, res) => {
    try {
        const { studentId, examId, marksObtained, totalMarks, grade, remarks } = req.body;
        
        // Validate required fields
        if (!studentId || !examId || !marksObtained || !totalMarks || !grade) {
            req.flash('info', ['All required fields must be filled.', 'danger']);
            return res.redirect(`/results/edit/${req.params.id}`);
        }
        
        // Validate marks
        const marks = parseFloat(marksObtained);
        const total = parseFloat(totalMarks);
        if (marks < 0 || total <= 0 || marks > total) {
            req.flash('info', ['Invalid marks. Marks obtained cannot exceed total marks.', 'danger']);
            return res.redirect(`/results/edit/${req.params.id}`);
        }
        
        // Get student and exam details
        const student = await Student.findById(studentId);
        const exam = await Exam.findById(examId).populate('subject');
        
        if (!student || !exam) {
            req.flash('info', ['Student or exam not found.', 'danger']);
            return res.redirect(`/results/edit/${req.params.id}`);
        }
        
        // Check if result already exists for this student and exam (excluding current result)
        const existingResult = await Grade.findOne({ 
            studentId: student.studentId, 
            subject: exam.subject.name,
            examType: exam.type,
            _id: { $ne: req.params.id }
        });
        
        if (existingResult) {
            req.flash('info', ['A result for this student and exam already exists.', 'warning']);
            return res.redirect(`/results/edit/${req.params.id}`);
        }
        
        // Update the result
        const updateData = {
            studentId: student.studentId,
            subject: exam.subject.name,
            examType: exam.type,
            grade: grade,
            marksObtained: marks,
            totalMarks: total,
            remarks: remarks || '',
            examId: examId,
            studentName: `${student.firstName} ${student.lastName}`,
            examDate: exam.date
        };

        const updatedResult = await Grade.findByIdAndUpdate(
            req.params.id, 
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedResult) {
            req.flash('info', ['Failed to update result', 'danger']);
            return res.redirect(`/results/edit/${req.params.id}`);
        }
        
        // Log the event
        await logEvent('result_updated', req.session.user.id, { 
            resultId: req.params.id,
            studentId: student.studentId, 
            examId: examId, 
            subject: exam.subject.name,
            grade: grade 
        });
        
        req.flash('info', ['Result updated successfully!', 'success']);
        res.redirect('/results');
        
    } catch (error) {
        req.flash('info', ['An error occurred while updating the result.', 'danger']);
        res.redirect(`/results/edit/${req.params.id}`);
    }
});

// Delete Result - POST
router.post('/results/delete/:id', isAdminOrTeacher, async (req, res) => {
    try {
        const result = await Grade.findById(req.params.id);
        if (!result) {
            req.flash('info', ['Result not found', 'danger']);
            return res.redirect('/results');
        }

        await Grade.findByIdAndDelete(req.params.id);
        await logEvent('result_deleted', req.session.user.id, { 
            resultId: req.params.id,
            studentId: result.studentId,
            subject: result.subject,
            grade: result.grade
        });
        
        req.flash('info', ['Result deleted successfully', 'success']);
        res.redirect('/results');
    } catch (error) {
        req.flash('info', ['Error deleting result', 'danger']);
        res.redirect('/results');
    }
});

// Delete Result - DELETE (for API calls)
router.delete('/results/:id', isAdminOrTeacher, async (req, res) => {
    try {
        const result = await Grade.findById(req.params.id);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Result not found' });
        }

        await Grade.findByIdAndDelete(req.params.id);
        await logEvent('result_deleted', req.session.user.id, { 
            resultId: req.params.id,
            studentId: result.studentId,
            subject: result.subject,
            grade: result.grade
        });
        
        res.json({ success: true, message: 'Result deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting result' });
    }
});

// Main attendance route (redirects based on role)
router.get('/attendance', isAuthenticated, (req, res) => {
    if (req.session.user.role === 'admin') {
        return res.redirect('/attendance/report');
    } else if (req.session.user.role === 'teacher') {
        return res.redirect('/attendance/take');
    } else if (req.session.user.role === 'student') {
        return res.redirect('/attendance/my-attendance');
    } else {
        req.flash('info', ['You do not have permission to view this page.', 'danger']);
        return res.redirect('/dashboard');
    }
});

router.get('/attendance/my-attendance', isAuthenticated, isStudent, attendanceController.viewStudentAttendance);

router.get('/attendance/report', isAdmin, async (req, res) => {
    try {
        const { date, gradeLevel, section } = req.query;
        let filter = {};
        
        
        if (date) {
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            filter.date = { $gte: dayStart, $lte: dayEnd };
        }

        if (gradeLevel && section) {
            const classObj = await Class.findOne({ gradeLevel: parseInt(gradeLevel), section });
            if (classObj) {
                filter.classId = classObj._id;
            }
        }

        const attendance = await Attendance.find(filter)
            .populate('studentId', 'firstName lastName studentId')
            .populate('subjectId', 'name')
            .populate('teacherId', 'firstName lastName')
            .sort({ date: -1 });

        const classes = await Class.find();

        res.render('pages/attendance/report', {
            title: 'Attendance Report',
            attendance,
            classes: await Class.find(), // For filter dropdowns
            selectedDate: date,
            selectedGradeLevel: gradeLevel,
            selectedSection: section,
            user: req.session.user,
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Failed to load attendance report.', 'danger']);
        res.redirect('/dashboard');
    }
});

// View attendance for a specific class
router.get('/attendance/class/:id', isAdmin, async (req, res) => {
    try {
        const classId = req.params.id;
        const classObj = await Class.findById(classId).populate('teacherId');

        if (!classObj) {
            req.flash('info', ['Class not found.', 'danger']);
            return res.redirect('/classes');
        }

        const attendance = await Attendance.find({ classId: classId })
            .populate('studentId', 'firstName lastName studentId')
            .populate('subjectId', 'name')
            .populate('teacherId', 'firstName lastName')
            .sort({ date: -1, 'studentId.lastName': 1 });

        res.render('pages/attendance/class', {
            title: `Attendance for ${classObj.name}`,
            attendance,
            classObj,
            user: req.session.user,
            layout: false
        });

    } catch (error) {
        req.flash('info', ['Failed to load class attendance.', 'danger']);
        res.redirect('/classes');
    }
});

// Announcement routes
router.get('/announcements', isAuthenticated, async (req, res) => {
    try {
        let query = {
            $or: [
                { targetClasses: { $exists: false } },
                { targetClasses: { $size: 0 } }
            ]
        };

        const user = req.session.user;
        if (user.role === 'student') {
            const student = await Student.findById(user.id);
            if (student) {
                const studentClass = await Class.findOne({ gradeLevel: parseInt(student.gradeLevel), section: student.section });
                if (studentClass) {
                    query.$or.push({ targetClasses: studentClass._id });
                }
            }
        } else if (user.role === 'teacher') {
            const teacher = await Teacher.findById(user.id);
            if (teacher && teacher.assignedClasses && teacher.assignedClasses.length > 0) {
                const classIds = teacher.assignedClasses.map(c => c._id);
                query.$or.push({ targetClasses: { $in: classIds } });
            }
        } else if (user.role === 'parent') {
            const parent = await Parent.findById(user.id);
            if (parent && parent.studentId) {
                const student = await Student.findOne({ studentId: parent.studentId });
                if (student) {
                    const studentClass = await Class.findOne({ gradeLevel: parseInt(student.gradeLevel), section: student.section });
                    if (studentClass) {
                        query.$or.push({ targetClasses: studentClass._id });
                    }
                }
            }
        } else if (user.role === 'admin') {
            query = {}; // Admin sees all announcements
        }
        
        const announcements = await Announcement.find(query)
            .populate('author')
            .populate('targetClasses')
            .sort({ createdAt: -1 });

        res.render('pages/announcements/index', { 
            title: 'Announcements', 
            announcements,
            user: req.session.user,
            info: req.flash('info'),
            errors: [],
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Error loading announcements', 'danger']);
        res.redirect('/dashboard');
    }
})

// Create Announcement - GET
router.get('/announcements/create', isAuthenticated, (req, res) => {
    res.render('pages/announcements/create', {
        title: 'Create Announcement',
        user: req.session.user,
        info: req.flash('info'),
        errors: [],
        layout: false
    });
});

// Create Announcement - POST
router.post('/announcements/create', isAuthenticated, async (req, res) => {
    try {
        const { title, content, targetAudience, gradeLevel, priority, expiryDate } = req.body;
        let authorId, authorModel;

        if (req.session.user.role === 'teacher') {
            const teacher = await Teacher.findOne({ teacherId: req.session.user.teacherId });
            authorId = teacher ? teacher._id : undefined;
            authorModel = 'Teacher';
        } else {
            // Assume admin
            const admin = await Admin.findOne({ adminId: req.session.user.adminId });
            authorId = admin ? admin._id : undefined;
            authorModel = 'Admin';
        }

        if (!authorId) throw new Error('Author not found');

        const announcement = new Announcement({
            title,
            content,
            author: authorId,
            authorModel,
            targetAudience: Array.isArray(targetAudience) ? targetAudience : [targetAudience],
            gradeLevel: gradeLevel || undefined,
            priority: priority || 'Medium',
            expiryDate: expiryDate || undefined
        });
        await announcement.save();
        await logEvent('announcement_created', req.session.user.id, { announcementId: announcement._id, title, content, targetAudience, gradeLevel, priority, expiryDate });
        req.flash('info', ['Announcement created successfully', 'success']);
        res.redirect('/announcements');
    } catch (error) {
        req.flash('info', ['Error creating announcement', 'danger']);
        res.redirect('/announcements/create');
    }
});

// Show single announcement
router.get('/announcements/:id', isAuthenticated, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id).populate('author');
        if (!announcement) {
            req.flash('info', ['Announcement not found', 'danger']);
            return res.redirect('/announcements');
        }
        res.render('pages/announcements/show', {
            title: announcement.title,
            announcement,
            user: req.session.user,
            info: req.flash('info'),
            errors: [],
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Error loading announcement', 'danger']);
        res.redirect('/announcements');
    }
});

// Edit announcement - GET
router.get('/announcements/:id/edit', isAuthenticated, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id).populate('author');
        if (!announcement) {
            req.flash('info', ['Announcement not found', 'danger']);
            return res.redirect('/announcements');
        }

        // Check if user has permission to edit
        const user = req.session.user;
        if (user.role !== 'admin' && 
            (user.role !== 'teacher' || announcement.author.toString() !== user.id)) {
            req.flash('info', ['You do not have permission to edit this announcement', 'danger']);
            return res.redirect('/announcements');
        }

        res.render('pages/announcements/edit', {
            title: 'Edit Announcement',
            announcement,
            user: req.session.user,
            info: req.flash('info'),
            errors: [],
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Error loading announcement', 'danger']);
        res.redirect('/announcements');
    }
});

// Edit announcement - POST
router.post('/announcements/:id/edit', isAuthenticated, async (req, res) => {
    try {
        const { title, content, targetAudience, gradeLevel, priority, expiryDate } = req.body;
        
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            req.flash('info', ['Announcement not found', 'danger']);
            return res.redirect('/announcements');
        }

        // Check if user has permission to edit
        const user = req.session.user;
        if (user.role !== 'admin' && 
            (user.role !== 'teacher' || announcement.author.toString() !== user.id)) {
            req.flash('info', ['You do not have permission to edit this announcement', 'danger']);
            return res.redirect('/announcements');
        }

        // Update announcement
        announcement.title = title;
        announcement.content = content;
        announcement.targetAudience = Array.isArray(targetAudience) ? targetAudience : [targetAudience];
        announcement.gradeLevel = gradeLevel || undefined;
        announcement.priority = priority || 'Medium';
        announcement.expiryDate = expiryDate || undefined;

        await announcement.save();
        await logEvent('announcement_updated', req.session.user.id, { 
            announcementId: announcement._id, 
            title, 
            content, 
            targetAudience, 
            gradeLevel, 
            priority, 
            expiryDate 
        });
        
        req.flash('info', ['Announcement updated successfully', 'success']);
        res.redirect('/announcements');
    } catch (error) {
        req.flash('info', ['Error updating announcement', 'danger']);
        res.redirect(`/announcements/${req.params.id}/edit`);
    }
});

// Delete announcement
router.delete('/announcements/:id', isAuthenticated, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ success: false, message: 'Announcement not found' });
        }

        // Check if user has permission to delete
        const user = req.session.user;
        if (user.role !== 'admin' && 
            (user.role !== 'teacher' || announcement.author.toString() !== user.id)) {
            return res.status(403).json({ success: false, message: 'Permission denied' });
        }

        await Announcement.findByIdAndDelete(req.params.id);
        await logEvent('announcement_deleted', req.session.user.id, { 
            announcementId: req.params.id, 
            title: announcement.title 
        });
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting announcement' });
    }
});

// Profile routes
router.get('/profile', isAuthenticated, profileController.getProfile);
router.post('/profile/update', isAuthenticated, profileController.updateProfile);
router.post('/profile/change-password', isAuthenticated, profileController.changePassword);
router.post('/profile/delete', isAuthenticated, profileController.deleteAccount);
router.post('/profile/avatar', isAuthenticated, isTeacherOrAdmin, upload.single('avatar'), profileController.updateAvatar);

router.get('/api/subjects/by-teacher/:teacherId', isAuthenticated, async (req, res) => {
    try {
        const subjects = await Subject.find({ teacherId: req.params.teacherId });
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});

router.get('/api/parents/check', isAuthenticated, async (req, res) => {
    try {
        const { email } = req.query;
        const parent = await Parent.findOne({ email });
        if (parent) {
            res.json({ exists: true, parent: { firstName: parent.firstName, lastName: parent.lastName } });
        } else {
            res.json({ exists: false });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/results/add', isAdminOrTeacher, async (req, res) => {
    try {
        let students = [];
        let exams = [];
        let classes = [];
        
        if (req.session.user.role === 'teacher') {
            // For teachers: only show their assigned classes, subjects, and students
            const teacher = await Teacher.findOne({ teacherId: req.session.user.teacherId }).populate('subjects');
            
            if (!teacher) {
                req.flash('info', ['Could not find your teacher profile.', 'danger']);
                return res.redirect('/dashboard');
            }
            
            // Get teacher's assigned classes
            const assignedClasses = teacher.assignedClasses || [];
            classes = assignedClasses.map(c => ({ gradeLevel: c.gradeLevel, section: c.section }));
            
            // Get students from teacher's assigned classes
            if (assignedClasses.length > 0) {
                const orConditions = assignedClasses.map(c => ({
                    gradeLevel: c.gradeLevel.toString(),
                    section: c.section
                }));
                students = await Student.find({ $or: orConditions }).sort({ firstName: 1, lastName: 1 });
            }
            
            // Get exams for teacher's subjects
            const teacherSubjectIds = teacher.subjects ? teacher.subjects.map(s => s._id) : [];
            if (teacherSubjectIds.length > 0) {
                exams = await Exam.find({ 
                    subject: { $in: teacherSubjectIds },
                    teacherId: teacher._id 
                }).populate('subject').sort({ date: -1 });
            }
            
        } else if (req.session.user.role === 'admin') {
            // For admins: show all data
            students = await Student.find().sort({ firstName: 1, lastName: 1 });
            exams = await Exam.find().populate('subject').sort({ date: -1 });
            classes = await Class.find().sort({ gradeLevel: 1, section: 1 });
        }
        
        res.render('pages/results/add', {
            title: 'Add Result',
            students,
            exams,
            classes,
            user: req.session.user,
            info: req.flash('info'),
            errors: [],
            layout: false
        });
    } catch (error) {
        req.flash('info', ['An error occurred while loading the page.', 'danger']);
        res.redirect('/dashboard');
    }
});

router.post('/results/add', isAdminOrTeacher, async (req, res) => {
    try {
        const { studentId, examId, marksObtained, totalMarks, grade, remarks } = req.body;
        
        // Validate required fields
        if (!studentId || !examId || !marksObtained || !totalMarks || !grade) {
            req.flash('info', ['All required fields must be filled.', 'danger']);
            return res.redirect('/results/add');
        }
        
        // Validate marks
        const marks = parseFloat(marksObtained);
        const total = parseFloat(totalMarks);
        if (marks < 0 || total <= 0 || marks > total) {
            req.flash('info', ['Invalid marks. Marks obtained cannot exceed total marks.', 'danger']);
            return res.redirect('/results/add');
        }
        
        // Get student and exam details
        const student = await Student.findById(studentId);
        const exam = await Exam.findById(examId).populate('subject');
        
        if (!student || !exam) {
            req.flash('info', ['Student or exam not found.', 'danger']);
            return res.redirect('/results/add');
        }
        
        // Check if result already exists for this student and exam
        const existingResult = await Grade.findOne({ 
            studentId: student.studentId, 
            subject: exam.subject.name,
            examType: exam.type 
        });
        
        if (existingResult) {
            req.flash('info', ['A result for this student and exam already exists.', 'warning']);
            return res.redirect('/results/add');
        }
        
        // Create new result
        const newResult = new Grade({
            studentId: student.studentId,
            subject: exam.subject.name,
            examType: exam.type,
            grade: grade,
            marksObtained: marks,
            totalMarks: total,
            remarks: remarks || '',
            examId: examId,
            studentName: `${student.firstName} ${student.lastName}`,
            examDate: exam.date
        });
        
        await newResult.save();
        
        // Log the event
        await logEvent('result_added', req.session.user.id, { 
            studentId: student.studentId, 
            examId: examId, 
            subject: exam.subject.name,
            grade: grade 
        });
        
        req.flash('info', ['Result added successfully!', 'success']);
        res.redirect('/results');
        
    } catch (error) {
        req.flash('info', ['An error occurred while adding the result.', 'danger']);
        res.redirect('/results/add');
    }
});

router.get('/attendance/take', isTeacher, async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ teacherId: req.session.user.teacherId }).populate('subjects');
        
        if (!teacher) {
            req.flash('info', ['Could not find your teacher profile.', 'danger']);
            return res.redirect('/dashboard');
        }

        const assignedClasses = teacher.assignedClasses || [];
        const subjects = teacher.subjects || [];

        res.render('pages/attendance/take', {
            title: 'Take Attendance',
            assignedClasses,
            subjects,
            students: [],
            selectedClass: '',
            selectedSubject: '',
            selectedDate: new Date().toISOString().split('T')[0],
            user: req.session.user,
            info: req.flash('info'),
            layout: false
        });

    } catch (error) {
        req.flash('info', ['An error occurred while loading the page.', 'danger']);
        res.redirect('/dashboard');
    }
});

router.get('/attendance/fetch-students', isTeacher, async (req, res) => {
    try {
        const { class: classInfo, subject: subjectId, date } = req.query;
        const [gradeLevel, section] = classInfo.split('-');

        const students = await Student.find({ gradeLevel, section }).sort({ firstName: 1 });
        const teacher = await Teacher.findOne({ teacherId: req.session.user.teacherId }).populate('subjects');
        
        if (!teacher) {
            req.flash('info', ['Could not find your teacher profile.', 'danger']);
            return res.redirect('/dashboard');
        }

        const assignedClasses = teacher.assignedClasses || [];
        const subjects = teacher.subjects || [];

        res.render('pages/attendance/take', {
            title: 'Take Attendance',
            assignedClasses,
            subjects,
            students,
            selectedClass: classInfo,
            selectedSubject: subjectId,
            selectedDate: date,
            layout: false
        });

    } catch (error) {
        req.flash('info', ['Failed to fetch students.', 'danger']);
        // Re-render the initial form with an error
        const assignedClasses = await Class.find({ teacherId: req.session.user.id });
        const subjects = await Subject.find({ teacherId: req.session.user.id });
        res.render('pages/attendance/take', {
            title: 'Take Attendance',
            students: [],
            assignedClasses,
            subjects,
            selectedClass: req.query.class,
            selectedSubject: req.query.subject,
            selectedDate: req.query.date,
            info: req.flash('info'),
            user: req.session.user,
            layout: false
        });
    }
});

router.post('/attendance/submit', isTeacher, async (req, res) => {
    try {
        const { subjectId, date, attendance } = req.body;
        const [gradeLevel, section] = req.body.class.split('-');
        
        const teacher = await Teacher.findOne({ teacherId: req.session.user.teacherId });
        const classObj = await Class.findOne({ gradeLevel: parseInt(gradeLevel), section });

        if (!teacher || !classObj) {
            req.flash('info', ['Required teacher or class information is missing.', 'danger']);
            return res.redirect('/attendance/take');
        }

        const attendanceRecords = attendance.map(att => ({
            studentId: att.studentId,
            classId: classObj._id,
            subjectId,
            teacherId: teacher._id,
            date: new Date(date),
            status: att.status
        }));
        
        await Attendance.insertMany(attendanceRecords, { ordered: false });

        req.flash('info', ['Attendance submitted successfully!', 'success']);
        res.redirect('/dashboard');

    } catch (error) {
        if (error.code === 11000) {
            req.flash('info', ['Attendance for this date and subject has already been submitted.', 'warning']);
        } else {
            req.flash('info', ['An error occurred while submitting attendance.', 'danger']);
        }
        res.redirect('/attendance/take');
    }
});

// Logs route - Admin only
router.get('/logs', isAuthenticated, async (req, res) => {
    try {
        // Only allow admin access to logs
        if (req.session.user.role !== 'admin') {
            req.flash('info', ['Access denied. Admin privileges required.', 'danger']);
            return res.redirect('/dashboard');
        }

        const Log = require('../models/log');
        const logs = await Log.find()
            .sort({ createdAt: -1 })
            .limit(100); // Limit to recent 100 logs

        // Format logs for display
        const formattedLogs = logs.map(log => ({
            ...log.toObject(),
            user: log.user || 'System',
            eventType: log.eventType,
            details: log.details,
            createdAt: log.createdAt
        }));

        res.render('pages/logs/index', {
            title: 'System Logs',
            logs: formattedLogs,
            user: req.session.user,
            info: req.flash('info'),
            errors: [],
            layout: false
        });
    } catch (error) {
        req.flash('info', ['Error loading system logs', 'danger']);
        res.redirect('/dashboard');
    }
});

// Force refresh results (for debugging)
router.get('/results/refresh', isAuthenticated, async (req, res) => {
    try {
        // Clear any potential cache headers
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        // Redirect to results page with cache-busting parameter
        const timestamp = Date.now();
        res.redirect(`/results?refresh=${timestamp}`);
        
    } catch (error) {
        res.redirect('/results');
    }
});

module.exports = router;
