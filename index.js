require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const httpStatus = require("http-status");
const { errorConverter, errorHandler } = require("./middleware/error");
const ApiError = require("./utils/ApiError");
const connectMongoDB = require('./config/db');
const path = require("path");

// Connect to MongoDB

const startServer = async () => {
  await connectMongoDB(); // Wait for MongoDB connection
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });
};

startServer();
// Import routes
const openAIRouter = require("./routes/openai");
const metaRouter = require("./routes/meta");
const flowRouter = require("./routes/flow");
const authRouter = require('./routes/auth');
const smtpRoutes = require('./routes/smtp');
const protectedRoutes = require('./routes/protected');
const package=require('./routes/package');
const widgetRoutes = require("./routes/widget");
const embedRouter = require('./routes/embed');
const chatbotRoutes = require('./routes/chatbot');

const app = express();

// Security middleware
// Security middleware
// index.js (partial update)
// index.js (partial update)
app.use(express.static(path.join(__dirname, 'public')));

// CSP configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["*"], // Allow all network schemes
      scriptSrc: ["'self'", "http://localhost:5000"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "http://localhost:5000"],
    },
  },
}));

// Enable CORS with logging
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5000",
      "http://localhost",
      "http://localhost:8000",
      "https://custom-gpt-backend-sigma.vercel.app",
      "https://admin-customchatbot-app.vercel.app",
      "https://custom-gpt-builder-frontend.vercel.app/",
      "https://accounts.google.com", // Allow Google's OAuth domain for redirects

    ];
    console.log(`CORS Origin: ${origin}`);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS blocked: ${origin} not allowed`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
}));
// app.use(
//   cors({
//     origin: '*', // Or specify allowed origins, e.g., ['https://example.com']
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     allowedHeaders: ['Content-Type', 'x-api-key'],
//   })
// );
// Rate limiting
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 15 minutes
  max: 100000, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// Body parser
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
// app.use(mongoSanitize());

// Data sanitization against XSS
// app.use(xss());

// Prevent parameter pollution
app.use(hpp());
app.use("/public", express.static(path.join(__dirname, "public")));

// API routes
app.use("/api/openai", openAIRouter);
app.use("/api/meta", metaRouter);
app.use("/api/auth", authRouter);
app.use("/api/smtp", smtpRoutes);
app.use("/api/flow", flowRouter);
app.use("/api/protected", protectedRoutes);
app.use("/api/package", package);
app.use("/api/widget", widgetRoutes);
app.use('/api/embed', embedRouter);
app.use('/api/chatbot', chatbotRoutes);

app.use(express.json({ verify: (req, res, buf) => {
  if (req.originalUrl.includes('/stripe/webhook')) {
    req.rawBody = buf;
  }
} }));
// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(httpStatus.OK).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
  
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

// Handle 404 — This should catch any unmatched routes
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle error
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(() => process.exit(1));
});

module.exports = app;