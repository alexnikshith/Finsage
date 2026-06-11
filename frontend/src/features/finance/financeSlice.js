import { createSlice } from '@reduxjs/toolkit';

const getInitialState = () => ({
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
    { id: 'food', label: 'Food', icon: '🍔', color: '#ffffff' },
    { id: 'groceries', label: 'Groceries', icon: '🛒', color: '#e5e7eb' },
    { id: 'transport', label: 'Transportation', icon: '🚗', color: '#d1d5db' },
    { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#9ca3af' },
    { id: 'bills', label: 'Bills', icon: '📄', color: '#6b7280' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#4b5563' },
    { id: 'health', label: 'Healthcare', icon: '🏥', color: '#374151' },
    { id: 'education', label: 'Education', icon: '🎓', color: '#1f2937' },
    { id: 'other', label: 'Others', icon: '📦', color: '#111827' },
  ],
});

const initialState = getInitialState();

export const sanitizeFinance = (finance) => {
  const defaultState = getInitialState();
  if (!finance || typeof finance !== 'object') {
    return defaultState;
  }

  const sanitized = { ...defaultState };

  // Enforce type for basic values
  sanitized.monthlySalary = typeof finance.monthlySalary === 'number' ? finance.monthlySalary : (Number(finance.monthlySalary) || 0);
  sanitized.isSalarySet = typeof finance.isSalarySet === 'boolean' ? finance.isSalarySet : !!finance.isSalarySet;
  sanitized.currency = typeof finance.currency === 'string' && finance.currency ? finance.currency : defaultState.currency;
  sanitized.locale = typeof finance.locale === 'string' && finance.locale ? finance.locale : defaultState.locale;

  const currentMonthNum = Number(finance.currentMonth);
  sanitized.currentMonth = !isNaN(currentMonthNum) ? currentMonthNum : defaultState.currentMonth;

  const lastResetMonthNum = Number(finance.lastResetMonth);
  sanitized.lastResetMonth = !isNaN(lastResetMonthNum) ? lastResetMonthNum : defaultState.lastResetMonth;

  // Categories MUST be a non-empty array
  if (Array.isArray(finance.categories) && finance.categories.length > 0) {
    sanitized.categories = finance.categories.filter(cat => cat && typeof cat === 'object' && cat.id);
    if (sanitized.categories.length === 0) {
      sanitized.categories = defaultState.categories;
    }
  } else {
    sanitized.categories = defaultState.categories;
  }

  // Transactions
  if (Array.isArray(finance.transactions)) {
    sanitized.transactions = finance.transactions.filter(t => t && typeof t === 'object');
  } else {
    sanitized.transactions = [];
  }

  // Borrows
  if (Array.isArray(finance.borrows)) {
    sanitized.borrows = finance.borrows.filter(b => b && typeof b === 'object');
  } else {
    sanitized.borrows = [];
  }

  // Notifications
  if (Array.isArray(finance.notifications)) {
    sanitized.notifications = finance.notifications.filter(n => n && typeof n === 'object');
  } else {
    sanitized.notifications = defaultState.notifications;
  }

  // Monthly Reports
  if (Array.isArray(finance.monthlyReports)) {
    sanitized.monthlyReports = finance.monthlyReports.filter(r => r && typeof r === 'object');
  } else {
    sanitized.monthlyReports = [];
  }

  return sanitized;
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
      
      const { amount, title, description, category, type, date, source, merchant, confidenceScore, receiptImageUrl } = action.payload;
      
      const newTransaction = {
        id: Date.now(),
        title: title || merchant || description || 'Manual Entry',
        amount: Number(amount) || 0,
        description: description || '',
        category: category || 'other',
        type: type || 'expense',
        date: date || new Date().toISOString(),
        source: source || 'manual',
        merchant: merchant || '',
        confidenceScore: confidenceScore !== undefined ? confidenceScore : 1.0,
        receiptImageUrl: receiptImageUrl || '',
        synced: false
      };

      state.transactions.push(newTransaction);
    },
    deleteTransaction: (state, action) => {
      state.transactions = state.transactions.filter(t => t.id !== action.payload);
    },
    resetFinance: (state) => {
      const fresh = getInitialState();
      return { ...fresh, isSalarySet: state.isSalarySet, monthlySalary: state.monthlySalary };
    },
    hardResetFinance: () => {
      return getInitialState();
    },
    hydrateFinance: (state, action) => {
      const remoteFinance = action.payload;
      if (!remoteFinance) return state;

      const sanitizedRemote = sanitizeFinance(remoteFinance);
      const remoteTx = sanitizedRemote.transactions.map(t => ({ ...t, synced: true }));
      const localTx = Array.isArray(state.transactions) ? state.transactions : [];
      const unsyncedLocalTx = localTx.filter(lt => !lt.synced && !remoteTx.some(rt => rt.id === lt.id));
      const mergedTransactions = [...remoteTx, ...unsyncedLocalTx];

      return {
        ...sanitizedRemote,
        transactions: mergedTransactions
      };
    },
    markTransactionsSynced: (state) => {
      if (Array.isArray(state.transactions)) {
        state.transactions.forEach(t => {
          t.synced = true;
        });
      }
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
        date: newBorrow.date,
        synced: false
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
          date: new Date().toISOString(),
          synced: false
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
    },
    addCategory: (state, action) => {
      const { label, icon, color } = action.payload;
      if (!Array.isArray(state.categories)) {
        state.categories = [];
      }
      const newCat = {
        id: `custom-${Date.now()}`,
        label,
        icon: icon || '📦',
        color: color || '#111827',
        isCustom: true
      };
      state.categories.push(newCat);
    },
    updateCategory: (state, action) => {
      const { id, label, icon, color } = action.payload;
      if (!Array.isArray(state.categories)) return;
      const cat = state.categories.find(c => c.id === id && c.isCustom);
      if (cat) {
        cat.label = label;
        cat.icon = icon || cat.icon;
        cat.color = color || cat.color;
      }
    },
    deleteCategory: (state, action) => {
      const catId = action.payload;
      if (!Array.isArray(state.categories)) return;
      
      state.categories = state.categories.filter(cat => cat.id !== catId || !cat.isCustom);
      
      if (Array.isArray(state.transactions)) {
        state.transactions = state.transactions.map(t => {
          if (t.category === catId) {
            return { ...t, category: 'other', synced: false };
          }
          return t;
        });
      }
    }
  },
  extraReducers: (builder) => {
    builder.addCase('auth/loginSuccess', (state, action) => {
      const payload = action.payload || {};
      const isGuest = payload.isGuest;
      
      if (isGuest) {
        console.log("✈️ Guest Mode: Starting fresh in-memory session");
        return getInitialState();
      }

      // Real user login! Capture any in-memory guest transactions
      const guestTransactions = (Array.isArray(state.transactions) && state.transactions.length > 0) 
        ? state.transactions.map(t => ({ ...t, synced: false })) 
        : [];

      let mergedFinance = null;

      // Priority 1: Data passed directly in the action payload (Atomic)
      if (payload.savedFinance) {
        console.log("⚛️ Atomic Hydration: Using data from action payload");
        mergedFinance = sanitizeFinance(payload.savedFinance);
      } else {
        // Priority 2: Fallback to localStorage if payload didn't have it
        const email = typeof payload === 'string' ? payload : payload.email;
        try {
          const savedData = localStorage.getItem(`finsage_data_${email}`);
          if (savedData) {
            const parsed = JSON.parse(savedData);
            if (parsed.finance) {
              console.log("💾 Fallback Hydration: Using data from localStorage");
              mergedFinance = sanitizeFinance(parsed.finance);
            }
          }
        } catch (err) {
          console.error('Failed to load user data during login:', err);
        }
      }

      if (!mergedFinance) {
        mergedFinance = getInitialState();
      }

      // Migrate guest transactions to user account
      if (guestTransactions.length > 0) {
        console.log(`🔄 Migrating ${guestTransactions.length} guest transactions to signed-in user workspace.`);
        mergedFinance.transactions = [
          ...(mergedFinance.transactions || []),
          ...guestTransactions
        ];
      }

      return mergedFinance;
    });

    builder.addCase('auth/logout', () => {
      return getInitialState();
    });
  }
});

export const { 
  setMonthlySalary, 
  addTransaction, 
  deleteTransaction, 
  resetFinance, 
  hardResetFinance,
  hydrateFinance,
  markTransactionsSynced,
  updateCurrency,
  addBorrow,
  repayBorrow,
  markNotificationsRead,
  startNewMonth,
  addCategory,
  updateCategory,
  deleteCategory
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
