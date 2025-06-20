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
    isAdminOrTeacher 
} = require("../middleware/auth")
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
const Log = require('../models/log')
const { logEvent } = require('../services/logService')
const mongoose = require('mongoose')

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
router.get("/admin/login", (req, res) => {res.render("admin-login", {info:req.flash('info')})})

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
router.get("/logout", (req, res) => {
  const user = req.session.user; // Capture user before destroying session
  req.session.destroy(err => {
    if (err) {
      console.error("Session destruction error:", err);
      // Even with an error, we should probably redirect to a safe page
      return res.redirect('/'); 
    }

    if (user) {
      logEvent('logout', user.id, { role: user.role });
    } else {
      logEvent('logout', 'unknown', { role: 'unknown' });
    }
    
    // The name 'connect.sid' is the default for express-session
    res.clearCookie('connect.sid'); 
    res.redirect("/login");
  });
})

// Student routes
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
            section
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading students', 'danger']);
        res.redirect('/dashboard');
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
            search,
            selectedSubject: subject,
            selectedGradeLevel: gradeLevel,
            selectedSection: section,
            sortBy,
            sortOrder
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading teachers', 'danger']);
        res.render('pages/teachers/index', {
            title: 'Teachers',
            teachers: [],
            subjects: [],
            classes: [],
            search: req.query.search,
            selectedSubject: req.query.subject,
            selectedGradeLevel: req.query.gradeLevel,
            selectedSection: req.query.section,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder
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
    console.error(error);
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
    console.error(error);
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
    await Teacher.findByIdAndUpdate(req.params.id, { firstName, lastName, email, subjects, assignedClasses: assignedClassesArr });
    await logEvent('teacher_updated', req.session.user.id, { teacherId: req.params.id, changes: { firstName, lastName, email, subjects, assignedClasses: assignedClassesArr } });
    req.flash('info', ['Teacher updated successfully', 'success']);
    res.redirect('/teachers');
  } catch (error) {
    console.error(error);
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
    console.error(error);
    req.flash('info', ['Error deleting teacher', 'danger']);
    res.redirect('/teachers');
  }
});

// Class routes
router.get('/classes', isAdmin, async (req, res) => {
    try {
        const classes = await Class.find().populate('teacherId');
        const teachers = await Teacher.find();
        const students = await Student.find();
        res.render('pages/classes/index', { title: 'Classes', classes, teachers, students, user: req.session.user, info: req.flash('info'), errors: [] });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading classes', 'danger']);
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
        res.render('pages/classes/show', { title: classObj.name, classObj, students, user: req.session.user });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading class', 'danger']);
        res.redirect('/classes');
    }
});

// Edit class form
router.get('/classes/edit/:id', isAdmin, async (req, res) => {
    try {
        const classObj = await Class.findById(req.params.id);
        const teachers = await Teacher.find();
        if (!classObj) {
            req.flash('info', ['Class not found', 'danger']);
            return res.redirect('/classes');
        }
        res.render('pages/classes/edit', { title: 'Edit Class', classObj, teachers, user: req.session.user });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading class for edit', 'danger']);
        res.redirect('/classes');
    }
});

// Update class
router.post('/classes/edit/:id', isAdmin, async (req, res) => {
    try {
        let { gradeLevel, section, teacherId } = req.body;
        if (teacherId && typeof teacherId === 'string' && teacherId.match(/^[a-fA-F0-9]{24}$/)) {
            teacherId = new mongoose.Types.ObjectId(teacherId);
        }
        await Class.findByIdAndUpdate(req.params.id, { gradeLevel, section, teacherId });
        req.flash('info', ['Class updated successfully', 'success']);
        res.redirect('/classes');
    } catch (error) {
        console.error(error);
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
        console.error(error);
        req.flash('info', ['Error deleting class', 'danger']);
        res.redirect('/classes');
    }
});

// Add new class
router.post('/classes', isAdmin, async (req, res) => {
    try {
        let { gradeLevel, section, teacherId } = req.body;
        if (teacherId && typeof teacherId === 'string' && teacherId.match(/^[a-fA-F0-9]{24}$/)) {
            teacherId = new mongoose.Types.ObjectId(teacherId);
        }
        await Class.create({ gradeLevel, section, teacherId, academicYear: new Date().getFullYear().toString() });
        req.flash('info', ['Class added successfully', 'success']);
        res.redirect('/classes');
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error adding class', 'danger']);
        res.redirect('/classes');
    }
});

// Subject routes
router.get('/subjects', isAdminOrTeacher, async (req, res) => {
    try {
        let subjects;
        if (req.session.user.role === 'teacher') {
            const teacher = await Teacher.findOne({ teacherId: req.session.user.teacherId })
                .populate({
                    path: 'subjects',
                    populate: {
                        path: 'teacherId'
                    }
                });
            subjects = teacher.subjects || [];
        } else {
            subjects = await Subject.find().populate('teacherId');
        }

        const classes = await Class.find();
        const teachers = await Teacher.find();
        res.render('pages/subjects/index', {
            title: 'Subjects',
            subjects,
            classes,
            teachers,
            user: req.session.user,
            info: req.flash('info'),
            errors: []
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading subjects', 'danger']);
        res.redirect('/dashboard');
    }
})

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
            errors: []
        });
    } catch (error) {
        console.error(error);
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
            teacherId: teacherId || null
        });

        await newSubject.save();

        // If a teacher was assigned, add the subject to their list
        if (teacherId) {
            await Teacher.findByIdAndUpdate(teacherId, { $addToSet: { subjects: newSubject._id } });
        }
        
        await logEvent('subject_created', req.session.user.id, { subjectId: newSubject._id, name, code, gradeLevel, credits, teacherId });
        req.flash('info', ['Subject created successfully!', 'success']);
        res.redirect('/subjects');
    } catch (error) {
        console.error(error);
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
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Failed to load subject for editing.', 'danger']);
        res.redirect('/subjects');
    }
});

// Handle Edit Subject
router.post('/subjects/edit/:id', isAdmin, async (req, res) => {
    try {
        const { name, code, gradeLevel, credits, teacherId } = req.body;
        const subjectId = req.params.id;

        const subject = await Subject.findById(subjectId);
        if (!subject) {
            req.flash('info', ['Subject not found.', 'danger']);
            return res.redirect('/subjects');
        }

        const oldTeacherId = subject.teacherId;

        // Update the subject document
        subject.name = name;
        subject.code = code;
        subject.gradeLevel = gradeLevel;
        subject.credits = credits;
        subject.teacherId = teacherId || null;
        await subject.save();

        // If the teacher was changed, update both teachers' records
        if (oldTeacherId?.toString() !== teacherId) {
            // Remove subject from the old teacher
            if (oldTeacherId) {
                await Teacher.findByIdAndUpdate(oldTeacherId, { $pull: { subjects: subjectId } });
            }
            // Add subject to the new teacher
            if (teacherId) {
                await Teacher.findByIdAndUpdate(teacherId, { $addToSet: { subjects: subjectId } });
            }
        }

        await logEvent('subject_updated', req.session.user.id, { subjectId: subjectId, changes: req.body });
        req.flash('info', ['Subject updated successfully!', 'success']);
        res.redirect('/subjects');
    } catch (error) {
        console.error(error);
        req.flash('info', ['Failed to update subject.', 'danger']);
        res.redirect(`/subjects/edit/${req.params.id}`);
    }
});

// Delete a subject
router.post('/subjects/delete/:id', isAdmin, async (req, res) => {
    try {
        const subjectId = req.params.id;
        const subject = await Subject.findByIdAndDelete(subjectId);

        if (!subject) {
            req.flash('info', ['Subject not found.', 'danger']);
            return res.redirect('/subjects');
        }

        // If the subject was assigned to a teacher, remove it from their list
        if (subject.teacherId) {
            await Teacher.findByIdAndUpdate(subject.teacherId, { $pull: { subjects: subjectId } });
        }

        await logEvent('subject_deleted', req.session.user.id, { subjectId: subjectId, name: subject.name, code: subject.code });
        req.flash('info', ['Subject deleted successfully!', 'success']);
        res.redirect('/subjects');
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error deleting subject.', 'danger']);
        res.redirect('/subjects');
    }
});

// Exam routes
router.get('/exams', isAuthenticated, async (req, res) => {
    try {
        let exams = [];
        if (req.session.user.role === 'teacher') {
            const teacher = await Teacher.findOne({ teacherId: req.session.user.teacherId }).populate('subjects');
            const subjectIds = teacher.subjects.map(s => s._id);
            const assignedClasses = teacher.assignedClasses || [];
            exams = await Exam.find({
                subject: { $in: subjectIds },
                $or: assignedClasses.map(cls => ({ gradeLevel: cls.gradeLevel, section: cls.section }))
            })
            .populate('subject')
            .sort({ date: 1 });
        } else {
            exams = await Exam.find()
                .populate('subject')
                .sort({ date: 1 });
        }
        res.render('pages/exams/index', {
            title: 'Exams',
            exams,
            user: req.session.user,
            info: req.flash('info'),
            errors: []
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading exams', 'danger']);
        res.redirect('/dashboard');
    }
})

router.get('/exams/add', isAuthenticated, async (req, res) => {
    try {
        let subjects = [];
        let assignedClasses = [];
        let teachers = [];
        if (req.session.user.role === 'teacher') {
            const teacher = await Teacher.findOne({ teacherId: req.session.user.teacherId }).populate('subjects');
            subjects = teacher.subjects || [];
            assignedClasses = teacher.assignedClasses || [];
        } else {
            subjects = await Subject.find();
            teachers = await Teacher.find();
            assignedClasses = [];
        }
        res.render('pages/exams/add', {
            title: 'Add Exam',
            user: req.session.user,
            subjects,
            teachers,
            assignedClasses,
            info: req.flash('info'),
            errors: []
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading form data', 'danger']);
        res.redirect('/exams');
    }
});

router.post('/exams/add', isAuthenticated, async (req, res) => {
    try {
        let { title, name, date, subject, gradeLevel, type, teacherId, totalMarks, duration, startTime, term, class: classSection } = req.body;
        let section = req.body.section;
        // If teacher, parse classSection (e.g., '1-A')
        if (req.session.user.role === 'teacher' && classSection) {
            const [grade, sec] = classSection.split('-');
            gradeLevel = grade;
            section = sec;
        }
        const exam = new Exam({
            title,
            name,
            date,
            subject,
            gradeLevel,
            section,
            type,
            teacherId,
            totalMarks,
            duration,
            startTime,
            term
        });
        await exam.save();
        await logEvent('exam_created', req.session.user.id, { examId: exam._id, title, name, date, subject, gradeLevel, section, type, teacherId, totalMarks, duration, startTime, term });
        req.flash('info', ['Exam added successfully', 'success']);
        res.redirect('/exams');
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error adding exam', 'danger']);
        res.redirect('/exams/add');
    }
});

// Edit Exam - GET
router.get('/exams/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id).populate('subject');
        const teachers = await Teacher.find();
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
            info: req.flash('info'),
            errors: []
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading exam for edit', 'danger']);
        res.redirect('/exams');
    }
});

// Edit Exam - POST
router.post('/exams/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const { title, name, date, subject, gradeLevel, type, teacherId, totalMarks, duration, startTime, term } = req.body;
        await Exam.findByIdAndUpdate(req.params.id, {
            title,
            name,
            date,
            subject,
            gradeLevel,
            type,
            teacherId,
            totalMarks,
            duration,
            startTime,
            term
        });
        await logEvent('exam_updated', req.session.user.id, { examId: req.params.id, changes: req.body });
        req.flash('info', ['Exam updated successfully', 'success']);
        res.redirect('/exams');
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error updating exam', 'danger']);
        res.redirect(`/exams/edit/${req.params.id}`);
    }
});

// Results routes
router.get('/results', isAuthenticated, async (req, res) => {
    try {
        const results = await Grade.find().sort({ createdAt: -1 });
        const exams = await Exam.find().populate('subject').sort({ date: -1 });
        res.render('pages/results/index', {
            title: 'Results',
            results,
            exams,
            user: req.session.user,
            info: req.flash('info'),
            errors: []
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading results', 'danger']);
        res.redirect('/dashboard');
    }
});

// Main attendance route (redirects based on role)
router.get('/attendance', isAuthenticated, (req, res) => {
    if (req.session.user.role === 'admin') {
        return res.redirect('/attendance/report');
    } else if (req.session.user.role === 'teacher') {
        return res.redirect('/attendance/take');
    } else {
        req.flash('info', ['You do not have permission to view this page.', 'danger']);
        return res.redirect('/dashboard');
    }
});

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
            const classObj = await Class.findOne({ gradeLevel, section });
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
            classes,
            selectedDate: date,
            selectedGradeLevel: gradeLevel,
            selectedSection: section
        });
    } catch (error) {
        console.error("Error fetching attendance report:", error);
        req.flash('info', ['Failed to load attendance report.', 'danger']);
        res.redirect('/dashboard');
    }
});

// View attendance for a specific class
router.get('/attendance/class/:id', isAdmin, async (req, res) => {
    try {
        const classId = req.params.id;
        const classObj = await Class.findById(classId);

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
            classObj,
            attendance,
            user: req.session.user
        });

    } catch (error) {
        console.error("Error fetching class attendance:", error);
        req.flash('info', ['Failed to load attendance data for the class.', 'danger']);
        res.redirect('/classes');
    }
});

// Announcement routes
router.get('/announcements', isAuthenticated, async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
        res.render('pages/announcements/index', { 
            title: 'Announcements', 
            announcements,
            user: req.session.user,
            info: req.flash('info'),
            errors: []
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading announcements', 'danger']);
        res.redirect('/dashboard');
    }
})

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
            errors: []
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading announcement', 'danger']);
        res.redirect('/announcements');
    }
});

// Profile routes
router.get('/profile', isAuthenticated, async (req, res) => {
    res.render('pages/profile/index', { title: 'Profile' })
})

router.get('/api/subjects/by-teacher/:teacherId', isAuthenticated, async (req, res) => {
    try {
        const subjects = await Subject.find({ teacherId: req.params.teacherId });
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});

router.delete('/exams/:id', isAuthenticated, async (req, res) => {
    try {
        console.log('DELETE /exams/:id called', req.params.id, 'User:', req.session.user);
        await Exam.findByIdAndDelete(req.params.id);
        await logEvent('exam_deleted', req.session.user.id, { examId: req.params.id });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting exam:', error);
        res.json({ success: false, message: 'Error deleting exam' });
    }
});

// Create Announcement - GET
router.get('/announcements/create', isAuthenticated, (req, res) => {
    res.render('pages/announcements/create', {
        title: 'Create Announcement',
        user: req.session.user,
        info: req.flash('info'),
        errors: []
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
        console.error(error);
        req.flash('info', ['Error creating announcement', 'danger']);
        res.redirect('/announcements/create');
    }
});

router.get('/results/add', isAdminOrTeacher, async (req, res) => {
    try {
        const students = await Student.find().sort({ firstName: 1, lastName: 1 });
        console.log('Fetched students:', students.length, students[0]);
        const exams = await Exam.find().populate('subject').sort({ date: -1 });
        res.render('pages/results/add', {
            title: 'Add Result',
            students,
            exams,
            user: req.session.user,
            info: req.flash('info'),
            errors: []
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading form data', 'danger']);
        res.redirect('/results');
    }
});

router.post('/results/add', isAdminOrTeacher, async (req, res) => {
    try {
        const { studentId, examId, marks } = req.body;
        const result = new Grade({
            studentId,
            examId,
            marks
        });
        await result.save();
        await logEvent('result_created', req.session.user.id, { resultId: result._id, studentId, examId, marks });
        req.flash('info', ['Result added successfully', 'success']);
        res.redirect('/results');
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error adding result', 'danger']);
        res.redirect('/results/add');
    }
});

router.get('/results/edit/:id', isAdminOrTeacher, async (req, res) => {
    try {
        const result = await Grade.findById(req.params.id);
        if (!result) {
            req.flash('info', ['Result not found', 'danger']);
            return res.redirect('/results');
        }
        res.render('pages/results/edit', {
            title: 'Edit Result',
            user: req.session.user,
            result,
            info: req.flash('info'),
            errors: []
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading result for edit', 'danger']);
        res.redirect('/results');
    }
});

router.post('/results/edit/:id', isAdminOrTeacher, async (req, res) => {
    try {
        const { marks } = req.body;
        await Grade.findByIdAndUpdate(req.params.id, {
            marks
        });
        await logEvent('result_updated', req.session.user.id, { resultId: req.params.id, changes: { marks } });
        req.flash('info', ['Result updated successfully', 'success']);
        res.redirect('/results');
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error updating result', 'danger']);
        res.redirect(`/results/edit/${req.params.id}`);
    }
});

router.delete('/results/:id', isAdminOrTeacher, async (req, res) => {
    try {
        await Grade.findByIdAndDelete(req.params.id);
        await logEvent('result_deleted', req.session.user.id, { resultId: req.params.id });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Error deleting result' });
    }
});

// Show edit form
router.get('/students/edit/:id', isAdminOrTeacher, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            req.flash('info', ['Student not found', 'danger']);
            return res.redirect('/students');
        }
        if (student.dateOfBirth && !(student.dateOfBirth instanceof Date)) {
            student.dateOfBirth = new Date(student.dateOfBirth);
        }
        const classes = await Class.find();
        const subjects = await Subject.find();
        let parent = null;
        if (student.parentEmail) {
            parent = await Parent.findOne({ email: student.parentEmail });
        }
        res.render('pages/students/edit', { title: 'Edit Student', student, classes, parent, subjects });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading student', 'danger']);
        res.redirect('/students');
    }
});

// Handle edit form submission
router.post('/students/edit/:id', isAdminOrTeacher, async (req, res) => {
    try {
        const updateData = { ...req.body };
        // If subjects is present, ensure it's an array
        if (updateData.subjects && !Array.isArray(updateData.subjects)) {
            updateData.subjects = [updateData.subjects];
        }
        await Student.findByIdAndUpdate(req.params.id, updateData);
        await logEvent('student_updated', req.session.user.id, { studentId: req.params.id, changes: updateData });
        req.flash('info', ['Student updated successfully', 'success']);
        res.redirect('/students');
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error updating student', 'danger']);
        res.redirect(`/students/edit/${req.params.id}`);
    }
});

// Show single student
router.get('/students/:id', isAdminOrTeacher, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).populate('subjects');
        if (!student) {
            req.flash('info', ['Student not found', 'danger']);
            return res.redirect('/students');
        }
        let parent = null;
        if (student.parentEmail) {
            parent = await Parent.findOne({ email: student.parentEmail });
        }
        res.render('pages/students/show', { title: 'Student Details', student, parent });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading student', 'danger']);
        res.redirect('/students');
    }
});

// Redirect /students/:id/edit to /students/edit/:id for robustness
router.get('/students/:id/edit', (req, res) => {
    res.redirect(`/students/edit/${req.params.id}`);
});

// Messages: Inbox for current user
router.get('/messages', isAuthenticated, async (req, res) => {
    try {
        let messages = [];
        if (req.session.user.role === 'teacher' || req.session.user.role === 'parent') {
            messages = await Message.find({
                $or: [
                    { sender: req.session.user.id },
                    { receiver: req.session.user.id }
                ]
            }).populate('sender').populate('receiver').sort({ createdAt: -1 });
        }
        res.render('pages/messages/index', {
            title: 'Messages',
            messages,
            user: req.session.user,
            info: req.flash('info'),
            errors: []
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading messages', 'danger']);
        res.redirect('/dashboard');
    }
});

// Messages: Compose new message
router.get('/messages/new', isAuthenticated, async (req, res) => {
    try {
        let parents = [];
        if (req.session.user.role === 'teacher') {
            parents = await Parent.find();
        }
        res.render('pages/messages/new', {
            title: 'New Message',
            parents,
            user: req.session.user,
            info: req.flash('info'),
            errors: []
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading form', 'danger']);
        res.redirect('/messages');
    }
});

// Messages: Send message
router.post('/messages', isAuthenticated, async (req, res) => {
    try {
        const { receiver, message } = req.body;
        const msg = new Message({
            sender: req.session.user.id,
            receiver,
            message
        });
        await msg.save();
        req.flash('info', ['Message sent successfully', 'success']);
        res.redirect('/messages');
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error sending message', 'danger']);
        res.redirect('/messages/new');
    }
});

// Messages: Reply form for parent or teacher
router.get('/messages/reply/:id', isAuthenticated, async (req, res) => {
    try {
        const msg = await Message.findById(req.params.id).populate('sender').populate('receiver');
        if (!msg) {
            req.flash('info', ['Message not found', 'danger']);
            return res.redirect('/messages');
        }
        // Always compare as strings
        const receiverId = msg.receiver && (msg.receiver._id ? msg.receiver._id.toString() : msg.receiver.toString());
        if (receiverId !== req.session.user.id.toString()) {
            req.flash('info', ['Unauthorized', 'danger']);
            return res.redirect('/messages');
        }
        res.render('pages/messages/reply', {
            title: 'Reply to Message',
            message: msg,
            user: req.session.user,
            info: req.flash('info'),
            errors: []
        });
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error loading reply form', 'danger']);
        res.redirect('/messages');
    }
});

// Messages: Send reply from parent or teacher
router.post('/messages/reply/:id', isAuthenticated, async (req, res) => {
    try {
        const original = await Message.findById(req.params.id).populate('receiver');
        if (!original) {
            req.flash('info', ['Message not found', 'danger']);
            return res.redirect('/messages');
        }
        const receiverId = original.receiver && (original.receiver._id ? original.receiver._id.toString() : original.receiver.toString());
        if (receiverId !== req.session.user.id.toString()) {
            req.flash('info', ['Unauthorized', 'danger']);
            return res.redirect('/messages');
        }
        const { message } = req.body;
        const reply = new Message({
            sender: req.session.user.id,
            receiver: original.sender,
            message
        });
        await reply.save();
        req.flash('info', ['Reply sent successfully', 'success']);
        res.redirect('/messages');
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error sending reply', 'danger']);
        res.redirect('/messages');
    }
});

router.get("/admin", (req, res) => {
    res.render("admin")
})

router.get('/registration-success', (req, res) => {
  res.render('registration-success', {
    studentId: req.query.studentId,
    teacherId: req.query.teacherId
  });
});

// Add Student form
router.get('/students/create', isAdminOrTeacher, async (req, res) => {
  try {
    const classes = await Class.find();
    res.render('pages/students/create', { classes });
  } catch (error) {
    console.error(error);
    req.flash('info', ['Error loading form', 'danger']);
    res.redirect('/students');
  }
});

// Add Student POST
router.post('/students/create', isAdminOrTeacher, async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, gender, class: gradeLevel, section, address, guardianName, guardianRelation, guardianPhone, guardianEmail } = req.body;
    // Validate gradeLevel
    if (!gradeLevel || !['1','2','3','4'].includes(gradeLevel)) {
      req.flash('info', ['Invalid form selected', 'danger']);
      return res.redirect('/students');
    }
    // Generate unique studentId
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    const studentId = `F${gradeLevel}/${year}/${random}`;
    // Generate random password
    const plainPassword = Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    // Create student
    await Student.create({
      firstName,
      lastName,
      dateOfBirth,
      gender,
      gradeLevel,
      section,
      address,
      parentEmail: guardianEmail,
      studentId,
      password: hashedPassword,
      role: 'student'
    });
    // Log the event
    await logEvent('student_created', req.session.user ? req.session.user.id : 'admin', {
      studentId,
      firstName,
      lastName,
      password: plainPassword,
      gradeLevel,
      section,
      parentEmail: guardianEmail
    });
    // Redirect to students list with newStudentId and password in query
    res.redirect(`/students?newStudentId=${encodeURIComponent(studentId)}&newStudentPassword=${encodeURIComponent(plainPassword)}`);
  } catch (error) {
    console.error(error);
    req.flash('info', ['Error adding student', 'danger']);
    res.redirect('/students');
  }
});

// View system logs (admin only)
router.get('/logs', isAdmin, async (req, res) => {
  try {
    const logs = await Log.find().sort({ createdAt: -1 }).limit(100);
    res.render('pages/logs/index', { title: 'System Logs', logs });
  } catch (error) {
    console.error(error);
    req.flash('info', ['Error loading logs', 'danger']);
    res.redirect('/dashboard');
  }
});

// Attendance Routes
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
            students: [], // Initially empty
            selectedClass: null,
            selectedSubject: null,
            selectedDate: null
        });
    } catch (error) {
        console.error("Error loading attendance page:", error);
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
            selectedDate: date
        });

    } catch (error) {
        console.error("Error fetching students for attendance:", error);
        req.flash('info', ['An error occurred while fetching the student list.', 'danger']);
        res.redirect('/attendance/take');
    }
});

router.post('/attendance/submit', isTeacher, async (req, res) => {
    try {
        const { subjectId, date, attendance } = req.body;
        const [gradeLevel, section] = req.body.class.split('-');
        
        const teacher = await Teacher.findOne({ teacherId: req.session.user.teacherId });
        const classObj = await Class.findOne({ gradeLevel, section });

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
            console.error("Error submitting attendance:", error);
            req.flash('info', ['An error occurred while submitting attendance.', 'danger']);
        }
        res.redirect('/attendance/take');
    }
});

module.exports = router