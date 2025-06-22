// Session-based authentication middleware
const JWTService = require('../services/jwtService');

const isAuthenticated = (req, res, next) => {
    // First check session-based authentication
    if (req.session && req.session.user && req.session.user.role) {
        return next();
    }
    
    // If no session, check JWT token from cookies
    const token = req.cookies.token;
    if (token) {
        try {
            const decoded = JWTService.verifyToken(token);
            
            // Ensure we have the minimum required user data
            if (decoded && decoded.id && decoded.role) {
                // Set user info in session for compatibility
                req.session.user = {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role,
                    // Try to get additional info from userInfo cookie
                    ...(req.cookies.userInfo && JSON.parse(req.cookies.userInfo))
                };
                
                console.log(`🔐 User authenticated via JWT: ${decoded.role} - ${decoded.email || decoded.id}`);
                return next();
            } else {
                console.log('JWT token missing required fields:', decoded);
                res.clearCookie('token');
                res.clearCookie('userInfo');
            }
        } catch (error) {
            console.log('JWT verification failed:', error.message);
            // Clear invalid token
            res.clearCookie('token');
            res.clearCookie('userInfo');
        }
    }
    
    // If we get here, user is not authenticated
    console.log('❌ Authentication failed - redirecting to login');
    res.redirect('/login');
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

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    
    // Debug logging for production issues
    console.log('🔒 Admin access denied:', {
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        userRole: req.session?.user?.role,
        sessionId: req.sessionID,
        cookies: Object.keys(req.cookies)
    });
    
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
    
    console.log('🔒 Teacher access denied:', {
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        userRole: req.session?.user?.role
    });
    
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
    
    console.log('🔒 Student access denied:', {
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        userRole: req.session?.user?.role
    });
    
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
    
    console.log('🔒 Parent access denied:', {
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        userRole: req.session?.user?.role
    });
    
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
    
    console.log('🔒 AdminOrTeacher access denied:', {
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        userRole: req.session?.user?.role
    });
    
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
    isAuthenticatedJWT,
    isAdmin,
    isTeacher,
    isStudent,
    isParent,
    isAdminOrTeacher,
    hasRole,
    isTeacherOrAdmin
}; 