// models/Flow.js
const mongoose = require('mongoose');

const flowSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  websiteDomain: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function (v) {
        // Basic URL validation
        return /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(v);
      },
      message: props => `${props.value} is not a valid domain!`
    }
  },
  nodes: {
    type: Array,
    required: true
  },
  edges: {
    type: Array,
    required: true
  }
}, { 
  timestamps: true,
  autoIndex: false
});

// Ensure one flow per website domain per user
flowSchema.index({ userId: 1, websiteDomain: 1 }, { 
  unique: true,
  partialFilterExpression: { 
    websiteDomain: { $exists: true, $gt: '' } 
  }
});

// Index for userId and name uniqueness
flowSchema.index({ userId: 1, name: 1 }, { 
  unique: true,
  partialFilterExpression: { 
    name: { $exists: true, $gt: '' } 
  }
});

module.exports = mongoose.model('Flow', flowSchema)