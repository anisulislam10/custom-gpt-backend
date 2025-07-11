// models/Invite.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const inviteSchema = new mongoose.Schema({
  flowId: { type: String, required: true, index: true },
  inviteCode: { type: String, default: () => uuidv4(), unique: true },
  createdBy: { type: String, required: true }, // userId of the creator
  createdAt: { type: Date, default: Date.now, expires: '30d' }, // Auto-expire after 30 days
  active: { type: Boolean, default: true },
  role: { type: String, default: 'collaborator', enum: ['collaborator', 'admin'] }, // Role for invited users
});

module.exports = mongoose.model('Invite', inviteSchema);