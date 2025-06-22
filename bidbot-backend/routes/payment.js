const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Middleware to check if Stripe is configured
const checkStripeConfig = (req, res, next) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: 'Stripe configuration is missing' });
    }
    next();
};

// Create a checkout session for one-time payment
router.post('/create-checkout-session', [auth, checkStripeConfig], async (req, res) => {
    try {
        const { amount, accountType, planType } = req.body;
        const userId = req.user.id;

        // Validate amount
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ 
                error: 'Invalid amount',
                message: 'Amount must be a positive number'
            });
        }

        // Convert amount to cents and ensure it's an integer
        const amountInCents = Math.round(parseFloat(amount) * 100);

        // Create a checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${accountType} Plan`,
                        },
                        unit_amount: amountInCents,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment', // One-time payment
            success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
            client_reference_id: userId,
            metadata: {
                userId,
                accountType,
                amount: amount.toString()
            },
        });

        // Immediately update user's account type and subscription status
        await User.findByIdAndUpdate(userId, {
            accountType: accountType,
            planType: planType, 
            subscriptionStatus: 'active',
            subscriptionStartDate: new Date(),
            subscriptionEndDate: planType === "free" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        });

        res.json({ 
            id: session.id,
            success: true,
            accountType: accountType,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ 
            error: 'Error creating checkout session',
            details: error.message 
        });
    }
});

// Verify payment and update user subscription
router.post('/verify-payment', auth, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const userId = req.user.id;

        // Retrieve the checkout session
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // Verify that the session belongs to the user
        if (session.client_reference_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized access to payment session' });
        }

        // Check if payment was successful
        if (session.payment_status === 'paid') {
            res.json({
                success: true,
                accountType: session.metadata.accountType,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            });
        } else {
            res.status(400).json({ 
                error: 'Payment not completed',
                status: session.payment_status 
            });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Error verifying payment' });
    }
});

// Webhook to handle Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
            const subscription = event.data.object;
            await handleSubscriptionChange(subscription);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

// Helper function to handle subscription changes
async function handleSubscriptionChange(subscription) {
    try {
        const user = await User.findOne({ subscriptionId: subscription.id });
        if (!user) return;

        await User.findByIdAndUpdate(user._id, {
            subscriptionStatus: subscription.status,
            subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        });
    } catch (error) {
        console.error('Error handling subscription change:', error);
    }
}

module.exports = router; 