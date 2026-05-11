const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Temporary in-memory OTP store (In production, use Redis)
const otpStore = new Map();

// Configure transporter for real Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendOTP = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore.set(email, { otp, expires: Date.now() + 300000 }); // 5 min expiry

    // CLEAR VISIBILITY IN TERMINAL (Instant)
    console.log('\n' + '='.repeat(40));
    console.log(`🔑 FINSAGE AUTH CODE FOR: ${email}`);
    console.log(`👉 YOUR OTP IS: ${otp}`);
    console.log('='.repeat(40) + '\n');

    // Respond IMMEDIATELY to the user so they don't wait for SMTP
    res.json({ message: 'OTP generated. Check your inbox or console.' });

    // Send email in the background
    transporter.sendMail({
        from: '"FinSage Auth" <auth@finsage.com>',
        to: email,
        subject: "Your FinSage Access Code",
        text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
        html: `<div style="font-family: sans-serif; padding: 20px;">
                <h2 style="color: #000;">FinSage Access Code</h2>
                <p>Enter the following code to access your workspace:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 20px; background: #f4f4f4; border-radius: 10px; display: inline-block;">
                    ${otp}
                </div>
                <p style="color: #666; font-size: 12px; margin-top: 20px;">If email delivery fails, check the server terminal for the code.</p>
              </div>`
    }).catch(error => {
        console.error('Background Email Delivery Failed:', error.message);
    });
};

exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    const storedData = otpStore.get(email);

    if (!storedData) return res.status(400).json({ message: 'OTP not requested' });
    if (Date.now() > storedData.expires) {
        otpStore.delete(email);
        return res.status(400).json({ message: 'OTP expired' });
    }

    if (storedData.otp === otp) {
        otpStore.delete(email);
        
        let user;
        let token;

        try {
            // Find or create user in MongoDB
            user = await User.findOne({ email });
            if (!user) {
                user = await User.create({ 
                    email, 
                    name: email.split('@')[0], 
                    password: 'otp_user_no_password' // Placeholder for model requirement
                });
            }

            // Generate JWT Token
            token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
            
            res.json({ 
                success: true, 
                message: 'Verified successfully',
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name
                }
            });
        } catch (dbError) {
            console.error('Database Error during auth:', dbError.message);
            // Fallback for development if MongoDB is not connected
            res.json({ 
                success: true, 
                message: 'Verified (Dev Mode - No Database)',
                token: 'dev_token',
                user: { email }
            });
        }
    } else {
        res.status(400).json({ message: 'Invalid OTP' });
    }
};
