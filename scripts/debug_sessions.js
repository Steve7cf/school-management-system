require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');

// Create a test app
const app = express();

// Test session configuration
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_session_secret_here',
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management',
      ttl: 24 * 60 * 60, // 1 day
      autoRemove: 'native'
    }),
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      domain: process.env.NODE_ENV === "production" ? undefined : undefined,
    },
    name: 'connect.sid'
  })
);

// Test route to set session
app.get('/test-session', (req, res) => {
  console.log('🔍 Session before setting:', req.session);
  console.log('🍪 Cookies before setting:', req.headers.cookie);
  
  // Set test session data
  req.session.testData = {
    userId: 'test123',
    role: 'test',
    timestamp: new Date().toISOString()
  };
  
  // Force session save
  req.session.save((err) => {
    if (err) {
      console.error('❌ Session save error:', err);
      return res.json({ error: 'Session save failed', details: err.message });
    }
    
    console.log('✅ Session saved successfully');
    console.log('🔍 Session after setting:', req.session);
    
    res.json({
      message: 'Session set successfully',
      sessionId: req.sessionID,
      sessionData: req.session.testData,
      cookies: req.headers.cookie,
      sessionStore: req.sessionStore ? 'MongoStore connected' : 'No session store'
    });
  });
});

// Test route to read session
app.get('/read-session', (req, res) => {
  console.log('🔍 Reading session:', req.session);
  console.log('🍪 Reading cookies:', req.headers.cookie);
  console.log('🆔 Session ID:', req.sessionID);
  
  res.json({
    sessionExists: !!req.session,
    sessionData: req.session,
    sessionId: req.sessionID,
    cookies: req.headers.cookie,
    hasTestData: !!req.session.testData
  });
});

// Test route to destroy session
app.get('/destroy-session', (req, res) => {
  console.log('🗑️ Destroying session...');
  
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Session destruction error:', err);
      return res.json({ error: 'Session destruction failed', details: err.message });
    }
    
    console.log('✅ Session destroyed successfully');
    res.json({ message: 'Session destroyed successfully' });
  });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  
  const port = 4001; // Use different port to avoid conflicts
  app.listen(port, () => {
    console.log(`🚀 Session test server running on port ${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database: ${process.env.MONGODB_URI ? 'Production' : 'Local'}`);
    console.log('\n📋 Test URLs:');
    console.log(`   http://localhost:${port}/test-session`);
    console.log(`   http://localhost:${port}/read-session`);
    console.log(`   http://localhost:${port}/destroy-session`);
    console.log('\n🔧 Session Configuration:');
    console.log(`   Secret: ${process.env.SESSION_SECRET ? 'Set' : 'Using default'}`);
    console.log(`   Store: MongoStore`);
    console.log(`   Cookie secure: ${process.env.NODE_ENV === "production"}`);
    console.log(`   Cookie sameSite: ${process.env.NODE_ENV === "production" ? "none" : "lax"}`);
  });
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
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