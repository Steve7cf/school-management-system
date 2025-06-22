# Production Setup Guide

## Environment Variables for Production

To fix session and cookie issues in production, make sure you have these environment variables set:

### Required Environment Variables

```bash
# Database
MONGODB_URI=your_mongodb_connection_string

# Session
SESSION_SECRET=your_very_long_random_secret_key_here
NODE_ENV=production

# Domain (optional - only set if you have a custom domain)
DOMAIN=your-domain.com

# Frontend URL (optional - for CORS)
FRONTEND_URL=https://your-domain.com
```

### Session Configuration Explained

The app is now configured to handle production sessions properly:

1. **Cookie Settings:**
   - `secure: true` - Only sends cookies over HTTPS (required for production)
   - `sameSite: "none"` - Allows cross-site requests (needed for some hosting platforms)
   - `httpOnly: true` - Prevents XSS attacks
   - `path: '/'` - Cookie available across entire site

2. **Session Store:**
   - Uses MongoDB to store sessions
   - Sessions persist across server restarts
   - Automatic cleanup of expired sessions

### Common Production Issues & Solutions

#### Issue: Sessions not persisting after login
**Solution:** Ensure `NODE_ENV=production` is set

#### Issue: Cookies not being set
**Solution:** 
- Make sure you're using HTTPS in production
- Check that `SESSION_SECRET` is set
- Verify `secure: true` is enabled for production

#### Issue: Login redirects back to login page
**Solution:**
- Check browser console for cookie errors
- Ensure domain settings are correct
- Verify MongoDB connection is working

#### Issue: Cross-origin requests failing
**Solution:**
- Set `FRONTEND_URL` to your actual domain
- Ensure CORS is properly configured

### Testing Production Sessions

1. **Check Environment Variables:**
   ```bash
   echo $NODE_ENV
   echo $SESSION_SECRET
   echo $MONGODB_URI
   ```

2. **Test Session Creation:**
   - Try logging in with a test account
   - Check browser developer tools > Application > Cookies
   - Look for `connect.sid` cookie

3. **Check Server Logs:**
   - Look for session-related console messages
   - Verify MongoDB connection is successful

### Hosting Platform Specific Notes

#### Render.com
- Set all environment variables in the dashboard
- Ensure `NODE_ENV=production`
- Use HTTPS URLs for `FRONTEND_URL`

#### Heroku
- Use `heroku config:set` to set environment variables
- Ensure `NODE_ENV=production` is set

#### Vercel
- Set environment variables in the dashboard
- May need to adjust CORS settings

### Debug Commands

Run these to test session functionality:

```bash
# Test session configuration
node scripts/debug_sessions.js

# Test login with dummy account
node scripts/debug_login.js
```

### Security Best Practices

1. **Session Secret:**
   - Use a long, random string (at least 32 characters)
   - Never commit to version control
   - Use different secrets for different environments

2. **HTTPS:**
   - Always use HTTPS in production
   - Set `secure: true` for cookies

3. **Session Timeout:**
   - Current setting: 1 hour
   - Adjust based on your security requirements

### Troubleshooting Checklist

- [ ] `NODE_ENV=production` is set
- [ ] `SESSION_SECRET` is set and is a long random string
- [ ] `MONGODB_URI` is correct and accessible
- [ ] HTTPS is enabled on your domain
- [ ] Browser accepts cookies (not in incognito mode)
- [ ] No CORS errors in browser console
- [ ] MongoDB connection is successful
- [ ] Session store is working (check MongoDB for sessions collection)

### Example .env for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/school_management
SESSION_SECRET=your_very_long_random_secret_key_here_make_it_at_least_32_characters
DOMAIN=your-domain.com
FRONTEND_URL=https://your-domain.com
PORT=4000
``` 