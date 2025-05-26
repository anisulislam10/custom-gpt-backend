// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: function () {
        return this.provider === 'local';
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    googleId: {
      type: String,
      sparse: true,
    },
    image: {
      type: String,
      trim: true,
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    active: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false, // New field to track email verification
    },
    verificationToken: {
      type: String, // Store the verification token
    },
    verificationTokenExpires: {
      type: Date, // Token expiration
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);