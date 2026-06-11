const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/create-order
// Creates a Razorpay order for ₹99/month premium subscription
const createOrder = async (req, res) => {
  try {
    const options = {
      amount: 9900, // ₹99 in paise
      currency: 'INR',
      receipt: `finsage_premium_${req.user.id}_${Date.now()}`,
      notes: {
        userId: req.user.id,
        plan: 'premium_monthly',
      },
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay Create Order Error:', err.message);
    res.status(500).json({ message: 'Failed to create payment order. Please try again.' });
  }
};

// POST /api/payments/verify
// Verifies Razorpay HMAC signature, upgrades user to premium for 30 days
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification fields.' });
    }

    // Verify HMAC SHA256 signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
    }

    // Upgrade user role to premium for 30 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        role: 'premium',
        subscriptionExpiry: expiryDate,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      success: true,
      message: 'Payment verified! You are now a Premium member.',
      role: user.role,
      subscriptionExpiry: user.subscriptionExpiry,
    });
  } catch (err) {
    console.error('Razorpay Verify Payment Error:', err.message);
    res.status(500).json({ message: 'Payment verification failed. Please contact support.' });
  }
};

// GET /api/payments/status
// Returns current user's subscription status
const getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role subscriptionExpiry');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const now = new Date();
    const isActive = user.role === 'premium' && user.subscriptionExpiry && user.subscriptionExpiry > now;

    // Auto-downgrade if subscription expired
    if (user.role === 'premium' && user.subscriptionExpiry && user.subscriptionExpiry <= now) {
      await User.findByIdAndUpdate(req.user.id, { role: 'user' });
      return res.json({ role: 'user', subscriptionExpiry: null, isActive: false });
    }

    res.json({
      role: user.role,
      subscriptionExpiry: user.subscriptionExpiry,
      isActive,
    });
  } catch (err) {
    console.error('Get Subscription Status Error:', err.message);
    res.status(500).json({ message: 'Failed to fetch subscription status.' });
  }
};

module.exports = { createOrder, verifyPayment, getSubscriptionStatus };
