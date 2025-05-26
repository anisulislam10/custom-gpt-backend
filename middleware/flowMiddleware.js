// middleware/flowMiddleware.js
const mongoose = require('mongoose');
const Flow = require('../models/Flow');
const { body, param, query, validationResult } = require('express-validator');

// Validate flow data for POST and PUT requests
const validateFlowData = [
  body('nodes').isArray().withMessage('Nodes must be an array'),
  body('edges').isArray().withMessage('Edges must be an array'),
  body('flowName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Flow name must be between 1 and 100 characters'),
  body('websiteDomain')
    .trim()
    .matches(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/)
    .withMessage('Invalid website domain'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    next();
  },
];

// Validate userId and flowId parameters
const validateParams = [
  param('userId').isMongoId().withMessage('Invalid user ID'),
  param('flowId').optional().isMongoId().withMessage('Invalid flow ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    next();
  },
];

// Validate query parameters for check-name
const validateCheckName = [
  query('userId').isMongoId().withMessage('Invalid user ID'),
  query('name').trim().notEmpty().withMessage('Flow name is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    next();
  },
];

// Check if flow exists
const checkFlowExists = async (req, res, next) => {
  try {
    const flow = await Flow.findOne({
      _id: req.params.flowId,
      userId: req.params.userId,
    });
    if (!flow) {
      return res.status(404).json({ message: 'Flow not found' });
    }
    req.flow = flow; // Attach flow to request for use in route handlers
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking flow existence', error: error.message });
  }
};

module.exports = {
  validateFlowData,
  validateParams,
  validateCheckName,
  checkFlowExists,
};