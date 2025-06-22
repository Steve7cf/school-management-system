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
app.use(cookie());

// Session configuration with production-specific settings
const isProduction = process.env.NODE_ENV === "production";
const domain = process.env.DOMAIN || undefined;

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_session_secret_here',
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management',
      ttl: 24 * 60 * 60, // 1 day
      autoRemove: 'native' // Enable automatic removal of expired sessions
    }),
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
      sameSite: isProduction ? "none" : "lax",
      httpOnly: true,
      secure: isProduction, // Must be true in production for HTTPS
      path: '/',
      domain: domain // Only set if DOMAIN env var is provided
    },
    name: 'connect.sid' // Explicitly set session cookie name
  })
);

// CORS configuration - must come after session
app.use(cors({
  origin: isProduction ? 
    [process.env.FRONTEND_URL || 'https://school-management-system-l01f.onrender.com'] : 
    ['http://localhost:3000', 'http://localhost:4000'],
  credentials: true
}));

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
