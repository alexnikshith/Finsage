const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/sync', require('./routes/syncRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'FinSage API is running' });
});

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/finsage';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => {
    if (MONGO_URI.includes('<nikshith>')) {
        console.log('\n' + '!'.repeat(60));
        console.log('🚨 CRITICAL SETUP ERROR: DATABASE NOT CONNECTED');
        console.log('👉 You MUST replace <nikshith> with your password in backend/.env');
        console.log('!'.repeat(60) + '\n');
    } else {
        console.error('❌ MongoDB Connection Error:', err.message);
    }
    console.log('⚠️ Server running in OFFLINE mode (Data will not sync between browsers)');
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
