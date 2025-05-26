const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Package = require('../models/Package');

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { packageId } = req.body;

    // Get package details
    const package = await Package.findById(packageId);
    if (!package) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: package.currency,
            product_data: {
              name: package.name,
              description: package.description,
            },
            unit_amount: package.price * 100, // Convert to cents
            recurring: {
              interval: package.billingPeriod,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/packages`,
      metadata: {
        packageId: package._id.toString(),
      },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: error.message });
  }
});

// Webhook handler
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      handleCheckoutSession(session);
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      handleInvoicePayment(invoice);
      break;
    // Add other event types as needed
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

async function handleCheckoutSession(session) {
  // Save subscription details to your database
  console.log('Checkout session completed:', session);
}

async function handleInvoicePayment(invoice) {
  // Handle recurring payment success
  console.log('Invoice payment succeeded:', invoice);
}

module.exports = router;