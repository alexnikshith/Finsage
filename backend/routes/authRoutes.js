const express = require('express');
const router = express.Router();
const { login, register, sendOTP, verifyOTP } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);

// Legacy routes for graceful degradation
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

module.exports = router;
