// Vercel Serverless Entry Point
// This file exports the Express app so Vercel can run it as a serverless function
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
}));
app.use(helmet());

// Connect to MongoDB (cached for serverless warm restarts)
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }
};

// Ensure DB is connected before handling requests
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Routes
app.use('/api/auth', require('../routes/authRoutes'));
app.use('/api/transactions', require('../routes/transactionRoutes'));
app.use('/api/sync', require('../routes/syncRoutes'));
app.use('/api/ai', require('../routes/aiRoutes'));
app.use('/api/payments', require('../routes/paymentRoutes'));

app.get('/api', (req, res) => {
  res.json({ message: 'FinSage API is running' });
});

module.exports = app;
