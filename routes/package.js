
const express = require('express');
const router = express.Router();
const Package = require('../models/packages');
const Stripe = require('stripe');
const Transaction = require('../models/transaction');
const Subscription = require('../models/subscription');
require('dotenv').config();


const endpointSecret = "whsec_f80841051f53073cb2c4666115497b901963eb44ddf7e08571739e0a9d09581c";

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
  
  // Create Checkout Session
//   router.post('/stripe/create-checkout-session', async (req, res) => {
//     try {
//       const { packageId, userId } = req.body; // Assume userId is sent from frontend (requires authentication)
  
//       if (!userId) {
//         return res.status(401).json({ error: 'User authentication required' });
//       }
  
//       const pkg = await Package.findOne({ packageId });
//       if (!pkg) {
//         return res.status(404).json({ error: 'Package not found' });
//       }
  
//       const session = await stripe.checkout.sessions.create({
//         payment_method_types: ['card'],
//         line_items: [
//           {
//             price: pkg.stripePriceId,
//             quantity: 1,
//           },
//         ],
//         mode: pkg.billingPeriod === 'month' || pkg.billingPeriod === 'year' ? 'subscription' : 'payment',
//         success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`,
//         cancel_url: `http://localhost:3000/cancel`,
//         metadata: {
//           packageId,
//           userId,
//         },
//       });
  
//       // Save pending transaction
//       const transaction = new Transaction({
//         userId,
//         packageId,
//         stripeSessionId: session.id,
//         amount: pkg.price,
//         currency: pkg.currency,
//         status: 'pending',
//       });
//       await transaction.save();
  
//       res.json({ sessionId: session.id });
//     } catch (error) {
//       console.error('Error creating checkout session:', error);
//       res.status(500).json({ error: 'Failed to create checkout session' });
//     }
//   });
//  // routes/package.js
// // routes/package.js
// router.post(
//     '/stripe/webhook',
//     express.raw({ type: 'application/json' }),
//     async (req, res) => {
//         const { type, data } = req.body;
//   if (type === 'checkout.session.completed') {
//     const session = data.object;
//     const transaction = await Transaction.findOne({ stripeSessionId: session.id });
//     if (transaction) {
//       transaction.status = 'completed';
//       transaction.stripeSubscriptionId = session.subscription; // If applicable
//       await transaction.save();
//     }
//   }
//       const sig = req.headers['stripe-signature'];
//       const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
//       let event;
  
//       try {
//         event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
//       } catch (err) {
//         console.error('Webhook signature verification failed:', err.message);
//         return res.status(400).send(`Webhook Error: ${err.message}`);
//       }
  
//       switch (event.type) {
//         case 'checkout.session.completed':
//           const session = event.data.object;
//           const { packageId, userId } = session.metadata;
  
//           // Update transaction status
//           const transaction = await Transaction.findOneAndUpdate(
//             { stripeSessionId: session.id },
//             { status: 'completed', stripeSubscriptionId: session.subscription },
//             { new: true }
//           );
  
//           if (session.subscription) {
//             // Fetch subscription details from Stripe
//             const subscription = await stripe.subscriptions.retrieve(session.subscription);
  
//             // Save or update subscription
//             await Subscription.findOneAndUpdate(
//               { userId },
//               {
//                 userId,
//                 packageId,
//                 stripeSubscriptionId: session.subscription,
//                 status: subscription.status === 'active' ? 'active' : 'expired',
//                 currentPeriodEnd: new Date(subscription.current_period_end * 1000),
//                 updatedAt: new Date(),
//               },
//               { upsert: true, new: true }
//             );
//           }
//           break;
  
//         case 'invoice.paid':
//           const invoice = event.data.object;
//           const subscriptionId = invoice.subscription;
  
//           // Update subscription status and period
//           const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
//           await Subscription.findOneAndUpdate(
//             { stripeSubscriptionId: subscriptionId },
//             {
//               status: stripeSub.status === 'active' ? 'active' : 'expired',
//               currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
//               updatedAt: new Date(),
//             }
//           );
//           break;
  
//         case 'invoice.payment_failed':
//           const failedInvoice = event.data.object;
//           await Subscription.findOneAndUpdate(
//             { stripeSubscriptionId: failedInvoice.subscription },
//             { status: 'expired', updatedAt: new Date() }
//           );
//           break;
  
//         case 'customer.subscription.deleted':
//           const deletedSub = event.data.object;
//           await Subscription.findOneAndUpdate(
//             { stripeSubscriptionId: deletedSub.id },
//             { status: 'canceled', updatedAt: new Date() }
//           );
//           break;
  
//         default:
//           console.log(`Unhandled event: ${event.type}`);
//       }
  
//       res.json({ received: true });
//     }
//   );
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
      success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:3000/cancel`,
      metadata: {
        packageId,
        userId,
      },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});


router.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
  const sig = request.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || endpointSecret;

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const { packageId, userId } = session.metadata;

        // Verify payment status
        if (session.payment_status === 'paid' || session.status === 'complete') {
          const pkg = await Package.findOne({ packageId });
          if (!pkg) {
            console.error('Package not found:', packageId);
            break;
          }

          // Save transaction
          const transaction = new Transaction({
            userId,
            packageId,
            stripeSessionId: session.id,
            stripeSubscriptionId: session.subscription || null,
            amount: pkg.price,
            currency: pkg.currency,
            status: 'completed',
          });
          await transaction.save();

          // Save or update subscription (for recurring payments)
          if (session.subscription) {
            const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
            await Subscription.findOneAndUpdate(
              { userId },
              {
                userId,
                packageId,
                stripeSubscriptionId: session.subscription,
                status: stripeSub.status === 'active' ? 'active' : 'expired',
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                updatedAt: new Date(),
              },
              { upsert: true, new: true }
            );
          }

          console.log(`Transaction and subscription saved for user ${userId}, package ${packageId}`);
        }
        break;

      case 'invoice.paid':
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        // Update subscription status
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: subscriptionId },
          {
            status: stripeSub.status === 'active' ? 'active' : 'expired',
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            updatedAt: new Date(),
          }
        );
        console.log(`Subscription ${subscriptionId} updated to active`);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: failedInvoice.subscription },
          { status: 'expired', updatedAt: new Date() }
        );
        console.log(`Subscription ${failedInvoice.subscription} marked as expired`);
        break;

      case 'customer.subscription.deleted':
        const deletedSub = event.data.object;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: deletedSub.id },
          { status: 'canceled', updatedAt: new Date() }
        );
        console.log(`Subscription ${deletedSub.id} canceled`);
        break;

      case 'checkout.session.async_payment_failed':
        console.log('Async payment failed for session:', event.data.object.id);
        break;

      case 'checkout.session.async_payment_succeeded':
        console.log('Async payment succeeded for session:', event.data.object.id);
        break;

      case 'checkout.session.expired':
        console.log('Checkout session expired:', event.data.object.id);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (err) {
    console.error('Error processing webhook event:', err.message);
  }

  // Acknowledge receipt of the event
  response.status(200).json({ received: true });
});

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