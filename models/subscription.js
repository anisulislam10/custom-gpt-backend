const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  packageId: { type: String, required: true },
  stripeSubscriptionId: { type: String, required: true },
  status: { type: String, enum: ['active', 'canceled', 'expired'], default: 'active' },
  currentPeriodEnd: { type: Date, required: true }, // Tracks expiration
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Subscription', subscriptionSchema);