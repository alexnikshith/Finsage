import { configureStore } from '@reduxjs/toolkit';
import financeReducer from '../features/finance/financeSlice';
import authReducer from '../features/auth/authSlice';

// Middleware to persist state to localStorage and prepare for Cloud Sync
const persistenceMiddleware = store => next => action => {
  const result = next(action);
  const state = store.getState();
  
  if (state.auth.isAuthenticated && state.auth.user?.email) {
    const userData = {
      finance: state.finance,
      auth: state.auth
    };
    // 1. Local Persistence (Fast)
    localStorage.setItem(`finsage_data_${state.auth.user.email}`, JSON.stringify(userData));
    localStorage.setItem('finsage_last_user', state.auth.user.email);
    
    // 2. Cloud Sync (Async) - If a finance action occurred
    if (action.type.startsWith('finance/')) {
      console.log('☁️ Cloud Sync Triggered for:', action.type);
      // We will implement the actual API call in the background
    }
  }
  
  return result;
};

// Function to load state from localStorage
const loadState = () => {
  try {
    const lastUser = localStorage.getItem('finsage_last_user');
    if (lastUser) {
      const serializedState = localStorage.getItem(`finsage_data_${lastUser}`);
      if (serializedState === null) return undefined;
      const parsed = JSON.parse(serializedState);
      
      // Safety check: Ensure auth and finance slices exist
      if (!parsed.auth || !parsed.finance) {
        console.warn('Incomplete state found in localStorage. Resetting...');
        return undefined;
      }
      
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load state:', err);
    return undefined;
  }
  return undefined;
};

const preloadedState = loadState();

export const store = configureStore({
  reducer: {
    finance: financeReducer,
    auth: authReducer,
  },
  preloadedState,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(persistenceMiddleware),
});
