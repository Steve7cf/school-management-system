const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const studentModel = require("../models/student");
const parentModel = require("../models/parent");
const teacherModel = require("../models/teacher");
const messageModel = require("../models/messages");
const gradeModel = require("../models/grade");
const Admin = require("../models/admin");
const Subject = require('../models/Subject');
const { logEvent } = require('../services/logService');

// register student
const registerStudent = async (req, res) => {
  const {
    firstName,
    lastName,
    dateOfBirth,
    password,
    confirmPassword,
    grade,
    parentEmail,
    section,
    gender,
    address
  } = req.body;
  if (
    !firstName ||
    !lastName ||
    !dateOfBirth ||
    !password ||
    !confirmPassword ||
    !grade ||
    !parentEmail ||
    !section ||
    !gender
  ) {
    req.flash("error", "All fields are required");
    return res.status(401).redirect("/signup");
  }

  if (password !== confirmPassword) {
    req.flash("error", "Passwords do not match");
    return res.redirect("/register/student");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Generate unique studentId
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  const studentId = `F${grade}/${year}/${random}`;

  try {
    const studentObj = {
      firstName,
      lastName,
      studentId,
      dateOfBirth,
      password: hashedPassword,
      gradeLevel: grade,
      parentEmail,
      section,
      gender,
      address
    };

    // create student records
    const studentRecords = await studentModel.create(studentObj);
    if (!studentRecords)
      return res
        .status(500)
        .json({ message: "Whoops! cant create account right now" });

    await logEvent('signup', studentId, { role: 'student', email: parentEmail });

    res.redirect(`/registration-success?studentId=${encodeURIComponent(studentId)}`);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "Whoops! internal server Errors" });
  }
};

// register parent
const registerParent = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
    phone,
    childStudentId,
  } = req.body;
  if (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !confirmPassword ||
    !phone ||
    !childStudentId
  ) {
    return res.status(400).json({ message: "some fields are missing" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  try {
    const parentObj = {
      firstName: firstName,
      lastName: lastName,
      studentId: childStudentId,
      phone: phone,
      email: email,
      password: hashedPassword,
    };

    // create parent records
    const parentRecords = await parentModel.create(parentObj);
    if (!parentRecords)
      return res
        .status(500)
        .json({ message: "Whoops! cant create account right now" });

    await logEvent('signup', email, { role: 'parent', studentId: childStudentId });

    res.status(201).redirect("/login");
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "Whoops! internal server Errors" });
  }
};

// register teacher
const registerTeacher = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    req.flash('info', ['All fields are required', 'danger']);
    return res.redirect('/signup');
  }

  try {
    const existingTeacher = await teacherModel.findOne({ email });
    if (existingTeacher) {
      req.flash('info', ['An account with this email already exists.', 'danger']);
      return res.redirect('/signup');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Generate a unique teacher ID
    const lastTeacher = await teacherModel.findOne().sort({ createdAt: -1 });
    let newTeacherId = 'T1001';
    if (lastTeacher && lastTeacher.teacherId) {
        const lastId = parseInt(lastTeacher.teacherId.substring(1));
        newTeacherId = 'T' + (lastId + 1);
    }

    const newTeacher = new teacherModel({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      teacherId: newTeacherId,
      subjects: [] // Subjects will be assigned by admin
    });

    await newTeacher.save();
    await logEvent('teacher_registered', newTeacher._id, { teacherId: newTeacher.teacherId });

    req.flash('info', ['Teacher account created successfully! Please log in.', 'success']);
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    req.flash('info', ['An error occurred during registration.', 'danger']);
    res.redirect('/signup');
  }
};

// auth teacher
const authTeacher = async (req, res) => {
  const role = "teacher";
  const { teacherId, password } = req.body;

  if (!teacherId || !password || !role) {
    req.flash("info", ["some fields are missing", "warning"]);
    return res.redirect("/login");
  }

  try {
    const user = await teacherModel.findOne({ teacherId: teacherId, role: role });

    if (!user) {
      req.flash("info", ["wrong credentials", "warning"]);
      await logEvent('login_failed', teacherId, { reason: 'wrong credentials', role: 'teacher' });
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("info", ["wrong credentials", "warning"]);
      await logEvent('login_failed', teacherId, { reason: 'wrong credentials', role: 'teacher' });
      return res.redirect("/login");
    }

    // Set up session
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      teacherId: user.teacherId,
      role: role
    };

    await logEvent('login', user.teacherId, { role: 'teacher' });

    return res.redirect("/dashboard/teacher");
  } catch (error) {
    console.log(error);
    req.flash("info", ["Server error", "danger"]);
    return res.redirect("/login");
  }
};

// auth student
const authStudent = async (req, res) => {
  const { studentId, password } = req.body;

  if (!studentId || !password) {
    req.flash("info", ["some fields are missing", "warning"]);
    return res.redirect("/login");
  }

  try {
    const user = await studentModel.findOne({ studentId: studentId });

    if (!user) {
      req.flash("info", ["wrong credentials", "warning"]);
      await logEvent('login_failed', studentId, { reason: 'wrong credentials', role: 'student' });
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("info", ["wrong credentials", "warning"]);
      await logEvent('login_failed', studentId, { reason: 'wrong credentials', role: 'student' });
      return res.redirect("/login");
    }

    // Set up session
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      studentId: user.studentId,
      gradeLevel: user.gradeLevel,
      role: 'student'
    };

    await logEvent('login', user.studentId, { role: 'student' });

    return res.redirect("/dashboard/student");
  } catch (error) {
    console.log(error);
    req.flash("info", ["Server error", "danger"]);
    return res.redirect("/login");
  }
};

// auth parent
const authParent = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash("info", ["some fields are missing", "warning"]);
    return res.redirect("/login");
  }

  try {
    const user = await parentModel.findOne({ email: email });

    if (!user) {
      req.flash("info", ["wrong credentials", "warning"]);
      await logEvent('login_failed', email, { reason: 'wrong credentials', role: 'parent' });
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("info", ["wrong credentials", "warning"]);
      await logEvent('login_failed', email, { reason: 'wrong credentials', role: 'parent' });
      return res.redirect("/login");
    }

    // Set up session
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: 'parent',
      studentId: user.studentId
    };

    await logEvent('login', email, { role: 'parent' });

    return res.redirect("/dashboard/parent");
  } catch (error) {
    console.log(error);
    req.flash("info", ["Server error", "danger"]);
    return res.redirect("/login");
  }
};

// auth admin
const authAdmin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('info', ['All fields are required', 'danger']);
    return res.redirect('/login');
  }

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      req.flash('info', ['Invalid credentials', 'danger']);
      await logEvent('login_failed', email, { reason: 'wrong credentials', role: 'admin' });
      return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      req.flash('info', ['Invalid credentials', 'danger']);
      await logEvent('login_failed', email, { reason: 'wrong credentials', role: 'admin' });
      return res.redirect('/login');
    }

    req.session.user = {
      id: admin._id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: 'admin',
    };
    await logEvent('login', email, { role: 'admin' });
    res.redirect('/dashboard/admin');
  } catch (error) {
    console.error(error);
    req.flash('info', ['An error occurred. Please try again.', 'danger']);
    res.redirect('/login');
  }
};

// messages
const announcement = async (req, res) => {
  const { sender, message, receiver } = req.body;
  try {
    const messageObj = {
      sender: sender,
      message: message,
      receiver: receiver,
    };
    const messageRec = await messageModel.create(messageObj);
    if (!messageRec) {
      req.flash("info", ["no messages", "warning"]);
      return res.redirect("/dashboard");
    }
    res.status(201).json(messageRec);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "server error" });
  }
};

const addGrade = async (req, res) => {
  const { studentId, subject, grade, examType } = req.body;
  console.log(studentId, subject, grade, examType);
  if (!studentId || !subject || !grade || !examType) {
    req.flash("info", ["some fields are missing", "warning"]);
    return res.redirect("/dashboard");
  }
  try {
    const gradeObj = {
      studentId: studentId,
      subject: subject,
      grade: grade,
      examType: examType,
    };
    const gradeRecords = await gradeModel.create(gradeObj);
    if (!gradeRecords) req.flash("info", ["no Record", "warning"]);
    return res.redirect("/dashboard");
  } catch (error) {
    console.log(error.message);
    req.flash("info", ["internal server error", "warning"]);
    return res.redirect("/logout");
  }
};

module.exports = {
  authStudent,
  authParent,
  authTeacher,
  authAdmin,
  registerStudent,
  registerParent,
  registerTeacher,
  announcement,
  addGrade,
};
