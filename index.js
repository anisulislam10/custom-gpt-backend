require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const httpStatus = require('http-status');
const { errorConverter, errorHandler } = require('./middleware/error');
const ApiError = require('./utils/ApiError');
const connectMongoDB = require('./config/db');
const path = require('path');
const openairoutes = require('./routes/openai');
const metaroutes = require('./routes/meta');
const authRoutes = require('./routes/auth');
const smtpRoutes = require('./routes/smtp');
const flowRoutes = require('./routes/flow');
const protectedRoutes = require('./routes/protected');
const packageRoutes = require('./routes/package');
const widgetRoutes = require('./routes/widget');
const embedRoutes = require('./routes/embed');
const chatbotRoutes = require('./routes/chatbot');
const inviteRoutes = require('./routes/invite');

const app = express();

// Middleware & Security
app.use(cors({
  origin: '*', // Or specify allowed origins like ['https://techrecto.com', 'http://localhost:3000']
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: false, // Set to true if you need credentials, but origin cannot be '*'
}));
app.use(helmet()); // Security headers
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/chatbot', cors(), express.static(path.join(__dirname, 'public', 'api', 'chatbot'))); // Serve chatbot scripts with CORS

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100000, // Adjust as needed
});
app.use('/api/', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());

// Routes
app.use('/api/openai', openairoutes);
app.use('/api/meta', metaroutes);
app.use('/api/auth', authRoutes);
app.use('/api/smtp', smtpRoutes);
app.use('/api/flow', flowRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/package', packageRoutes);
app.use('/api/widget', widgetRoutes);
app.use('/api/embed', embedRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/invites', inviteRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(httpStatus.OK).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Static files for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// 404 & Error Handlers
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});
app.use(errorConverter);
app.use(errorHandler);

// Start Server
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

startServer();