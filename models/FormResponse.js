// models/FormResponse.js
const mongoose = require('mongoose');

const formResponseSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  formId: { type: String, required: true },
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
    flowId: {
        type: String,
        required: true,
        ref: 'Flow'
    },
  formName: { type: String, required: true },
  date: { type: String, required: true },
  submitDate: { type: String, required: true },
  response: { type: Object, required: true },
});

module.exports = mongoose.model('FormResponse', formResponseSchema);