// Session-based authentication middleware
const JWTService = require('../services/jwtService');

const isAuthenticated = async (req, res, next) => {
    try {
        // First check if user is authenticated via session
        if (req.session && req.session.user) {
            res.locals.user = req.session.user;
            return next();
        }

        // If no session, check JWT token
        const token = req.cookies.token;
        if (!token) {
            return res.redirect('/login');
        }

        try {
            const decoded = JWTService.verifyToken(token);
            
            // Validate required fields
            if (!decoded._id || !decoded.role) {
                return res.redirect('/login');
            }

            // Set user info in res.locals for template access
            res.locals.user = {
                id: decoded._id,
                role: decoded.role,
                email: decoded.email,
                studentId: decoded.studentId
            };

            return next();
        } catch (error) {
            return res.redirect('/login');
        }
    } catch (error) {
        return res.redirect('/login');
    }
};

// JWT-specific authentication middleware for API routes
const isAuthenticatedJWT = (req, res, next) => {
    const token = JWTService.getTokenFromHeader(req) || req.cookies.token;
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }
    
    try {
        const decoded = JWTService.verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
};

// Role-based middleware with enhanced logging
const isAdmin = (req, res, next) => {
  if (!req.session.user && !res.locals.user) {
    req.flash('info', ['Please log in to access this page.', 'warning']);
    return res.redirect('/login');
  }

  const user = req.session.user || res.locals.user;
  if (user.role === 'admin') {
    return next();
  }

  req.flash('info', ['Access denied. Admin privileges required.', 'danger']);
  return res.redirect('/dashboard');
};

const isTeacher = (req, res, next) => {
  if (!req.session.user && !res.locals.user) {
    req.flash('info', ['Please log in to access this page.', 'warning']);
    return res.redirect('/login');
  }

  const user = req.session.user || res.locals.user;
  if (user.role === 'teacher') {
    return next();
  }

  req.flash('info', ['Access denied. Teacher privileges required.', 'danger']);
  return res.redirect('/dashboard');
};

const isStudent = (req, res, next) => {
  if (!req.session.user && !res.locals.user) {
    req.flash('info', ['Please log in to access this page.', 'warning']);
    return res.redirect('/login');
  }

  const user = req.session.user || res.locals.user;
  if (user.role === 'student') {
    return next();
  }

  req.flash('info', ['Access denied. Student privileges required.', 'danger']);
  return res.redirect('/dashboard');
};

const isParent = (req, res, next) => {
  if (!req.session.user && !res.locals.user) {
    req.flash('info', ['Please log in to access this page.', 'warning']);
    return res.redirect('/login');
  }

  const user = req.session.user || res.locals.user;
  if (user.role === 'parent') {
    return next();
  }

  req.flash('info', ['Access denied. Parent privileges required.', 'danger']);
  return res.redirect('/dashboard');
};

const isAdminOrTeacher = (req, res, next) => {
  if (!req.session.user && !res.locals.user) {
    req.flash('info', ['Please log in to access this page.', 'warning']);
    return res.redirect('/login');
  }

  const user = req.session.user || res.locals.user;
  if (user.role === 'admin' || user.role === 'teacher') {
    return next();
  }

  req.flash('info', ['Access denied. Admin or Teacher privileges required.', 'danger']);
  return res.redirect('/dashboard');
};

// Middleware to check if user has any of the specified roles
const hasRole = (roles) => {
    return (req, res, next) => {
        if (!req.session.user || !roles.includes(req.session.user.role)) {
            req.flash('info', ['Access denied. Insufficient privileges.', 'danger']);
            return res.redirect('/login');
        }
        next();
    };
};

function isTeacherOrAdmin(req, res, next) {
    const user = req.session.user;
    if (user && (user.role === 'teacher' || user.role === 'admin')) {
        return next();
    }
    req.flash('info', ['You do not have permission to access this page.', 'danger']);
    res.status(403).redirect('back');
}

module.exports = {
    isAuthenticated,
    isAuthenticatedJWT,
    isAdmin,
    isTeacher,
    isStudent,
    isParent,
    isAdminOrTeacher,
    hasRole,
    isTeacherOrAdmin
}; 