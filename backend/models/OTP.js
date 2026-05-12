const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 0 } // TTL index auto-deletes
});

module.exports = mongoose.model('OTP', OTPSchema);
