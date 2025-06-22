# Permission Denied Troubleshooting Guide

## Problem Description

Users are getting "Permission Denied" errors when navigating the offcanvas menu in production, despite being able to log in successfully.

## Root Cause Analysis

The issue is likely caused by:

1. **Session Data Loss**: User session data is not being properly maintained across requests
2. **JWT Token Issues**: JWT tokens are not being properly decoded or user data is incomplete
3. **Role Information Missing**: User role information is not being properly set in the session
4. **Cookie Configuration**: Production cookie settings may be causing authentication issues

## Solutions Implemented

### 1. Enhanced User Data Middleware

**File**: `app.js` - Updated the middleware that sets `res.locals.user`

- Now checks both session and JWT tokens
- Falls back to JWT token data if session is missing
- Merges userInfo cookie data with JWT data
- Provides better error handling and logging

### 2. Improved Authentication Middleware

**File**: `middleware/auth.js` - Enhanced authentication checks

- Added validation for required user data fields
- Better error handling for JWT token verification
- Comprehensive logging for debugging permission issues
- Automatic cleanup of invalid tokens

### 3. Debug Endpoint

**File**: `routes/routes.js` - Added `/api/user-info` endpoint

- Provides detailed information about user authentication state
- Shows session, cookie, and JWT token status
- Helps identify where authentication is failing

### 4. Enhanced Role-Based Middleware

**File**: `middleware/auth.js` - Added debugging to role checks

- Logs detailed information when access is denied
- Shows session state, user data, and role information
- Helps identify why specific routes are failing

## Debugging Steps

### Step 1: Check User Authentication State

Visit `/api/user-info` in your browser to see the current authentication state:

```bash
curl https://yourdomain.com/api/user-info
```

This will show:
- Session information
- Cookie status
- JWT token validity
- User role and data

### Step 2: Run Debug Script

Use the debug script to test authentication and permissions:

```bash
node scripts/debug_production_permissions.js
```

This will:
- Test login process
- Check cookie setting
- Test access to protected routes
- Identify where permissions are failing

### Step 3: Check Server Logs

Look for these log messages in your production logs:

```
🔐 User restored from JWT: admin - admin@school.com
🔒 Admin access denied: { hasSession: true, hasUser: true, userRole: 'admin' }
❌ Authentication failed - redirecting to login
```

## Common Issues and Solutions

### Issue 1: Session Not Persisting

**Symptoms**: User can log in but gets logged out immediately

**Solutions**:
1. Check MongoDB connection for session store
2. Verify session cookie settings
3. Ensure HTTPS is enabled in production
4. Check domain configuration

### Issue 2: JWT Token Invalid

**Symptoms**: User appears logged in but can't access protected routes

**Solutions**:
1. Verify JWT_SECRET is set correctly
2. Check token expiration
3. Ensure token is being set as cookie
4. Verify token format and structure

### Issue 3: Role Information Missing

**Symptoms**: User authenticated but role is undefined

**Solutions**:
1. Check userInfo cookie is being set
2. Verify JWT token contains role information
3. Ensure user data is complete in database
4. Check authentication function is setting all required fields

### Issue 4: Cookie Configuration Issues

**Symptoms**: Cookies not being set or read properly

**Solutions**:
1. Verify SameSite settings for production
2. Check domain configuration
3. Ensure secure flag is set for HTTPS
4. Verify cookie path and expiration

## Production Configuration Checklist

### Environment Variables

```bash
# Required for production
NODE_ENV=production
SESSION_SECRET=your_very_secure_session_secret
JWT_SECRET=your_very_secure_jwt_secret

# Optional for cross-domain
DOMAIN=yourdomain.com

# Database
MONGODB_URI=mongodb://your-production-db-url
```

### HTTPS Configuration

Ensure your production environment has:
- Valid SSL certificate
- HTTPS enabled
- Proper redirect from HTTP to HTTPS

### Cookie Settings

Verify these cookie settings in production:
- `secure: true` (for HTTPS)
- `sameSite: 'none'` (for cross-domain)
- `httpOnly: true` (for security)
- Proper domain and path

## Testing Commands

### Test Authentication Flow

```bash
# Test JWT functionality
node scripts/test_jwt_cookies.js

# Test permissions and routes
node scripts/debug_production_permissions.js

# Check user info endpoint
curl https://yourdomain.com/api/user-info
```

### Manual Testing Steps

1. **Login Test**:
   - Navigate to login page
   - Login with valid credentials
   - Check browser cookies (F12 → Application → Cookies)
   - Verify dashboard loads

2. **Navigation Test**:
   - Try accessing different menu items
   - Check for permission denied errors
   - Verify user role is displayed correctly

3. **Session Persistence Test**:
   - Refresh the page
   - Close and reopen browser
   - Check if still logged in

## Monitoring and Logging

### Key Log Messages to Monitor

```
✅ User restored from JWT: [role] - [email]
🔐 User authenticated via JWT: [role] - [email]
🔒 [Role] access denied: [debug info]
❌ Authentication failed - redirecting to login
```

### Error Patterns to Watch For

1. **JWT verification failed**: Token issues
2. **Session destruction error**: Session store problems
3. **Cookie not found**: Cookie configuration issues
4. **Role undefined**: User data incomplete

## Quick Fixes

### If Users Can't Access Any Routes

1. Check if JWT_SECRET is set correctly
2. Verify session store is working
3. Check cookie configuration
4. Ensure HTTPS is enabled

### If Specific Routes Fail

1. Check user role in database
2. Verify role-based middleware
3. Check route permissions
4. Test with different user types

### If Session Keeps Expiring

1. Increase session duration
2. Check session store configuration
3. Verify cookie expiration
4. Check for session cleanup issues

## Support Commands

### Get User Information

```bash
# Check current user state
curl -b cookies.txt https://yourdomain.com/api/user-info

# Test specific route
curl -b cookies.txt https://yourdomain.com/students
```

### Debug Session

```bash
# Check session in MongoDB
mongo your-database
db.sessions.find().pretty()

# Check user data
db.admins.find({email: "admin@school.com"})
```

### Monitor Logs

```bash
# Watch for authentication events
tail -f logs/app.log | grep -E "(🔐|🔒|❌)"

# Monitor cookie setting
tail -f logs/app.log | grep "🍪"
```

## Prevention

### Regular Monitoring

1. Set up alerts for authentication failures
2. Monitor session store performance
3. Track user login success rates
4. Monitor cookie-related errors

### Maintenance

1. Regularly rotate JWT secrets
2. Clean up expired sessions
3. Monitor database performance
4. Update SSL certificates

### Testing

1. Regular authentication flow testing
2. Cross-browser compatibility testing
3. Mobile device testing
4. Load testing for session handling 