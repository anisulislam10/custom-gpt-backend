// models/Collaborator.js
const mongoose = require('mongoose');

const collaboratorSchema = new mongoose.Schema({
  flowId: { type: String, required: true, index: true },
  userId: { type: String, required: true, ref: 'User' },
  role: { type: String, required: true, enum: ['collaborator', 'admin'] },
  addedAt: { type: Date, default: Date.now },
});

collaboratorSchema.index({ flowId: 1, userId: 1 }, { unique: true }); // Prevent duplicate collaborators

module.exports = mongoose.model('Collaborator', collaboratorSchema);