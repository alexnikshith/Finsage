import { configureStore, combineReducers } from '@reduxjs/toolkit';
import financeReducer from '../features/finance/financeSlice';
import authReducer from '../features/auth/authSlice';
import api from '../services/api';

const appReducer = combineReducers({
  finance: financeReducer,
  auth: authReducer,
});

const rootReducer = (state, action) => {
  if (action.type === 'auth/logout') {
    state = undefined;
  }
  return appReducer(state, action);
};

// Sync Debouncer
let syncTimeout = null;

// Middleware to persist state to localStorage and prepare for Cloud Sync
const persistenceMiddleware = store => next => action => {
  const result = next(action);
  const state = store.getState();
  
  // 🚨 CRITICAL FIX: Do not save during the login action itself!
  // The login action wipes the state (Nuclear Reset). If we save here, 
  // we accidentally overwrite the user's real saved data with an empty state!
  if (action.type !== 'auth/loginSuccess' && action.type !== 'auth/logout') {
    if (state.auth.isAuthenticated && state.auth.user?.email) {
      const userData = {
        finance: state.finance,
        auth: state.auth
      };
      
      // 1. Instant Local Backup
      localStorage.setItem(`finsage_data_${state.auth.user.email}`, JSON.stringify(userData));
      localStorage.setItem('finsage_last_user', state.auth.user.email);

      // 2. Debounced Cloud Sync
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(async () => {
        try {
            await api.post('/sync/push', { finance: state.finance });
            console.log("☁️ Cloud Sync Successful");
        } catch (e) {
            console.warn("☁️ Cloud Sync Pending (Offline or DB Down)");
        }
      }, 2000); // Wait 2 seconds of inactivity before pushing to cloud
    }
  }

  if (action.type === 'auth/logout') {
    localStorage.removeItem('finsage_last_user');
    localStorage.removeItem('finsage_token');
    if (syncTimeout) clearTimeout(syncTimeout);
  }
  
  return result;
};

const loadState = () => {
  try {
    const lastUser = localStorage.getItem('finsage_last_user');
    if (lastUser) {
      const serializedState = localStorage.getItem(`finsage_data_${lastUser}`);
      if (serializedState === null) return undefined;
      const parsed = JSON.parse(serializedState);
      if (!parsed.auth || !parsed.finance) return undefined;
      return parsed;
    }
  } catch (err) {
    return undefined;
  }
  return undefined;
};

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: loadState(),
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(persistenceMiddleware),
});
