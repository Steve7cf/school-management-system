require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');

console.log('🔍 Production Session Debug Tool');
console.log('================================');

// Check environment variables
console.log('\n📋 Environment Check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   SESSION_SECRET: ${process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Missing'}`);
console.log(`   DOMAIN: ${process.env.DOMAIN || 'not set'}`);
console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set'}`);

const isProduction = process.env.NODE_ENV === "production";
const domain = process.env.DOMAIN || undefined;

// Create a test app
const app = express();

// Test session configuration (same as production)
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
      domain: domain,
      expires: new Date(Date.now() + 60 * 60 * 1000)
    },
    name: 'connect.sid',
    unset: 'destroy'
  })
);

// Test route to simulate login
app.get('/test-login', (req, res) => {
  console.log('\n🔐 Simulating login...');
  console.log('   Session before:', req.session);
  console.log('   Cookies before:', req.headers.cookie);
  
  // Simulate user session
  req.session.user = {
    id: 'test123',
    firstName: 'Test',
    lastName: 'User',
    role: 'student',
    studentId: 'F10/2024/1234'
  };

  // Force session save
  req.session.save((err) => {
    if (err) {
      console.error('❌ Session save error:', err);
      return res.json({ 
        error: 'Session save failed', 
        details: err.message,
        environment: {
          isProduction,
          domain,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax"
        }
      });
    }
    
    console.log('✅ Session saved successfully');
    console.log('   Session ID:', req.sessionID);
    console.log('   Session after:', req.session);
    
    // Set response headers for debugging
    res.setHeader('X-Session-ID', req.sessionID);
    res.setHeader('X-Environment', isProduction ? 'production' : 'development');
    
    res.json({
      success: true,
      message: 'Login simulation successful',
      sessionId: req.sessionID,
      sessionData: req.session.user,
      cookies: req.headers.cookie,
      environment: {
        isProduction,
        domain,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        httpOnly: true,
        path: '/'
      },
      headers: {
        'Set-Cookie': res.getHeader('Set-Cookie'),
        'X-Session-ID': req.sessionID
      }
    });
  });
});

// Test route to check session persistence
app.get('/check-session', (req, res) => {
  console.log('\n🔍 Checking session...');
  console.log('   Session ID:', req.sessionID);
  console.log('   Session data:', req.session);
  console.log('   Cookies:', req.headers.cookie);
  
  res.json({
    sessionExists: !!req.session,
    sessionId: req.sessionID,
    sessionData: req.session,
    hasUser: !!req.session.user,
    cookies: req.headers.cookie,
    environment: {
      isProduction,
      domain,
      secure: isProduction
    }
  });
});

// Test route to clear session
app.get('/logout', (req, res) => {
  console.log('\n🚪 Simulating logout...');
  
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Session destruction error:', err);
      return res.json({ error: 'Logout failed', details: err.message });
    }
    
    console.log('✅ Session destroyed successfully');
    res.json({ 
      success: true,
      message: 'Logout successful',
      sessionDestroyed: true
    });
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      isProduction,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasMongoUri: !!process.env.MONGODB_URI,
      domain: process.env.DOMAIN
    },
    session: {
      store: 'MongoStore',
      cookieName: 'connect.sid',
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax"
    }
  });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('\n✅ Connected to MongoDB successfully');
  
  const port = 4002; // Use different port
  app.listen(port, () => {
    console.log(`🚀 Production session debug server running on port ${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database: ${process.env.MONGODB_URI ? 'Production' : 'Local'}`);
    
    console.log('\n📋 Test URLs:');
    console.log(`   Health Check: http://localhost:${port}/health`);
    console.log(`   Test Login: http://localhost:${port}/test-login`);
    console.log(`   Check Session: http://localhost:${port}/check-session`);
    console.log(`   Logout: http://localhost:${port}/logout`);
    
    console.log('\n🔧 Session Configuration:');
    console.log(`   Secret: ${process.env.SESSION_SECRET ? '✅ Set' : '❌ Using default'}`);
    console.log(`   Store: MongoStore`);
    console.log(`   Cookie secure: ${isProduction}`);
    console.log(`   Cookie sameSite: ${isProduction ? "none" : "lax"}`);
    console.log(`   Domain: ${domain || 'auto'}`);
    console.log(`   Rolling: true`);
    console.log(`   Max Age: 1 hour`);
    
    console.log('\n💡 Instructions:');
    console.log('   1. Visit /test-login to simulate a login');
    console.log('   2. Check browser cookies for "connect.sid"');
    console.log('   3. Visit /check-session to verify persistence');
    console.log('   4. Visit /logout to clear session');
    console.log('   5. Check server logs for detailed information');
  });
})
.catch((error) => {
  console.error('\n❌ MongoDB connection error:', error);
  process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
}); 