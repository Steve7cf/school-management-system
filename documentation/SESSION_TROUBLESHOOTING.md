# Production Session Troubleshooting Guide

## Problem Description
Sessions are being created and saved in the database, but cookies are not being set in the browser in production.

## Root Causes & Solutions

### 1. HTTPS/SSL Issues
**Problem:** Cookies with `secure: true` won't be set over HTTP
**Solution:** 
- Ensure your production domain uses HTTPS
- Check that `NODE_ENV=production` is set
- Verify SSL certificate is valid

### 2. Cookie Domain Issues
**Problem:** Cookie domain doesn't match your actual domain
**Solution:**
- Set `DOMAIN=your-actual-domain.com` in environment variables
- Or leave it undefined to auto-detect
- Check for subdomain mismatches

### 3. SameSite Cookie Policy
**Problem:** Modern browsers block cross-site cookies
**Solution:**
- Production uses `sameSite: "none"` (requires HTTPS)
- Development uses `sameSite: "lax"`
- Ensure HTTPS is enabled

### 4. Session Secret Issues
**Problem:** Weak or missing session secret
**Solution:**
- Set a strong `SESSION_SECRET` (32+ characters)
- Use different secrets for different environments
- Never use default secret in production

### 5. CORS Configuration
**Problem:** Cross-origin requests blocking cookies
**Solution:**
- Set `FRONTEND_URL` to your actual domain
- Ensure `credentials: true` in CORS
- Check for protocol mismatches (http vs https)

## Environment Variables Checklist

```bash
# Required for production
NODE_ENV=production
SESSION_SECRET=your_very_long_random_secret_key_here
MONGODB_URI=your_mongodb_connection_string

# Optional but recommended
DOMAIN=your-domain.com
FRONTEND_URL=https://your-domain.com
```

## Testing Steps

### 1. Run Debug Script
```bash
node scripts/debug_production_sessions.js
```

### 2. Check Browser Developer Tools
1. Open Developer Tools (F12)
2. Go to Application/Storage tab
3. Look for Cookies section
4. Check for `connect.sid` cookie
5. Verify cookie properties:
   - Domain matches your site
   - Secure flag is set (for HTTPS)
   - HttpOnly is set
   - Path is `/`

### 3. Check Server Logs
Look for these log messages:
```
🔐 Session created for user: student - John
🍪 Session ID: abc123...
📅 Session expires: 2024-01-01T12:00:00.000Z
```

### 4. Test Session Endpoints
```bash
# Health check
curl https://your-domain.com/health

# Test login (if available)
curl -c cookies.txt https://your-domain.com/test-login

# Check session
curl -b cookies.txt https://your-domain.com/check-session
```

## Common Hosting Platform Issues

### Render.com
- Set all environment variables in dashboard
- Ensure `NODE_ENV=production`
- Use HTTPS URLs
- Check service logs for errors

### Heroku
- Use `heroku config:set` for environment variables
- Ensure `NODE_ENV=production` is set
- Check Heroku logs: `heroku logs --tail`

### Vercel
- Set environment variables in dashboard
- May need to adjust CORS settings
- Check function logs in dashboard

### Railway
- Set environment variables in dashboard
- Ensure HTTPS is enabled
- Check deployment logs

## Browser-Specific Issues

### Chrome/Edge
- Check for "Block third-party cookies" setting
- Disable incognito mode for testing
- Check for privacy extensions blocking cookies

### Firefox
- Check "Enhanced Tracking Protection"
- Disable "Block cookies and site data"
- Check for privacy extensions

### Safari
- Check "Prevent cross-site tracking"
- Disable "Block all cookies"
- Check for privacy extensions

## Debugging Commands

### Check Environment Variables
```bash
echo $NODE_ENV
echo $SESSION_SECRET
echo $MONGODB_URI
echo $DOMAIN
```

### Test MongoDB Connection
```bash
# Test connection string
mongosh "your_mongodb_connection_string"

# Check sessions collection
use school_management
db.sessions.find().limit(5)
```

### Test Session Store
```bash
# Run session debug script
node scripts/debug_sessions.js

# Check for session errors
grep -i "session" /var/log/your-app.log
```

## Quick Fixes to Try

### 1. Force Session Save
```javascript
req.session.save((err) => {
  if (err) {
    console.error('Session save error:', err);
    return res.redirect('/login');
  }
  res.redirect('/dashboard');
});
```

### 2. Add Session Debugging
```javascript
app.use((req, res, next) => {
  if (req.session && req.session.user) {
    console.log(`Session: ${req.sessionID} for ${req.session.user.role}`);
  }
  next();
});
```

### 3. Check Cookie Headers
```javascript
app.use((req, res, next) => {
  console.log('Cookies:', req.headers.cookie);
  console.log('Set-Cookie:', res.getHeader('Set-Cookie'));
  next();
});
```

## Production Checklist

- [ ] `NODE_ENV=production` is set
- [ ] `SESSION_SECRET` is a strong random string
- [ ] `MONGODB_URI` is correct and accessible
- [ ] HTTPS is enabled on your domain
- [ ] Domain settings match your actual domain
- [ ] CORS is properly configured
- [ ] Browser accepts cookies (not incognito)
- [ ] No privacy extensions blocking cookies
- [ ] Session store is working (MongoDB)
- [ ] Server logs show session creation

## Emergency Fallback

If sessions still don't work, you can temporarily disable secure cookies:

```javascript
cookie: {
  maxAge: 60 * 60 * 1000,
  sameSite: "lax", // Changed from "none"
  httpOnly: true,
  secure: false, // Changed from true
  path: '/'
}
```

**Warning:** This is less secure and should only be used for debugging.

## Support

If you're still having issues:
1. Run the debug script and share the output
2. Check browser developer tools and share cookie details
3. Share your environment variables (without sensitive values)
4. Check server logs for any error messages 