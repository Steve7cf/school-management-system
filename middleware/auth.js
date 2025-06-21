// Session-based authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/login');
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    // If AJAX/fetch, return JSON
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Admins only' });
    }
    // Otherwise, redirect
    res.redirect('/login');
};

const isTeacher = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'teacher') {
        return next();
    }
    res.status(403).render('error', { 
        title: 'Access Denied',
        message: 'You do not have permission to access this page.',
        layout: false 
    });
};

const isStudent = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'student') {
        return next();
    }
    res.status(403).render('error', { 
        title: 'Access Denied',
        message: 'You do not have permission to access this page.',
        layout: false 
    });
};

const isParent = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'parent') {
        return next();
    }
    res.status(403).render('error', { 
        title: 'Access Denied',
        message: 'You do not have permission to access this page.',
        layout: false 
    });
};

const isAdminOrTeacher = (req, res, next) => {
    if (req.session && req.session.user && 
        (req.session.user.role === 'admin' || req.session.user.role === 'teacher')) {
        return next();
    }
    res.status(403).render('error', { 
        title: 'Access Denied',
        message: 'You do not have permission to access this page.',
        layout: false 
    });
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
    isAdmin,
    isTeacher,
    isStudent,
    isParent,
    isAdminOrTeacher,
    hasRole,
    isTeacherOrAdmin
}; 