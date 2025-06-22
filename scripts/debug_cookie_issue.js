require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const axios = require('axios');

console.log('🔍 Cookie Issue Debug Tool');
console.log('==========================');

// Force production mode for testing
process.env.NODE_ENV = 'production';
const isProduction = process.env.NODE_ENV === "production";

console.log(`\n📋 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   SESSION_SECRET: ${process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Missing'}`);

const app = express();

// Session configuration (same as production)
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_session_secret_here',
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management',
      ttl: 24 * 60 * 60,
      autoRemove: 'native',
      touchAfter: 24 * 3600
    }),
    saveUninitialized: false,
    resave: false,
    rolling: true,
    cookie: {
      maxAge: 60 * 60 * 1000,
      sameSite: isProduction ? "none" : "lax",
      httpOnly: true,
      secure: isProduction,
      path: '/',
      expires: new Date(Date.now() + 60 * 60 * 1000)
    },
    name: 'connect.sid',
    unset: 'destroy'
  })
);

// Cookie debugging middleware
app.use((req, res, next) => {
  console.log(`\n📥 Request: ${req.method} ${req.url}`);
  console.log(`🍪 Incoming cookies: ${req.headers.cookie || 'None'}`);
  console.log(`🌐 User-Agent: ${req.headers['user-agent']}`);
  console.log(`🔗 Referer: ${req.headers.referer || 'None'}`);
  console.log(`🌍 Origin: ${req.headers.origin || 'None'}`);
  
  // Intercept Set-Cookie headers
  const originalSetHeader = res.setHeader;
  res.setHeader = function(name, value) {
    if (name.toLowerCase() === 'set-cookie') {
      console.log(`🍪 SET-COOKIE: ${value}`);
    }
    return originalSetHeader.call(this, name, value);
  };
  
  next();
});

// Test login route
app.post('/test-login', (req, res) => {
  console.log('\n🔐 Simulating admin login...');
  
  // Simulate admin session
  req.session.user = {
    id: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@school.com',
    role: 'admin'
  };

  // Force session save
  req.session.save((err) => {
    if (err) {
      console.error('❌ Session save error:', err);
      return res.json({ error: 'Session save failed', details: err.message });
    }
    
    console.log('✅ Session saved successfully');
    console.log(`🍪 Session ID: ${req.sessionID}`);
    
    // Set response headers for debugging
    res.setHeader('X-Session-ID', req.sessionID);
    res.setHeader('X-Environment', isProduction ? 'production' : 'development');
    
    res.json({
      success: true,
      message: 'Login successful',
      sessionId: req.sessionID,
      sessionData: req.session.user,
      cookieSettings: {
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 1000
      }
    });
  });
});

// Test dashboard route (protected)
app.get('/test-dashboard', (req, res) => {
  console.log('\n🔍 Checking session for dashboard access...');
  console.log(`🍪 Session ID: ${req.sessionID}`);
  console.log(`👤 Session user: ${JSON.stringify(req.session.user)}`);
  
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    console.log('✅ Access granted to dashboard');
    res.json({
      success: true,
      message: 'Dashboard access granted',
      user: req.session.user,
      sessionId: req.sessionID
    });
  } else {
    console.log('❌ Access denied - no valid session');
    res.status(401).json({
      success: false,
      message: 'Access denied - no valid session',
      sessionExists: !!req.session,
      hasUser: !!(req.session && req.session.user),
      userRole: req.session && req.session.user ? req.session.user.role : 'none'
    });
  }
});

// Test cookie route
app.get('/test-cookies', (req, res) => {
  console.log('\n🍪 Testing cookie setting...');
  
  // Set a test cookie
  res.cookie('testCookie', 'testValue', {
    maxAge: 60 * 60 * 1000,
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: '/'
  });
  
  res.json({
    message: 'Test cookie set',
    cookieSettings: {
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      httpOnly: true
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    environment: {
      nodeEnv: process.env.NODE_ENV,
      isProduction,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasMongoUri: !!process.env.MONGODB_URI
    },
    session: {
      store: 'MongoStore',
      cookieName: 'connect.sid',
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax"
    }
  });
});

const port = 4003;
app.listen(port, () => {
  console.log(`\n🚀 Cookie debug server running on port ${port}`);
  console.log(`🌍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  
  console.log('\n📋 Test URLs:');
  console.log(`   Health: http://localhost:${port}/health`);
  console.log(`   Test Cookies: http://localhost:${port}/test-cookies`);
  console.log(`   Test Dashboard: http://localhost:${port}/test-dashboard`);
  
  console.log('\n📝 Test Commands:');
  console.log(`   # Test cookie setting`);
  console.log(`   curl -v http://localhost:${port}/test-cookies`);
  console.log(`   `);
  console.log(`   # Test login (POST)`);
  console.log(`   curl -X POST http://localhost:${port}/test-login -H "Content-Type: application/json" -d '{}' -c cookies.txt`);
  console.log(`   `);
  console.log(`   # Test dashboard with cookies`);
  console.log(`   curl -b cookies.txt http://localhost:${port}/test-dashboard`);
  
  console.log('\n💡 Instructions:');
  console.log('   1. Run the curl commands above');
  console.log('   2. Check if cookies are being set');
  console.log('   3. Verify session persistence');
  console.log('   4. Look for any cookie-related errors');
});

async function debugCookieIssue() {
    const client = axios.create({
        baseURL: 'http://localhost:3000',
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: function (status) {
            return status >= 200 && status < 400; // Accept redirects
        }
    });

    try {
        console.log('🔍 Debugging Cookie Issue...\n');

        // Step 1: Check initial state
        console.log('1. Initial state...');
        console.log('   🍪 Initial cookies:', client.defaults.headers.Cookie || 'None');

        // Step 2: Login and capture response
        console.log('\n2. Attempting login...');
        const loginResponse = await client.post('/login/admin', {
            email: 'admin@school.com',
            password: 'admin123'
        });
        console.log('   📊 Login Status:', loginResponse.status);
        console.log('   📍 Login Redirect:', loginResponse.headers.location);
        
        // Check Set-Cookie headers
        const setCookieHeaders = loginResponse.headers['set-cookie'];
        if (setCookieHeaders) {
            console.log('   🍪 Set-Cookie headers:');
            setCookieHeaders.forEach((cookie, index) => {
                console.log(`      ${index + 1}. ${cookie}`);
            });
        } else {
            console.log('   ❌ No Set-Cookie headers found');
        }

        // Step 3: Check if cookies were set in client
        console.log('\n3. Checking client cookies after login...');
        console.log('   🍪 Client cookies:', client.defaults.headers.Cookie || 'None');

        // Step 4: Try to manually set cookies if they were in headers
        if (setCookieHeaders) {
            console.log('\n4. Manually setting cookies from headers...');
            const cookieStrings = setCookieHeaders.map(cookie => cookie.split(';')[0]);
            client.defaults.headers.Cookie = cookieStrings.join('; ');
            console.log('   🍪 Manually set cookies:', client.defaults.headers.Cookie);
        }

        // Step 5: Test dashboard access
        console.log('\n5. Testing dashboard access...');
        try {
            const dashboardResponse = await client.get('/dashboard/admin');
            console.log('   📊 Dashboard Status:', dashboardResponse.status);
            console.log('   📍 Dashboard Redirect:', dashboardResponse.headers.location);
        } catch (error) {
            console.log('   ❌ Dashboard access failed');
            console.log('   📊 Error Status:', error.response?.status);
            console.log('   📍 Error Redirect:', error.response?.headers?.location);
        }

        console.log('\n🎉 Cookie debug completed!');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Headers:', error.response.headers);
        }
    }
}

debugCookieIssue(); 