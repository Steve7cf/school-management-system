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
const JWTService = require('../services/jwtService');

// Helper function to set authentication cookies
const setAuthCookies = (res, user, token) => {
  const isProduction = process.env.NODE_ENV === "production";
  const domain = process.env.DOMAIN || undefined;
  
  // Set JWT token as HTTP-only cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction && process.env.FORCE_HTTPS !== 'false', // Only secure in production with HTTPS
    sameSite: isProduction ? 'lax' : 'lax', // Use 'lax' for better compatibility
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
    domain: domain,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  // Set user info cookie (non-sensitive data only)
  const userInfo = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    ...(user.studentId && { studentId: user.studentId }),
    ...(user.teacherId && { teacherId: user.teacherId }),
    ...(user.email && { email: user.email })
  };

  res.cookie('userInfo', JSON.stringify(userInfo), {
    httpOnly: false, // Allow client-side access
    secure: isProduction && process.env.FORCE_HTTPS !== 'false', // Only secure in production with HTTPS
    sameSite: isProduction ? 'lax' : 'lax', // Use 'lax' for better compatibility
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
    domain: domain,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
};

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
    req.flash("info", ["All fields are required", "warning"]);
    return res.redirect("/signup");
  }

  if (password !== confirmPassword) {
    req.flash("info", ["Passwords do not match", "warning"]);
    return res.redirect("/signup");
  }

  try {
    // Check if student exists
    const student = await studentModel.findOne({ studentId: childStudentId });
    if (!student) {
      req.flash("info", [`Student with ID ${childStudentId} not found. Please check the student ID.`, "warning"]);
      return res.redirect("/signup");
    }

    // Check if parent already exists for this student
    const existingParent = await parentModel.findOne({ studentId: childStudentId });
    if (existingParent) {
      req.flash("info", [`A parent account already exists for student ${childStudentId}.`, "warning"]);
      return res.redirect("/signup");
    }

    // Check if email is already used
    const existingEmail = await parentModel.findOne({ email: email });
    if (existingEmail) {
      req.flash("info", ["An account with this email already exists.", "warning"]);
      return res.redirect("/signup");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

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
    if (!parentRecords) {
      req.flash("info", ["Failed to create parent account. Please try again.", "danger"]);
      return res.redirect("/signup");
    }

    await logEvent('signup', email, { role: 'parent', studentId: childStudentId });

    req.flash("info", ["Parent account created successfully! You can now log in.", "success"]);
    res.redirect("/login");
  } catch (error) {
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.studentId) {
        req.flash("info", [`A parent account already exists for student ${childStudentId}.`, "warning"]);
      } else if (error.keyPattern && error.keyPattern.email) {
        req.flash("info", ["An account with this email already exists.", "warning"]);
      } else {
        req.flash("info", ["Account already exists with these details.", "warning"]);
      }
    } else {
      req.flash("info", ["An error occurred during registration. Please try again.", "danger"]);
    }
    
    return res.redirect("/signup");
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

    const newTeacher = new teacherModel({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      subjects: [] // Subjects will be assigned by admin
    });

    await newTeacher.save();
    await logEvent('teacher_registered', newTeacher._id, { email: newTeacher.email });

    // Redirect to success page (no teacherId)
    res.redirect(`/registration-success`);
  } catch (error) {
    console.error('Teacher registration error:', error);
    req.flash('info', ['An error occurred during registration.', 'danger']);
    res.redirect('/signup');
  }
};

// auth teacher
const authTeacher = async (req, res) => {
  const role = "teacher";
  const { email, password } = req.body;

  if (!email || !password || !role) {
    req.flash("info", ["some fields are missing", "warning"]);
    return res.redirect("/login");
  }

  try {
    const user = await teacherModel.findOne({ email: email, role: role });

    if (!user) {
      req.flash("info", ["wrong credentials", "warning"]);
      await logEvent('login_failed', email, { reason: 'wrong credentials', role: 'teacher' });
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("info", ["wrong credentials", "warning"]);
      await logEvent('login_failed', email, { reason: 'wrong credentials', role: 'teacher' });
      return res.redirect("/login");
    }

    // Generate JWT token
    const token = JWTService.generateToken({
      _id: user._id,
      email: user.email,
      role: role
    });

    // Set up session
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'teacher'
    };

    // Set authentication cookies
    setAuthCookies(res, req.session.user, token);

    // Force session save before redirect
    req.session.save((err) => {
      if (err) {
        req.flash("info", ["Session error", "danger"]);
        return res.redirect("/login");
      }
      
      logEvent('login', user.email, { role: 'teacher' });
      return res.redirect("/dashboard/teacher");
    });
  } catch (error) {
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

    // Generate JWT token
    const token = JWTService.generateToken({
      _id: user._id,
      studentId: user.studentId,
      role: 'student'
    });

    // Set up session
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      studentId: user.studentId,
      gradeLevel: user.gradeLevel,
      role: 'student'
    };

    // Set authentication cookies
    setAuthCookies(res, req.session.user, token);

    // Force session save before redirect
    req.session.save((err) => {
      if (err) {
        req.flash("info", ["Session error", "danger"]);
        return res.redirect("/login");
      }
      
      logEvent('login', user.studentId, { role: 'student' });
      return res.redirect("/dashboard/student");
    });
  } catch (error) {
    req.flash("info", ["Server error", "danger"]);
    return res.redirect("/login");
  }
};

// auth parent
const authParent = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash("info", ["Email and password are required", "warning"]);
    return res.redirect("/login");
  }

  try {
    // Check if parent exists
    const user = await parentModel.findOne({ email: email });

    if (!user) {
      req.flash("info", ["No parent account found with this email address", "warning"]);
      await logEvent('login_failed', email, { reason: 'account not found', role: 'parent' });
      return res.redirect("/login");
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("info", ["Incorrect password. Please try again", "warning"]);
      await logEvent('login_failed', email, { reason: 'wrong password', role: 'parent' });
      return res.redirect("/login");
    }

    // Check if parent is linked to a valid student
    const student = await studentModel.findOne({ studentId: user.studentId });
    if (!student) {
      req.flash("info", ["Parent account is not linked to a valid student. Please contact administrator.", "warning"]);
      await logEvent('login_failed', email, { reason: 'no linked student', role: 'parent', studentId: user.studentId });
      return res.redirect("/login");
    }

    // Generate JWT token
    const token = JWTService.generateToken({
      _id: user._id,
      email: user.email,
      role: 'parent'
    });

    // Set up session
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: 'parent',
      studentId: user.studentId
    };

    // Set authentication cookies
    setAuthCookies(res, req.session.user, token);

    // Force session save before redirect
    req.session.save((err) => {
      if (err) {
        req.flash("info", ["Session error", "danger"]);
        return res.redirect("/login");
      }
      
      logEvent('login', email, { role: 'parent', studentId: user.studentId });
      return res.redirect("/dashboard/parent");
    });
  } catch (error) {
    req.flash("info", ["Server error occurred. Please try again later.", "danger"]);
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

    // Generate JWT token
    const token = JWTService.generateToken({
      _id: admin._id,
      email: admin.email,
      role: 'admin'
    });

    // Set up session
    req.session.user = {
      id: admin._id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: 'admin',
    };

    // Set authentication cookies
    setAuthCookies(res, req.session.user, token);

    // Force session save before redirect
    req.session.save((err) => {
      if (err) {
        req.flash('info', ['Session error', 'danger']);
        return res.redirect('/login');
      }
      
      logEvent('login', email, { role: 'admin' });
      
      // Set additional headers for debugging
      res.setHeader('X-Session-ID', req.sessionID);
      res.setHeader('X-User-Role', 'admin');
      
      res.redirect('/dashboard/admin');
    });
  } catch (error) {
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
    return res.status(500).json({ message: "server error" });
  }
};

const addGrade = async (req, res) => {
  const { studentId, subject, grade, examType } = req.body;
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
    req.flash("info", ["internal server error", "warning"]);
    return res.redirect("/logout");
  }
};

// Logout function that clears all authentication cookies
const logout = async (req, res) => {
  try {
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        // Session destruction error - continue anyway
      }
    });

    // Clear authentication cookies
    const isProduction = process.env.NODE_ENV === "production";
    const domain = process.env.DOMAIN || undefined;

    // Clear JWT token cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction && process.env.FORCE_HTTPS !== 'false',
      sameSite: isProduction ? 'lax' : 'lax',
      path: '/',
      domain: domain
    });

    // Clear user info cookie
    res.clearCookie('userInfo', {
      httpOnly: false,
      secure: isProduction && process.env.FORCE_HTTPS !== 'false',
      sameSite: isProduction ? 'lax' : 'lax',
      path: '/',
      domain: domain
    });

    // Clear session cookie
    res.clearCookie('connect.sid', {
      httpOnly: true,
      secure: isProduction && process.env.FORCE_HTTPS !== 'false',
      sameSite: isProduction ? 'lax' : 'lax',
      path: '/',
      domain: domain
    });

    // Log the logout event if user info is available
    if (req.session && req.session.user) {
      logEvent('logout', req.session.user.email || req.session.user.studentId, { 
        role: req.session.user.role 
      });
    }

    res.redirect('/login');
  } catch (error) {
    res.redirect('/login');
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
  logout,
};