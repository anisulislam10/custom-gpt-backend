// models/ApiConfig.js
const mongoose = require('mongoose');

const apiConfigSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  provider: { type: String, required: true },
  openai: {
    apiKey: String,
    model: String,
  },
  deepseek: {
    apiKey: String,
    model: String,
  },
  gemini: {
    apiKey: String,
    model: String,
  },
});

module.exports = mongoose.model('ApiConfig', apiConfigSchema);