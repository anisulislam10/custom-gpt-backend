const Subscription = require('../models/subscription');

const checkSubscription = async (req, res, next) => {
    try {
      // Assume userId comes from an authenticated user (e.g., req.user from JWT or session)
      const userId = req.user?.id || req.body?.userId;
  
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
  
      const subscription = await Subscription.findOne({ userId });
  
      if (!subscription || subscription.status !== 'active' || new Date() > subscription.currentPeriodEnd) {
        return res.status(403).json({ error: 'Active subscription required' });
      }
  
      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  };
module.exports = checkSubscription;