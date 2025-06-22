# Error Handling System and Image Upload Fixes

## Overview

This document describes the comprehensive error handling system implemented for the School Management System and the fixes for image upload issues in production.

## Error Handling System

### 1. Error Page (`views/error.ejs`)

The error page is a standalone, responsive page that displays user-friendly error messages with:

- **Dynamic Error Information**: Shows different icons and messages based on error type
- **Helpful Suggestions**: Provides actionable steps users can take
- **Debug Information**: Shows technical details in development mode only
- **Navigation Options**: Multiple ways to navigate away from the error

#### Features:
- Responsive design with Bootstrap 5
- Gradient background and modern styling
- Auto-redirect after 30 seconds for certain errors
- Smooth animations and transitions
- URL parameter-based error display

### 2. Error Service (`services/errorService.js`)

A comprehensive error handling service with custom error classes:

#### Error Classes:
- `AppError`: Base error class with status codes and suggestions
- `ValidationError`: For form validation issues (422)
- `AuthenticationError`: For login/access issues (401)
- `AuthorizationError`: For permission issues (403)
- `NotFoundError`: For missing resources (404)
- `ConflictError`: For duplicate entries (409)

#### Features:
- Automatic suggestion generation based on error type
- Consistent error handling across the application
- Development vs production error display
- Async error wrapper for route handlers

### 3. Global Error Handling (`app.js`)

#### 404 Handler:
- Catches all unmatched routes
- Redirects to error page with helpful suggestions
- Preserves authentication status

#### Global Error Handler:
- Uses the error service for consistent handling
- Handles MongoDB errors (ValidationError, CastError, duplicate key errors)
- Provides debug information in development
- Redirects to error page with appropriate parameters

### 4. Error Route (`routes/routes.js`)

Simple route that renders the error page:
```javascript
router.get("/error", (req, res) => {
  res.render("error", { layout: false });
})
```

## Image Upload Fixes

### 1. Upload Directory Setup (`scripts/setup_uploads.js`)

Automated script that:
- Creates uploads directory structure
- Sets proper permissions (755)
- Creates `.gitkeep` file for version control
- Handles Windows vs Unix permission differences

### 2. Enhanced Multer Configuration (`routes/routes.js`)

Improved file upload handling:

#### Features:
- **Directory Creation**: Automatically creates upload directories
- **Session Validation**: Ensures user session exists before upload
- **File Type Validation**: Checks MIME type and file extension
- **Size Limits**: 5MB file size limit
- **Security**: Only allows image files (jpg, jpeg, png, gif, webp)

#### Configuration:
```javascript
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
        
        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Ensure user session exists
        if (!req.session || !req.session.user || !req.session.user.id) {
            return cb(new Error('User session not found'), null);
        }
        
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        const filename = req.session.user.id + '-' + uniqueSuffix + '.' + fileExtension;
        
        cb(null, filename);
    }
});
```

### 3. Profile Controller Improvements (`controllers/profileController.js`)

Enhanced avatar update functionality:

#### Features:
- **Path Validation**: Uses proper path joining for cross-platform compatibility
- **File Existence Check**: Verifies files exist before deletion
- **Directory Creation**: Ensures upload directory exists
- **Error Handling**: Better error messages and logging
- **Session Update**: Updates user session with new avatar path

#### Key Improvements:
```javascript
// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Proper path handling for old avatar deletion
const oldAvatarPath = path.join(__dirname, '..', 'public', user.avatar);
if (fs.existsSync(oldAvatarPath)) {
    fs.unlink(oldAvatarPath, (err) => {
        if (err) console.error("Error deleting old avatar:", err);
    });
}
```

### 4. Automatic Setup (`app.js`)

Uploads directory is automatically created on application startup:
```javascript
// Setup uploads directory
const setupUploads = require('./scripts/setup_uploads');
setupUploads();
```

## Usage Examples

### Throwing Custom Errors

```javascript
const { ValidationError, NotFoundError } = require('../services/errorService');

// In a route handler
if (!user) {
    throw new NotFoundError('User not found');
}

if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email format', [
        'Please enter a valid email address',
        'Check for typos in the email'
    ]);
}
```

### Using Async Error Wrapper

```javascript
const { asyncHandler } = require('../services/errorService');

// Wrap route handlers to automatically catch errors
router.get('/users/:id', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        throw new NotFoundError('User not found');
    }
    res.json(user);
}));
```

### Testing Error Handling

Run the test script to verify error handling:
```bash
node scripts/test_error_handling.js
```

## Production Considerations

### 1. Error Display
- Debug information is only shown in development
- User-friendly messages in production
- No sensitive information exposed

### 2. File Uploads
- Upload directories are created automatically
- Proper file type validation
- Size limits enforced
- Secure file naming

### 3. Logging
- All errors are logged to console
- Error details preserved for debugging
- No sensitive data in logs

### 4. Security
- File type validation prevents malicious uploads
- Session validation ensures authenticated uploads
- Proper path handling prevents directory traversal

## Troubleshooting

### Common Issues

1. **Images not showing in production**
   - Check if uploads directory exists
   - Verify file permissions
   - Ensure static file serving is configured

2. **Upload errors**
   - Check file size (max 5MB)
   - Verify file type (images only)
   - Ensure user is authenticated

3. **Error page not loading**
   - Check if error route is registered
   - Verify error page template exists
   - Check for JavaScript errors

### Debug Commands

```bash
# Check uploads directory
ls -la public/uploads/avatars/

# Test error handling
node scripts/test_error_handling.js

# Check file permissions
chmod 755 public/uploads/avatars/
```

## Future Enhancements

1. **Error Logging**: Implement structured error logging
2. **Email Notifications**: Send error notifications to administrators
3. **Error Analytics**: Track error frequency and types
4. **Image Optimization**: Automatic image resizing and compression
5. **CDN Integration**: Use CDN for image delivery in production

## Conclusion

The error handling system provides a robust, user-friendly way to handle errors across the application, while the image upload fixes ensure reliable file uploads in both development and production environments. The system is designed to be maintainable, secure, and scalable. 