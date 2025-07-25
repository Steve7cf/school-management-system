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
const JWTService = require("./services/jwtService");
const { handleError } = require("./services/errorService");

// Setup uploads directory
const setupUploads = require("./scripts/setup_uploads");
setupUploads();

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware - Cookie parser must come before session
app.use(cookie(process.env.SESSION_SECRET || "fallback_secret"));

// Session configuration with production-specific settings
const isProduction = process.env.NODE_ENV === "production";
const domain = process.env.DOMAIN || undefined;

// Enhanced session configuration for production
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction && process.env.FORCE_HTTPS !== "false", // Only secure in production with HTTPS
      sameSite: isProduction ? "lax" : "lax", // Use 'lax' for better compatibility
      maxAge: 60 * 60 * 1000, // 1 hour
      domain: domain,
    },
    store: new MongoStore({
      mongoUrl:
        process.env.MONGODB_URI ||
        "mongodb://localhost:27017/school_management",
      ttl: 60 * 60, // 1 hour in seconds
      autoRemove: "native",
    }),
  })
);

// CORS configuration - must come after session
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(logger("dev"));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https:",
          "http:",
        ],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "http:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
      },
    },
  })
);

// Add path and user to res.locals for all views
app.use((req, res, next) => {
  res.locals.path = req.path;

  // First try to get user from session
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
  } else {
    // Fallback to JWT token from cookies
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = JWTService.verifyToken(token);

        // Validate required fields
        if (decoded._id && decoded.role) {
          // Get user info from cookie or decode from token
          let userInfo = null;
          if (req.cookies.userInfo) {
            try {
              userInfo = JSON.parse(req.cookies.userInfo);
            } catch (e) {
              // If userInfo cookie is invalid, use token data
              userInfo = {
                id: decoded._id,
                role: decoded.role,
                email: decoded.email,
              };
            }
          } else {
            // Fallback to token data
            userInfo = {
              id: decoded._id,
              role: decoded.role,
              email: decoded.email,
            };
          }

          // Set user info in res.locals for template access
          res.locals.user = userInfo;

          // Also set in session for consistency
          req.session.user = userInfo;
        }
      } catch (error) {
        // Invalid token - clear it
        res.clearCookie("token");
        res.clearCookie("userInfo");
        res.locals.user = null;
      }
    } else {
      res.locals.user = null;
    }
  }

  next();
});

// Static Files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "node_modules/bootstrap/dist")));

// Routes
app.use("/", require("./routes/routes"));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Log only in development or for errors
    if (process.env.NODE_ENV === "development" || res.statusCode >= 400) {
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${
          res.statusCode
        } - ${duration}ms`
      );
    }
  });

  next();
});

// 404 Error Handler
app.use((req, res, next) => {
  const suggestions = [
    "Check if the URL is spelled correctly",
    "Try navigating from the main menu",
    "Make sure you are logged in if required",
    "Contact support if the problem persists",
  ];

  const errorUrl = `/error?status=404&title=Page Not Found&message=The page you are looking for does not exist.&suggestions=${encodeURIComponent(
    suggestions.join("|")
  )}&authenticated=${req.session && req.session.user ? "true" : "false"}`;
  res.redirect(errorUrl);
});

// Global Error Handler
app.use(handleError);

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/school_management"
  )
  .then(() => {
    console.log("✅ Connected to MongoDB successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Handle MongoDB connection events
mongoose.connection.on("disconnected", () => {
  console.log("⚠️  MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
});
