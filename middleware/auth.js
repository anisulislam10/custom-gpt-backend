// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { body, param, validationResult } = require('express-validator');

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log('Auth Middleware - Token:', token, 'User ID:', req.params.userId);
  if (!token) {
    console.error('No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded Token:', decoded);
    req.user = decoded;
    if (req.params.userId && decoded.userId !== req.params.userId) { // Note: Update to decoded.userId
      console.error('User ID mismatch:', decoded.userId, req.params.userId);
      return res.status(401).json({ message: 'Unauthorized: User ID mismatch' });
    }
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token', error: error.message });
  }
};

// Authorization middleware for admin-only routes
const adminMiddleware = async (req, res, next) => {
  try {
    const user = await require('../models/User').findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking user role', error: error.message });
  }
};

// Validate signup/register data
const validateSignup = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Invalid role'),
  body('googleId').optional().isString().withMessage('Invalid Google ID'),
  body('image').optional().isURL().withMessage('Invalid image URL'),
  body('provider')
    .optional()
    .isIn(['local', 'google'])
    .withMessage('Invalid provider'),
  body('active').optional().isBoolean().withMessage('Active must be a boolean'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    next();
  },
];

// Validate login data
const validateLogin = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').notEmpty().withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    next();
  },
];

// Validate user ID parameter
const validateUserId = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    next();
  },
];

// Validate update user data
const validateUpdateUser = [
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Invalid role'),
  body('active').optional().isBoolean().withMessage('Active must be a boolean'),
  body('image').optional().isURL().withMessage('Invalid image URL'),
  body('provider')
    .optional()
    .isIn(['local', 'google'])
    .withMessage('Invalid provider'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  authMiddleware,
  adminMiddleware,
  validateSignup,
  validateLogin,
  validateUserId,
  validateUpdateUser,
};