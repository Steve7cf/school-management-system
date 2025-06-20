const Student = require('../models/student');
const Teacher = require('../models/teacher');
const Parent = require('../models/parent');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Exam = require('../models/Exam');
const Announcement = require('../models/Announcement');
const Attendance = require('../models/Attendance');

// Main dashboard controller - redirects based on user role
const index = async (req, res) => {
  try {
    const user = req.session.user;
    
    switch (user.role) {
      case 'student':
        return res.redirect('/dashboard/student');
      case 'teacher':
        return res.redirect('/dashboard/teacher');
      case 'parent':
        return res.redirect('/dashboard/parent');
      case 'admin':
        return res.redirect('/dashboard/admin');
      default:
        req.flash('info', ['Invalid user role', 'danger']);
        return res.redirect('/login');
    }
  } catch (error) {
    console.error(error);
    req.flash('info', ['Error loading dashboard', 'danger']);
    res.redirect('/login');
  }
};

// Admin dashboard controller
const adminDashboard = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalTeachers = await Teacher.countDocuments();
    const totalClasses = await Class.countDocuments();
    const totalSubjects = await Subject.countDocuments();
    const recentAnnouncements = await Announcement.find()
      .sort({ createdAt: -1 })
      .limit(5);
    const upcomingExamsCount = await Exam.countDocuments({ date: { $gte: new Date() } });

    const data = {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      recentAnnouncements,
      upcomingExamsCount
    };

    res.render('pages/dashboard/admin', {
      user: req.session.user,
      data,
      info: req.flash('info'),
      errors: []
    });
  } catch (error) {
    console.error(error);
    req.flash('info', ['Error loading dashboard', 'danger']);
    res.redirect('/login');
  }
};

// Helper function to get student dashboard data
async function getStudentDashboardData(studentId) {
  const student = await Student.findOne({ studentId });
  const studentClass = await Class.findOne({ gradeLevel: student.gradeLevel, section: student.section });
  const subjects = await Subject.find({ gradeLevel: student.gradeLevel });
  const upcomingExams = await Exam.find({
    gradeLevel: student.gradeLevel,
    section: student.section,
    date: { $gte: new Date() }
  }).sort({ date: 1 }).limit(5);
  const recentAnnouncements = await Announcement.find()
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
    subjectCount: subjects.length,
    upcomingExamsCount: upcomingExams.length,
    attendanceRate,
    upcomingExams,
    recentAnnouncements
  };
}

// Helper function to get teacher dashboard data
async function getTeacherDashboardData(teacherId) {
  const teacher = await Teacher.findOne({ teacherId }).populate('subjects');
  const teacherClasses = await Class.find({ teacherId: teacher._id });
  // Dynamically count students in all classes taught by this teacher
  let studentCount = 0;
  if (teacherClasses.length > 0) {
    const orConditions = teacherClasses.map(c => ({
      gradeLevel: c.gradeLevel.toString(), // student.gradeLevel is string
      section: c.section
    }));
    studentCount = await Student.countDocuments({ $or: orConditions });
  }
  const upcomingExams = await Exam.find({
    teacherId: teacher._id,
    date: { $gte: new Date() }
  }).sort({ date: 1 }).limit(5);
  const recentAnnouncements = await Announcement.find()
    .sort({ createdAt: -1 })
    .limit(5);

  return {
    subjects: teacher.subjects || [],
    classCount: teacherClasses.length,
    studentCount,
    upcomingExamsCount: upcomingExams.length,
    upcomingExams,
    recentAnnouncements
  };
}

// Helper function to get parent dashboard data
async function getParentDashboardData(studentId) {
  const student = await Student.findOne({ studentId });
  const studentClass = await Class.findOne({ gradeLevel: student.gradeLevel });
  const upcomingExams = await Exam.find({
    gradeLevel: student.gradeLevel,
    date: { $gte: new Date() }
  }).sort({ date: 1 }).limit(5);
  const recentAnnouncements = await Announcement.find()
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
const studentDashboard = async (req, res) => {
  try {
    const data = await getStudentDashboardData(req.session.user.studentId);
    res.render('pages/dashboard/student', {
      user: req.session.user,
      data,
      info: req.flash('info'),
      errors: []
    });
  } catch (error) {
    console.error(error);
    req.flash('info', ['Error loading dashboard', 'danger']);
    res.redirect('/login');
  }
};

// Teacher dashboard controller
const teacherDashboard = async (req, res) => {
  try {
    const data = await getTeacherDashboardData(req.session.user.teacherId);
    res.render('pages/dashboard/teacher', {
      user: req.session.user,
      data,
      info: req.flash('info'),
      errors: []
    });
  } catch (error) {
    console.error(error);
    req.flash('info', ['Error loading dashboard', 'danger']);
    res.redirect('/login');
  }
};

// Parent dashboard controller
const parentDashboard = async (req, res) => {
  try {
    const parent = req.session.user;
    const student = await Student.findOne({ studentId: parent.studentId });

    let upcomingExamsCount = 0;
    let announcementsCount = 0;

    if (student) {
      // Count upcoming exams for the student's grade level
      upcomingExamsCount = await Exam.countDocuments({
        gradeLevel: student.gradeLevel,
        date: { $gte: new Date() }
      });

      // Count active announcements for parents or all
      announcementsCount = await Announcement.countDocuments({
        isActive: true,
        $or: [
          { targetAudience: 'All' },
          { targetAudience: 'Parents' },
          { targetAudience: 'Students' }
        ]
      });
    }

    res.render('pages/dashboard/parent', {
      user: parent,
      student,
      upcomingExamsCount,
      announcementsCount,
      info: req.flash('info'),
      errors: []
    });
  } catch (error) {
    console.error(error);
    req.flash('info', ['Error loading dashboard', 'danger']);
    res.redirect('/login');
  }
};

module.exports = {
  index,
  adminDashboard,
  studentDashboard,
  teacherDashboard,
  parentDashboard
}; 