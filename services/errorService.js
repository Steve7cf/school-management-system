// Custom error classes for different types of errors
class AppError extends Error {
    constructor(message, status = 500, title = null, suggestions = []) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        this.title = title || this.getDefaultTitle(status);
        this.suggestions = suggestions.length > 0 ? suggestions : this.getDefaultSuggestions(status);
    }

    getDefaultTitle(status) {
        const titles = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            409: 'Conflict',
            422: 'Validation Error',
            500: 'Internal Server Error',
            503: 'Service Unavailable'
        };
        return titles[status] || 'Error';
    }

    getDefaultSuggestions(status) {
        const suggestions = {
            400: [
                'Check that all required fields are filled',
                'Ensure the data format is correct',
                'Try refreshing the page'
            ],
            401: [
                'Please log in to access this resource',
                'Check your credentials',
                'Try logging out and back in'
            ],
            403: [
                'You do not have permission to access this resource',
                'Contact your administrator for access',
                'Try a different account'
            ],
            404: [
                'Check if the URL is spelled correctly',
                'Try navigating from the main menu',
                'Make sure you are logged in if required'
            ],
            409: [
                'This information already exists',
                'Try using different data',
                'Check if you already have an account'
            ],
            422: [
                'Check that all required fields are filled',
                'Ensure email addresses are in correct format',
                'Verify that passwords meet requirements'
            ],
            500: [
                'Try refreshing the page',
                'Check your internet connection',
                'Contact support if the problem persists'
            ],
            503: [
                'The service is temporarily unavailable',
                'Please try again later',
                'Contact support if the problem persists'
            ]
        };
        return suggestions[status] || suggestions[500];
    }
}

// Specific error classes
class ValidationError extends AppError {
    constructor(message, suggestions = []) {
        super(message, 422, 'Validation Error', suggestions);
        this.name = 'ValidationError';
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication required', suggestions = []) {
        super(message, 401, 'Authentication Required', suggestions);
        this.name = 'AuthenticationError';
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Access denied', suggestions = []) {
        super(message, 403, 'Access Denied', suggestions);
        this.name = 'AuthorizationError';
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found', suggestions = []) {
        super(message, 404, 'Not Found', suggestions);
        this.name = 'NotFoundError';
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict', suggestions = []) {
        super(message, 409, 'Conflict', suggestions);
        this.name = 'ConflictError';
    }
}

// Error handler utility
const handleError = (error, req, res, next) => {
    console.error('Error occurred:', error);

    // If it's already an AppError, use it as is
    if (error instanceof AppError) {
        return res.redirect(`/error?status=${error.status}&title=${encodeURIComponent(error.title)}&message=${encodeURIComponent(error.message)}&suggestions=${encodeURIComponent(error.suggestions.join('|'))}&authenticated=${req.session && req.session.user ? 'true' : 'false'}`);
    }

    // Handle MongoDB errors
    if (error.name === 'ValidationError') {
        const validationError = new ValidationError('The data you provided is invalid. Please check your input and try again.');
        return res.redirect(`/error?status=${validationError.status}&title=${encodeURIComponent(validationError.title)}&message=${encodeURIComponent(validationError.message)}&suggestions=${encodeURIComponent(validationError.suggestions.join('|'))}&authenticated=${req.session && req.session.user ? 'true' : 'false'}`);
    }

    if (error.name === 'CastError') {
        const notFoundError = new NotFoundError('The requested data could not be found or is invalid.');
        return res.redirect(`/error?status=${notFoundError.status}&title=${encodeURIComponent(notFoundError.title)}&message=${encodeURIComponent(notFoundError.message)}&suggestions=${encodeURIComponent(notFoundError.suggestions.join('|'))}&authenticated=${req.session && req.session.user ? 'true' : 'false'}`);
    }

    if (error.code === 11000) {
        const conflictError = new ConflictError('This information already exists in our system.');
        return res.redirect(`/error?status=${conflictError.status}&title=${encodeURIComponent(conflictError.title)}&message=${encodeURIComponent(conflictError.message)}&suggestions=${encodeURIComponent(conflictError.suggestions.join('|'))}&authenticated=${req.session && req.session.user ? 'true' : 'false'}`);
    }

    // Default error
    const defaultError = new AppError('Something went wrong on our end. Please try again later.');
    
    // Add debug information in development
    let errorUrl = `/error?status=${defaultError.status}&title=${encodeURIComponent(defaultError.title)}&message=${encodeURIComponent(defaultError.message)}&suggestions=${encodeURIComponent(defaultError.suggestions.join('|'))}&authenticated=${req.session && req.session.user ? 'true' : 'false'}`;
    
    if (process.env.NODE_ENV === 'development') {
        errorUrl += `&debug=${encodeURIComponent(error.stack || error.message || error.toString())}`;
    }
    
    return res.redirect(errorUrl);
};

// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    handleError,
    asyncHandler
}; 