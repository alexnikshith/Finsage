const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTPModel = require('../models/OTP');

const JWT_SECRET = 'finsage_ultra_secure_secret_key_2026';

// In-memory OTP cache for Offline/Local Dev Mode
const memoryOTPCache = {};

// Gmail transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error) => {
    if (error) {
        console.error('📧 EMAIL SERVER ERROR:', error.message);
    } else {
        console.log('📧 Email Server is Ready');
    }
});

exports.sendOTP = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const normalizedEmail = email.trim().toLowerCase();
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in MongoDB (works across ALL Vercel instances)
    try {
        await OTPModel.findOneAndUpdate(
            { email: normalizedEmail },
            { otp, expiresAt },
            { upsert: true, new: true }
        );
    } catch (dbErr) {
        console.warn('⚠️ MongoDB Offline. Storing OTP in memory cache:', dbErr.message);
        memoryOTPCache[normalizedEmail] = { otp, expiresAt };
    }

    console.log('\n' + '='.repeat(40));
    console.log(`🔑 OTP FOR: ${normalizedEmail} => ${otp}`);
    console.log('='.repeat(40) + '\n');

    // Send email — awaited for Vercel serverless
    try {
        await transporter.sendMail({
            from: `"FinSage" <${process.env.EMAIL_USER}>`,
            to: normalizedEmail,
            subject: "Your FinSage Access Code",
            text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
            html: `
              <div style="font-family:sans-serif;padding:32px;max-width:420px;margin:auto;background:#fff;border-radius:16px;">
                <h2 style="color:#111;margin-bottom:8px;">FinSage Access Code</h2>
                <p style="color:#555;margin-bottom:24px;">Enter this code to access your workspace:</p>
                <div style="font-size:40px;font-weight:900;letter-spacing:10px;padding:24px;background:#f5f5f5;border-radius:12px;text-align:center;">
                  ${otp}
                </div>
                <p style="color:#999;font-size:12px;margin-top:24px;">Expires in 5 minutes. Ignore if you didn't request this.</p>
              </div>`
        });
        console.log(`✅ OTP Email Sent to: ${normalizedEmail}`);
        res.json({ message: 'OTP sent. Check your inbox.' });
    } catch (err) {
        console.error('📧 Email Failed:', err.message);
        res.json({ message: 'OTP generated. Check server console.' });
    }
};

exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Look up OTP from MongoDB (works across ALL Vercel instances)
    let storedOTP;
    try {
        storedOTP = await OTPModel.findOne({ email: normalizedEmail });
    } catch (dbErr) {
        console.warn('⚠️ MongoDB Offline. Looking up OTP from memory cache:', dbErr.message);
        storedOTP = memoryOTPCache[normalizedEmail];
    }

    if (!storedOTP) return res.status(400).json({ message: 'OTP not requested' });
    if (new Date() > storedOTP.expiresAt) {
        try {
            await OTPModel.deleteOne({ email: normalizedEmail });
        } catch (dbErr) {
            delete memoryOTPCache[normalizedEmail];
        }
        return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    if (storedOTP.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP is valid — delete it
    try {
        await OTPModel.deleteOne({ email: normalizedEmail });
    } catch (dbErr) {
        delete memoryOTPCache[normalizedEmail];
    }

    let user;
    let token;

    try {
        user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            user = await User.create({
                email: normalizedEmail,
                name: normalizedEmail.split('@')[0],
                password: 'otp_user_no_password'
            });
        }

        token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            message: 'Verified successfully',
            token,
            user: { id: user._id, email: user.email, name: user.name }
        });
    } catch (dbError) {
        console.error('Database Error during auth:', dbError.message);
        res.json({
            success: true,
            message: 'Verified (Dev Mode)',
            token: 'dev_token',
            user: { email: normalizedEmail }
        });
    }
};
