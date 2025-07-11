// models/Interaction.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const interactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  flowId: { type: String, required: true },
  
  date: { type: String, required: true }, // Store date as YYYY-MM-DD
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String, default: null },
  country: { type: String, default: null },
  uniqueId: { type: String, default: () => uuidv4() },
  chatHistory: { type: Array, default: [] }, // New field for chat history
});

module.exports = mongoose.model('Interaction', interactionSchema);