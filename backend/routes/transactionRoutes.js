const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth'); // Assuming you have an auth middleware

// @route   GET api/transactions
// @desc    Get all user transactions
// @access  Private
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/transactions
// @desc    Add new transaction
// @access  Private
router.post('/', async (req, res) => {
  const { title, amount, type, category, date, note, source, merchant, confidenceScore, receiptImageUrl } = req.body;

  try {
    const newTransaction = new Transaction({
      title,
      amount,
      type,
      category,
      date,
      note,
      source,
      merchant,
      confidenceScore,
      receiptImageUrl,
      userId: req.user.id
    });

    const transaction = await newTransaction.save();
    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/transactions/:id
// @desc    Delete transaction
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) return res.status(404).json({ msg: 'Transaction not found' });
    if (transaction.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await transaction.deleteOne(); // Use deleteOne() since remove() is deprecated in modern Mongoose
    res.json({ msg: 'Transaction removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
