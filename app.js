require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const flash = require("connect-flash");
const session = require("express-session");
const helmet = require("helmet");
const logger = require("morgan");
const cookie = require("cookie-parser");
const MongoStore = require("connect-mongo");

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware - Cookie parser must come before session
app.use(cookie(process.env.SESSION_SECRET || 'fallback_secret'));

// Session configuration with production-specific settings
const isProduction = process.env.NODE_ENV === "production";
const domain = process.env.DOMAIN || undefined;

// Enhanced session configuration for production
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_session_secret_here',
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management',
      ttl: 24 * 60 * 60, // 1 day
      autoRemove: 'native', // Enable automatic removal of expired sessions
      touchAfter: 24 * 3600 // Only update session once per day
    }),
    saveUninitialized: false,
    resave: false,
    rolling: true, // Extend session on each request
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours (increased from 1 hour)
      sameSite: isProduction ? "none" : "lax",
      httpOnly: true,
      secure: isProduction, // Must be true in production for HTTPS
      path: '/',
      domain: domain, // Only set if DOMAIN env var is provided
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // Explicit expiration
    },
    name: 'connect.sid', // Explicitly set session cookie name
    unset: 'destroy' // Destroy session when unset
  })
);

// Add session debugging middleware
app.use((req, res, next) => {
  // Log session creation and cookie setting
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    if (req.session && req.session.user) {
      console.log(`🔐 Session created for user: ${req.session.user.role} - ${req.session.user.firstName || req.session.user.studentId || req.session.user.email}`);
      console.log(`🍪 Session ID: ${req.sessionID}`);
      console.log(`📅 Session expires: ${new Date(Date.now() + 60 * 60 * 1000).toISOString()}`);
    }
    originalEnd.call(this, chunk, encoding);
  };
  next();
});

// Enhanced cookie debugging middleware
app.use((req, res, next) => {
  // Log incoming cookies with detailed parsing info
  if (req.headers.cookie) {
    console.log(`🍪 Raw cookies: ${req.headers.cookie}`);
    console.log(`🍪 Parsed cookies:`, req.cookies);
    console.log(`🍪 Session cookie: ${req.cookies['connect.sid'] || 'Not found'}`);
    
    // Check cookie size
    const cookieSize = Buffer.byteLength(req.headers.cookie, 'utf8');
    console.log(`🍪 Cookie size: ${cookieSize} bytes`);
    if (cookieSize > 4000) {
      console.warn('⚠️  Large cookie detected - may cause issues');
    }
  } else {
    console.log(`🍪 No incoming cookies`);
  }
  
  // Intercept Set-Cookie headers
  const originalSetHeader = res.setHeader;
  res.setHeader = function(name, value) {
    if (name.toLowerCase() === 'set-cookie') {
      console.log(`🍪 Setting cookie: ${value}`);
    }
    return originalSetHeader.call(this, name, value);
  };
  
  next();
});

// CORS configuration - must come after session
app.use(cors())

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(logger("dev"));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "http:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
}));

// Add path and user to res.locals for all views
app.use((req, res, next) => {
  res.locals.path = req.path;
  res.locals.user = req.session.user || null;
  next();
});

// Static Files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "node_modules/bootstrap/dist")));

// Routes
app.use("/", require("./routes/routes"));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Connect to MongoDB with better error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database: ${process.env.MONGODB_URI ? 'Production' : 'Local'}`);
    console.log(`🍪 Session Secret: ${process.env.SESSION_SECRET ? 'Set' : 'Using default'}`);
    console.log(`🔒 Cookie Secure: ${isProduction}`);
    console.log(`🌐 Cookie SameSite: ${isProduction ? 'none' : 'lax'}`);
    console.log(`🏠 Domain: ${domain || 'auto'}`);
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
