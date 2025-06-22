const express = require('express');
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const Admin = require('../models/admin');
const Parent = require('../models/parent');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Exam = require('../models/Exam');
const Announcement = require('../models/Announcement');
const Attendance = require('../models/Attendance');
const Log = require('../models/log');

// Main dashboard controller - redirects based on user role
exports.index = async (req, res) => {
    try {
        // Get user from session or res.locals
        const user = req.session.user || res.locals.user;
        
        if (!user) {
            req.flash('info', ['Please log in to access the dashboard', 'warning']);
            return res.redirect('/login');
        }

        // Redirect based on user role
        switch (user.role) {
            case 'admin':
                return res.redirect('/dashboard/admin');
            case 'teacher':
                return res.redirect('/dashboard/teacher');
            case 'student':
                return res.redirect('/dashboard/student');
            case 'parent':
                return res.redirect('/dashboard/parent');
            default:
                req.flash('info', ['Unknown user role', 'danger']);
                return res.redirect('/login');
        }
    } catch (error) {
        req.flash('info', ['Error loading dashboard', 'danger']);
        res.redirect('/login');
    }
};

// Admin dashboard controller
exports.adminDashboard = async (req, res) => {
    try {
        // Get user from session or res.locals
        const user = req.session.user || res.locals.user;
        
        if (!user || user.role !== 'admin') {
            req.flash('info', ['Access denied. Admin privileges required.', 'danger']);
            return res.redirect('/login');
        }

        const totalStudents = await Student.countDocuments();
        const totalTeachers = await Teacher.countDocuments();
        const totalClasses = await Class.countDocuments();
        const totalSubjects = await Subject.countDocuments();
        const upcomingExamsCount = await Exam.countDocuments({ date: { $gte: new Date() } });

        // Fetch recent announcements
        const recentAnnouncements = await Announcement.find()
            .sort({ createdAt: -1 })
            .limit(5);

        // Fetch recent activities from logs
        const recentActivities = await Log.find().sort({ createdAt: -1 }).limit(10);
        
        const data = {
            totalStudents,
            totalTeachers,
            totalClasses,
            totalSubjects,
            upcomingExamsCount,
            recentAnnouncements,
            recentActivities
        };
        
        res.render('pages/dashboard/admin', {
            title: 'Admin Dashboard',
            user: user,
            data
        });
    } catch (error) {
        req.flash('info', ['Error loading admin dashboard', 'danger']);
        res.redirect('/login');
    }
};

// Helper function to get student dashboard data
async function getStudentDashboardData(studentId) {
  const student = await Student.findOne({ studentId }).populate('subjects');
  const studentClass = await Class.findOne({ gradeLevel: parseInt(student.gradeLevel), section: student.section });
  
  const examQuery = {
      date: { $gte: new Date() },
      $or: [
          { targetClasses: { $size: 0 } },
          { targetClasses: { $exists: false } }
      ]
  };
  if (studentClass) {
      examQuery.$or.push({ targetClasses: studentClass._id });
  }

  const upcomingExams = await Exam.find(examQuery).populate('subject').sort({ date: 1 }).limit(5);
  
  let announcementQuery = {
    $or: [
        { targetClasses: { $exists: false } },
        { targetClasses: { $size: 0 } }
    ]
  };
  if (studentClass) {
      announcementQuery.$or.push({ targetClasses: studentClass._id });
  }
  const recentAnnouncements = await Announcement.find(announcementQuery)
    .sort({ createdAt: -1 })
    .limit(5);

  // Calculate attendance rate from Attendance model
  let attendanceRate = 0;
  const totalAttendance = await Attendance.countDocuments({ student: student._id });
  if (totalAttendance > 0) {
    const presentCount = await Attendance.countDocuments({ student: student._id, status: 'Present' });
    attendanceRate = Math.round((presentCount / totalAttendance) * 100);
  }

  return {
    className: `Grade ${student.gradeLevel} - Section ${student.section}`,
    subjectCount: student.subjects ? student.subjects.length : 0,
    upcomingExamsCount: upcomingExams.length,
    attendanceRate,
    upcomingExams,
    recentAnnouncements
  };
}

// Helper function to get teacher dashboard data
async function getTeacherDashboardData(teacherDbId) {
  const teacher = await Teacher.findById(teacherDbId).populate('subjects');
  
  // Count students based on teacher's assigned classes
  let studentCount = 0;
  if (teacher && teacher.assignedClasses && teacher.assignedClasses.length > 0) {
    const orConditions = teacher.assignedClasses.map(c => ({
      gradeLevel: c.gradeLevel.toString(), // student.gradeLevel is string
      section: c.section
    }));
    studentCount = await Student.countDocuments({ $or: orConditions });
  }
  
  const upcomingExams = await Exam.find({
    teacherId: teacher._id,
    date: { $gte: new Date() }
  }).sort({ date: 1 }).limit(5);

  let announcementQuery = {
      $or: [
          { targetClasses: { $exists: false } },
          { targetClasses: { $size: 0 } }
      ]
  };
  if (teacher && teacher.assignedClasses && teacher.assignedClasses.length > 0) {
      const classIds = teacher.assignedClasses.map(c => c._id);
      announcementQuery.$or.push({ targetClasses: { $in: classIds } });
  }
  const recentAnnouncements = await Announcement.find(announcementQuery)
    .sort({ createdAt: -1 })
    .limit(5);

  return {
    subjects: teacher.subjects || [],
    classCount: teacher.assignedClasses ? teacher.assignedClasses.length : 0,
    studentCount,
    upcomingExamsCount: upcomingExams.length,
    upcomingExams,
    recentAnnouncements
  };
}

// Helper function to get parent dashboard data
async function getParentDashboardData(studentId) {
  const student = await Student.findOne({ studentId });
  const studentClass = await Class.findOne({ gradeLevel: parseInt(student.gradeLevel), section: student.section });
  
  const examQuery = {
      date: { $gte: new Date() },
      $or: [
          { targetClasses: { $size: 0 } },
          { targetClasses: { $exists: false } }
      ]
  };
  if (studentClass) {
      examQuery.$or.push({ targetClasses: studentClass._id });
  }

  const upcomingExams = await Exam.find(examQuery).populate('subject').sort({ date: 1 }).limit(5);

  let announcementQuery = {
      $or: [
          { targetClasses: { $exists: false } },
          { targetClasses: { $size: 0 } }
      ]
  };
  if (studentClass) {
      announcementQuery.$or.push({ targetClasses: studentClass._id });
  }
  const recentAnnouncements = await Announcement.find(announcementQuery)
    .sort({ createdAt: -1 })
    .limit(5);

  // Calculate attendance rate from Attendance model
  let attendanceRate = 0;
  if (student) {
    const totalAttendance = await Attendance.countDocuments({ student: student._id });
    if (totalAttendance > 0) {
      const presentCount = await Attendance.countDocuments({ student: student._id, status: 'Present' });
      attendanceRate = Math.round((presentCount / totalAttendance) * 100);
    }
  }

  return {
    studentName: `${student.firstName} ${student.lastName}`,
    className: `Grade ${student.gradeLevel}`,
    upcomingExamsCount: upcomingExams.length,
    attendanceRate,
    upcomingExams,
    recentAnnouncements
  };
}

// Student dashboard controller
exports.studentDashboard = async (req, res) => {
    try {
        const data = await getStudentDashboardData(req.session.user.studentId);
        
        res.render('pages/dashboard/student', {
            title: 'Student Dashboard',
            user: req.session.user,
            data
        });
    } catch (error) {
        console.error('Error loading student dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
};

// Teacher dashboard controller
exports.teacherDashboard = async (req, res) => {
    try {
        const data = await getTeacherDashboardData(req.session.user.id);
        
        res.render('pages/dashboard/teacher', {
            title: 'Teacher Dashboard',
            user: req.session.user,
            data
        });
    } catch (error) {
        console.error('Error loading teacher dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
};

// Parent dashboard controller
exports.parentDashboard = async (req, res) => {
    try {
        const data = await getParentDashboardData(req.session.user.studentId);
        
        res.render('pages/dashboard/parent', {
            title: 'Parent Dashboard',
            user: req.session.user,
            data
        });
    } catch (error) {
        console.error('Error loading parent dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
}; 