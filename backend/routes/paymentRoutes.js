const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createOrder, verifyPayment, getSubscriptionStatus } = require('../controllers/paymentController');

router.post('/create-order', auth, createOrder);
router.post('/verify', auth, verifyPayment);
router.get('/status', auth, getSubscriptionStatus);

module.exports = router;
