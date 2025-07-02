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
const openairoutes = require("./routes/openai");
const metaroutes = require("./routes/meta");
const authRoutes = require("./routes/auth");
const smtpRoutes = require("./routes/smtp");
const flowRoutes = require("./routes/flow");
const protectedRoutes = require("./routes/protected");
const packageRoutes = require("./routes/package");
const widgetRoutes = require("./routes/widget");
const embedRoutes = require("./routes/embed");
const chatbotRoutes = require("./routes/chatbot");
const app = express();


// Connect to MongoDB and Start Server
const startServer = async () => {
  try {
    await connectMongoDB();

    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    process.on('unhandledRejection', (err) => {
      console.error('Unhandled Rejection:', err);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error('Startup Error:', error);
    process.exit(1);
  }
};

// Middleware & Security
app.use(express.static(path.join(__dirname, 'public')));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["*"],
      scriptSrc: ["'self'", "http://localhost:5000", "http://localhost:3000"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: ["'self'", "http://localhost:5000", "http://localhost:3000", "https://back.techrecto.com"],
    },
  },
}));

// app.use(cors({
//   origin: (origin, callback) => {
//     const allowedOrigins = [
//       process.env.FRONTEND_URL,
//       "http://localhost:3000",
//             "http://localhost:5000",

//       "https://back.techrecto.com",
//       "http://localhost:3001",
//       "https://back.techrecto.com",
//       "http://localhost",
//       "http://localhost:8000",
//       "https://custom-gpt-backend-sigma.vercel.app",
//       "https://admin-customchatbot-app.vercel.app",
//       "https://custom-gpt-builder-frontend.vercel.app",
//       "https://accounts.google.com",
//     ];
//     console.log(`CORS Origin: ${origin}`);
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       console.error(`CORS blocked: ${origin} not allowed`);
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
// }));
app.use(cors({
  origin: '*', // Allows all domains
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  credentials: false, // Must be false if origin is '*'
}));

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100000,
});
app.use("/api/", limiter);

// app.use(express.json({
//   limit: "10kb",
//   verify: (req, res, buf) => {
//     if (req.originalUrl.includes('/stripe/webhook')) {
//       req.rawBody = buf;
//     }
//   },
// }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(hpp());
app.use("/public", express.static(path.join(__dirname, "public")));

// Import routes
app.use("/api/openai", openairoutes);
app.use("/api/meta", metaroutes);
app.use("/api/auth", authRoutes);
app.use("/api/smtp", smtpRoutes);
app.use("/api/flow", flowRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/package", packageRoutes);
app.use("/api/widget", widgetRoutes);
app.use("/api/embed", embedRoutes);
app.use("/api/chatbot", chatbotRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(httpStatus.OK).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Static files for production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

// 404 & error handlers
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});
app.use(errorConverter);
app.use(errorHandler);

// Start server only after setting everything
startServer();
