const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Finance State (Perfect Mirror of Redux FinanceSlice)
  monthlySalary: { type: Number, default: 0 },
  isSalarySet: { type: Boolean, default: false },
  currency: { type: String, default: 'INR' },
  locale: { type: String, default: 'en-IN' },
  transactions: { type: Array, default: [] },
  categories: { type: mongoose.Schema.Types.Mixed, default: {} },
  borrows: { type: Array, default: [] },
  notifications: { type: Array, default: [] },
  monthlyReports: { type: Array, default: [] },
  lastResetMonth: { type: Number, default: new Date().getMonth() },
  avatar: String,
  role: { type: String, enum: ['user', 'premium', 'admin'], default: 'user' },
  subscriptionExpiry: { type: Date, default: null },
  preferences: {
    darkMode: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true }
  }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
