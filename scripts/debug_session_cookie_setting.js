require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');

console.log('🔍 Session Cookie Setting Analysis');
console.log('==================================');

// Force production mode for testing
process.env.NODE_ENV = 'production';
const isProduction = process.env.NODE_ENV === "production";

console.log(`\n📋 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   SESSION_SECRET: ${process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing'}`);

const app = express();

// 1. Cookie-parser - PARSE incoming cookies
app.use(cookieParser(process.env.SESSION_SECRET || 'fallback_secret'));

// 2. Express-session - SET session cookies
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret_here',
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management',
    ttl: 24 * 60 * 60,
    autoRemove: 'native'
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
}));

// Debug middleware to show the flow
app.use((req, res, next) => {
  console.log(`\n📥 Request: ${req.method} ${req.url}`);
  
  // What cookie-parser provides
  console.log(`🍪 Cookie-parser parsed cookies:`, req.cookies);
  console.log(`🔐 Session cookie from cookie-parser: ${req.cookies['connect.sid'] || 'Not found'}`);
  
  // What express-session provides
  console.log(`🆔 Express-session ID: ${req.sessionID}`);
  console.log(`👤 Express-session user: ${JSON.stringify(req.session.user)}`);
  
  // Intercept Set-Cookie headers (what express-session sets)
  const originalSetHeader = res.setHeader;
  res.setHeader = function(name, value) {
    if (name.toLowerCase() === 'set-cookie') {
      console.log(`🍪 Express-session SETTING cookie: ${value}`);
    }
    return originalSetHeader.call(this, name, value);
  };
  
  next();
});

// Test route to demonstrate the flow
app.post('/test-session-flow', (req, res) => {
  console.log('\n🔐 Creating session...');
  
  // Express-session will set the cookie
  req.session.user = {
    id: 'test123',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin'
  };
  
  // Force session save
  req.session.save((err) => {
    if (err) {
      console.error('❌ Session save error:', err);
      return res.json({ error: 'Session save failed' });
    }
    
    console.log('✅ Session saved by express-session');
    console.log(`🍪 Session ID: ${req.sessionID}`);
    
    res.json({
      message: 'Session created',
      sessionId: req.sessionID,
      user: req.session.user,
      note: 'Check console for Set-Cookie header'
    });
  });
});

// Test route to read session
app.get('/test-session-read', (req, res) => {
  console.log('\n🔍 Reading session...');
  
  // Cookie-parser provides the session cookie
  console.log(`🍪 Cookie-parser found: ${req.cookies['connect.sid']}`);
  
  // Express-session uses it to restore session
  console.log(`🆔 Express-session ID: ${req.sessionID}`);
  console.log(`👤 Express-session user: ${JSON.stringify(req.session.user)}`);
  
  res.json({
    cookieParserFound: req.cookies['connect.sid'] || 'Not found',
    sessionId: req.sessionID,
    user: req.session.user,
    hasSession: !!req.session.user
  });
});

// Test route to show cookie-parser vs express-session
app.get('/test-cookie-vs-session', (req, res) => {
  console.log('\n🔍 Cookie-parser vs Express-session comparison...');
  
  res.json({
    cookieParser: {
      allCookies: req.cookies,
      sessionCookie: req.cookies['connect.sid'],
      cookieCount: Object.keys(req.cookies).length
    },
    expressSession: {
      sessionId: req.sessionID,
      user: req.session.user,
      hasSession: !!req.session.user
    },
    flow: {
      step1: 'Browser sends Cookie header',
      step2: 'Cookie-parser parses it into req.cookies',
      step3: 'Express-session reads req.cookies["connect.sid"]',
      step4: 'Express-session sets Set-Cookie header in response'
    }
  });
});

const port = 4004;
app.listen(port, () => {
  console.log(`\n🚀 Session cookie analysis server running on port ${port}`);
  console.log(`🌍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  
  console.log('\n📋 Test URLs:');
  console.log(`   POST /test-session-flow - Create session (express-session sets cookie)`);
  console.log(`   GET /test-session-read - Read session (cookie-parser provides cookie)`);
  console.log(`   GET /test-cookie-vs-session - Compare both`);
  
  console.log('\n📝 Test Commands:');
  console.log(`   # Create session (express-session sets cookie)`);
  console.log(`   curl -X POST http://localhost:${port}/test-session-flow -H "Content-Type: application/json" -d '{}' -c cookies.txt`);
  console.log(`   `);
  console.log(`   # Read session (cookie-parser provides cookie)`);
  console.log(`   curl -b cookies.txt http://localhost:${port}/test-session-read`);
  console.log(`   `);
  console.log(`   # Compare both`);
  console.log(`   curl -b cookies.txt http://localhost:${port}/test-cookie-vs-session`);
  
  console.log('\n💡 Key Points:');
  console.log('   • Cookie-parser: PARSE incoming cookies');
  console.log('   • Express-session: SET session cookies');
  console.log('   • Both work together but have different roles');
}); 