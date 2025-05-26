const mongoose = require('mongoose');

const SmtpConfigSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // Adjust for auth system
  host: String,
  port: Number,
  username: String,
  password: String,
  secure: Boolean,
});

module.exports = mongoose.model('SmtpConfig', SmtpConfigSchema);