
const express = require('express');
const router = express.Router();
const Package = require('../models/packages');
const Stripe = require('stripe');
const Transaction = require('../models/transaction');
const Subscription = require('../models/subscription');
require('dotenv').config();


  
  // Create a package
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
router.get('/getpackages', async (req, res) => {
    try {
      const packages = await Package.find().sort({ createdAt: -1 });
      res.json(packages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch packages' });
    }
  });
router.get('/getpackage', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId in query params' });
    }

    const transaction = await Transaction.findOne({ userId });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found for this user' });
    }

    const packageData = await Package.findOne({ packageId: transaction.packageId });

    if (!packageData) {
      return res.status(404).json({ error: 'Package not found for this packageId' });
    }

    const userPackage = {
      packageId: transaction.packageId,
      name: packageData.name,
      flowsAllowed: packageData.flowsAllowed,
      billingPeriod: packageData.billingPeriod,
    };

    res.json({ transaction, userPackage });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
})

  // Create a package
  router.post('/savepackages', async (req, res) => {
    try {
      const {
        name,
        price,
        currency = 'usd',
        description,
        billingPeriod = 'month',
        features = [],
        flowsAllowed,
        isActive = true,
      } = req.body;
  
      const packageId = `pkg_${name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`;
  
      // Create Stripe Product
      const product = await stripe.products.create({
        name,
        description: description || `Subscription for ${name}`,
      });
  
      // Create Stripe Price
      const stripePrice = await stripe.prices.create({
        product: product.id,
        unit_amount: price * 100, // Stripe expects amount in cents
        currency,
        recurring: { interval: billingPeriod },
      });
  
      // Save package with Stripe Price ID
      const pkg = new Package({
        packageId,
        name,
        price,
        currency,
        description,
        billingPeriod,
        features,
        isActive,
        flowsAllowed,
        stripePriceId: stripePrice.id,
      });
  
      await pkg.save();
      res.status(201).json(pkg);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to create package' });
    }
  });
  router.post('/stripe/create-checkout-session', async (req, res) => {
  try {
    const { packageId, userId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const pkg = await Package.findOne({ packageId });
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: pkg.stripePriceId,
          quantity: 1,
        },
      ],
      mode: pkg.billingPeriod === 'month' || pkg.billingPeriod === 'year' ? 'subscription' : 'payment',
      success_url: `https://techrecto.com/packages?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://techrecto.com/cancel`,
      metadata: {
        packageId,
        userId,
      },
      // customer_creation: 'always',
    });

    console.log('Checkout session created:', {
      sessionId: session.id,
      payment_status: session.payment_status,
      packageId,
      userId,
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});


router.post('/stripe/verify-checkout-session', async (req, res) => {
  try {
    const { sessionId, userId } = req.body;

    if (!sessionId || !userId) {
      return res.status(400).json({ error: 'sessionId and userId are required' });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid' && session.status === 'complete') {
      const { packageId, userId: sessionUserId } = session.metadata;

      // Verify userId matches
      if (sessionUserId !== userId) {
        return res.status(403).json({ error: 'User ID mismatch' });
      }

      // Fetch package details
      const pkg = await Package.findOne({ packageId });
      if (!pkg) {
        return res.status(404).json({ error: 'Package not found' });
      }

      // Check if transaction already exists to avoid duplicates
      const existingTransaction = await Transaction.findOne({ stripeSessionId: sessionId });
      if (existingTransaction) {
        console.log('Transaction already exists:', sessionId);
        return res.json({ success: true, message: 'Transaction already processed' });
      }

      // Save transaction
      const transaction = new Transaction({
        userId,
        packageId,
        stripeSessionId: sessionId,
        amount: pkg.price,
        currency: pkg.currency || 'usd',
        status: 'completed',
      });
      await transaction.save();

      console.log('Transaction saved:', {
        userId,
        packageId,
        stripeSessionId: sessionId,
        amount: pkg.price,
      });

      // Optionally update user subscription (if you have a User or Subscription model)
      // await User.updateOne({ _id: userId }, { subscription: { packageId, status: 'active' } });

      res.json({ success: true, message: 'Payment verified and transaction saved' });
    } else {
      console.log('Payment not completed:', {
        sessionId,
        payment_status: session.payment_status,
        status: session.status,
      });
      res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (error) {
    console.error('Error verifying checkout session:', error);
    res.status(500).json({ error: 'Failed to verify checkout session' });
  }
});
  // Create Checkout Session
  // router.post('/stripe/create-checkout-session', async (req, res) => {
  //   try {
  //     const { packageId, userId } = req.body; // Assume userId is sent from frontend (requires authentication)
  
  //     if (!userId) {
  //       return res.status(401).json({ error: 'User authentication required' });
  //     }
  
  //     const pkg = await Package.findOne({ packageId });
  //     if (!pkg) {
  //       return res.status(404).json({ error: 'Package not found' });
  //     }
  
  //     const session = await stripe.checkout.sessions.create({
  //       payment_method_types: ['card'],
  //       line_items: [
  //         {
  //           price: pkg.stripePriceId,
  //           quantity: 1,
  //         },
  //       ],
  //       mode: pkg.billingPeriod === 'month' || pkg.billingPeriod === 'year' ? 'subscription' : 'payment',
  //       success_url: `https://techrecto.com/success?session_id={CHECKOUT_SESSION_ID}`,
  //       cancel_url: `https://techrecto.com/cancel`,
  //       metadata: {
  //         packageId,
  //         userId,
  //       },
  //     });
  
  //     // Save pending transaction
  //     const transaction = new Transaction({
  //       userId,
  //       packageId,
  //       stripeSessionId: session.id,
  //       amount: pkg.price,
  //       currency: pkg.currency,
  //       status: 'pending',
  //     });
  //     await transaction.save();
  
  //     res.json({ sessionId: session.id });
  //   } catch (error) {
  //     console.error('Error creating checkout session:', error);
  //     res.status(500).json({ error: 'Failed to create checkout session' });
  //   }
  // });
 // routes/package.js
// routes/package.js
router.post(
    '/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        const { type, data } = req.body;
  if (type === 'checkout.session.completed') {
    const session = data.object;
    const transaction = await Transaction.findOne({ stripeSessionId: session.id });
    if (transaction) {
      transaction.status = 'completed';
      transaction.stripeSubscriptionId = session.subscription; // If applicable
      await transaction.save();
    }
  }
      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
      let event;
  
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
  
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          const { packageId, userId } = session.metadata;
  
          // Update transaction status
          const transaction = await Transaction.findOneAndUpdate(
            { stripeSessionId: session.id },
            { status: 'completed', stripeSubscriptionId: session.subscription },
            { new: true }
          );
  
          if (session.subscription) {
            // Fetch subscription details from Stripe
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
  
            // Save or update subscription
            await Subscription.findOneAndUpdate(
              { userId },
              {
                userId,
                packageId,
                stripeSubscriptionId: session.subscription,
                status: subscription.status === 'active' ? 'active' : 'expired',
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                updatedAt: new Date(),
              },
              { upsert: true, new: true }
            );
          }
          break;
  
        case 'invoice.paid':
          const invoice = event.data.object;
          const subscriptionId = invoice.subscription;
  
          // Update subscription status and period
          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
          await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: subscriptionId },
            {
              status: stripeSub.status === 'active' ? 'active' : 'expired',
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
              updatedAt: new Date(),
            }
          );
          break;
  
        case 'invoice.payment_failed':
          const failedInvoice = event.data.object;
          await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: failedInvoice.subscription },
            { status: 'expired', updatedAt: new Date() }
          );
          break;
  
        case 'customer.subscription.deleted':
          const deletedSub = event.data.object;
          await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: deletedSub.id },
            { status: 'canceled', updatedAt: new Date() }
          );
          break;
  
        default:
          console.log(`Unhandled event: ${event.type}`);
      }
  
      res.json({ received: true });
    }
  );
  
  router.put('/updatepackages/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
  
      const pkg = await Package.findByIdAndUpdate(id, updateData, { new: true });
  
      if (!pkg) {
        return res.status(404).json({ error: 'Package not found' });
      }
  
      res.json(pkg);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to update package' });
    }
  });
  
  // Delete a package
  router.delete('/deletepackages/:packageId', async (req, res) => {
    try {
      const { packageId } = req.params;
      const pkg = await Package.findOneAndDelete({ packageId });
      if (!pkg) {
        return res.status(404).json({ error: 'Package not found' });
      }
      res.json({ message: 'Package deleted successfully' });
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete package' });
    }
  });
  

  module.exports = router;