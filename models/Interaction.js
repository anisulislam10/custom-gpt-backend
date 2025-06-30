// models/Interaction.js
const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  flowId: { type: String, required: true },
  nodeId: { type: String, default: null },
  userInput: { type: mongoose.Mixed, default: null },
  botResponse: { type: String, required: true },
  date: { type: String, required: true }, // Store date as YYYY-MM-DD
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Interaction', interactionSchema);