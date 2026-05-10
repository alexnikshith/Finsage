import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  monthlySalary: 0,
  isSalarySet: false,
  currency: 'INR',
  locale: 'en-IN',
  currentMonth: new Date().getMonth(),
  lastResetMonth: new Date().getMonth(),
  transactions: [],
  borrows: [],
  notifications: [
    { id: 1, title: 'Welcome to FinSage', message: 'Your financial intelligence engine is active.', date: new Date().toISOString(), read: false, type: 'info' }
  ],
  monthlyReports: [],
  categories: [
    { id: 'food', label: 'Food & Dining', icon: '🍔', color: '#ffffff' },
    { id: 'rent', label: 'Rent & Bills', icon: '🏠', color: '#e5e7eb' },
    { id: 'transport', label: 'Transport', icon: '🚗', color: '#d1d5db' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#9ca3af' },
    { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#6b7280' },
    { id: 'health', label: 'Health & Medical', icon: '🏥', color: '#4b5563' },
    { id: 'other', label: 'Other', icon: '📦', color: '#374151' },
  ],
};

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    setMonthlySalary: (state, action) => {
      state.monthlySalary = action.payload;
      state.isSalarySet = true;
    },
    addTransaction: (state, action) => {
      // Safety: Always ensure array exists
      if (!Array.isArray(state.transactions)) {
        state.transactions = [];
      }
      
      const { amount, title, description, category, type, date } = action.payload;
      
      const newTransaction = {
        id: Date.now(),
        title: title || description || 'Manual Entry',
        amount: Number(amount) || 0,
        description: description || '',
        category: category || 'other',
        type: type || 'expense',
        date: date || new Date().toISOString()
      };

      state.transactions.push(newTransaction);
    },
    deleteTransaction: (state, action) => {
      state.transactions = state.transactions.filter(t => t.id !== action.payload);
    },
    resetFinance: (state) => {
      return { ...initialState, isSalarySet: state.isSalarySet, monthlySalary: state.monthlySalary };
    },
    updateCurrency: (state, action) => {
      state.currency = action.payload.currency;
      state.locale = action.payload.locale;
    },
    addBorrow: (state, action) => {
      const { amount, source, date } = action.payload;
      
      // Safety initialization for old data
      if (!state.borrows) state.borrows = [];
      if (!state.transactions) state.transactions = [];

      const newBorrow = {
        id: Date.now(),
        amount: Number(amount),
        remainingAmount: Number(amount),
        source,
        date: date || new Date().toISOString(),
        status: 'pending'
      };
      
      state.borrows.push(newBorrow);
      
      // Also add as a positive transaction (inflow)
      state.transactions.push({
        id: `borrow-${newBorrow.id}`,
        amount: Number(amount),
        description: `Borrowed from ${source}`,
        category: 'other',
        type: 'income',
        date: newBorrow.date
      });
    },
    repayBorrow: (state, action) => {
      const { borrowId, repayAmount } = action.payload;
      
      if (!state.borrows) state.borrows = [];
      if (!state.transactions) state.transactions = [];

      const borrow = state.borrows.find(b => b.id === borrowId);
      if (borrow) {
        const amountToRepay = Number(repayAmount);
        borrow.remainingAmount -= amountToRepay;
        
        if (borrow.remainingAmount <= 0) {
          borrow.remainingAmount = 0;
          borrow.status = 'paid';
        }
        
        // Add repayment as an expense
        state.transactions.push({
          id: `repay-${Date.now()}`,
          amount: amountToRepay,
          description: `Repayment to ${borrow.source}`,
          category: 'other',
          type: 'expense',
          date: new Date().toISOString()
        });
      }
    },
    markNotificationsRead: (state) => {
      state.notifications.forEach(n => n.read = true);
    },
    startNewMonth: (state) => {
      const now = new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const reportMonth = monthNames[state.lastResetMonth];
      
      // 1. Generate Report for the month that just ended
      const monthTransactions = state.transactions.filter(t => new Date(t.date).getMonth() === state.lastResetMonth);
      const totalSpent = monthTransactions.reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0);
      const totalEarned = monthTransactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : 0), 0);
      
      const report = {
        id: Date.now(),
        month: reportMonth,
        year: now.getFullYear(),
        spent: totalSpent,
        earned: totalEarned,
        salary: state.monthlySalary,
        savings: (state.monthlySalary + totalEarned) - totalSpent,
        date: now.toISOString()
      };
      
      state.monthlyReports.push(report);
      
      // 2. Add notification about the report
      state.notifications.push({
        id: Date.now(),
        title: `${reportMonth} Report Ready`,
        message: `Your report for ${reportMonth} is ready. Total spent: ${totalSpent}. Click to view insights.`,
        date: now.toISOString(),
        read: false,
        type: 'success'
      });

      // 3. Reset for the new month
      state.lastResetMonth = now.getMonth();
      state.isSalarySet = false; // This will trigger the salary prompt
    }
  },
});

export const { 
  setMonthlySalary, 
  addTransaction, 
  deleteTransaction, 
  resetFinance, 
  updateCurrency,
  addBorrow,
  repayBorrow,
  markNotificationsRead,
  startNewMonth
} = financeSlice.actions;

export const selectFinanceStats = (state) => {
  const finance = state.finance || {};
  const monthlySalary = finance.monthlySalary || 0;
  const transactions = finance.transactions || [];
  const borrows = finance.borrows || [];
  const notifications = finance.notifications || [];
  const monthlyReports = finance.monthlyReports || [];
  const currency = finance.currency || 'INR';
  const locale = finance.locale || 'en-IN';
  
  const totalExpenses = transactions.reduce((sum, t) => sum + (t.type === 'expense' ? (t.amount || 0) : 0), 0);
  const totalInflow = transactions.reduce((sum, t) => sum + (t.type === 'income' ? (t.amount || 0) : 0), 0);
  const totalDebt = borrows.reduce((sum, b) => sum + (b.remainingAmount || 0), 0);
  const unreadNotifications = notifications.filter(n => !n.read).length;
  
  const remainingBalance = (monthlySalary || 0) + totalInflow - totalExpenses;

  const categorySpending = (transactions || []).reduce((acc, t) => {
    if (t && t.category && t.type === 'expense') {
      acc[t.category] = (acc[t.category] || 0) + (t.amount || 0);
    }
    return acc;
  }, {});

  return {
    monthlySalary: monthlySalary || 0,
    totalExpenses,
    totalInflow,
    totalDebt,
    remainingBalance,
    categorySpending,
    notifications,
    unreadNotifications,
    monthlyReports,
    currency: currency || 'INR',
    locale: locale || 'en-IN'
  };
};

export default financeSlice.reducer;
