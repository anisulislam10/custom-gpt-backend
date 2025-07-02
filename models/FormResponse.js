// models/FormResponse.js
const mongoose = require('mongoose');

const formResponseSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  userId: {
    type: String,
    required: true,
    ref: 'User',
  },
  flowId: {
    type: String,
    required: true,
    ref: 'Flow',
  },
  formId: { type: String, required: true },
  formName: { type: String, required: true },
  date: { type: String, required: true },
  submitDate: { type: String, required: true },
  response: { type: mongoose.Schema.Types.Mixed, required: true }, // Explicitly use Mixed for flexibility
}, {
  // Allow additional fields not explicitly defined
  strict: false, // This allows saving fields not defined in the schema
});

module.exports = mongoose.model('FormResponse', formResponseSchema);