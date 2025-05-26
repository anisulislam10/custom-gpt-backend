const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  packageId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, required: true, default: 'usd' },
  description: { type: String },
  billingPeriod: { type: String, enum: ['month', 'year'], default: 'month' },
  features: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  stripePriceId: { type: String, required: true },
  flowsAllowed: { type: Number, required: true, default: 1, min: 0 }, // New field for allowed flows
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Package', packageSchema);