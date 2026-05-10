const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['expense', 'income'], required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  description: String,
  date: { type: Date, default: Date.now },
  merchant: String,
  paymentMethod: String,
  isRecurring: { type: Boolean, default: false },
  aiMetadata: {
    categorizationConfidence: Number,
    isUnusual: { type: Boolean, default: false },
    suggestedTags: [String]
  }
}, { timestamps: true });

// Index for faster queries
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
