const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const connectMongoDB = require("./config/db");

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Debug request headers
app.use((req, res, next) => {
  console.log("Request Headers:", req.headers);
  next();
});

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://165.227.120.144",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5000",
      "http://localhost:8000",
      "https://custom-gpt-backend-sigma.vercel.app",
      "https://admin-customchatbot-app.vercel.app",
      "https://custom-gpt-builder-frontend.vercel.app",
      "https://accounts.google.com",
    ].filter(Boolean);
    console.log(`CORS Origin: ${origin}, URL: ${req.originalUrl}, Method: ${req.method}`);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS blocked: ${origin} not allowed for URL: ${req.originalUrl}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
}));

// Explicit OPTIONS handler for auth routes
app.options("/api/auth/*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});

// CSP configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["*"],
      scriptSrc: ["'self'", "http://165.227.120.144", "http://localhost:5000"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: [
        "'self'",
        "http://165.227.120.144",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5000",
        "http://localhost:8000",
        "https://custom-gpt-backend-sigma.vercel.app",
        "https://admin-customchatbot-app.vercel.app",
        "https://custom-gpt-builder-frontend.vercel.app",
        "https://accounts.google.com",
      ].filter(Boolean),
    },
  },
}));

// Other middleware and routes...
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", require("./routes/auth"));

// Start server
const startServer = async () => {
  await connectMongoDB();
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  });

  process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
    server.close(() => process.exit(1));
  });
};

startServer();