import { configureStore, combineReducers } from '@reduxjs/toolkit';
import financeReducer, { sanitizeFinance } from '../features/finance/financeSlice';
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

  const setSyncing = (val) => {
    if (typeof window !== 'undefined') {
      window.isFinsageSyncing = val;
    }
  };
  
  // 🚨 CRITICAL FIX: Do not save during the login action itself!
  // The login action wipes the state (Nuclear Reset). If we save here, 
  // we accidentally overwrite the user's real saved data with an empty state!
  if (action.type !== 'auth/loginSuccess' && action.type !== 'auth/logout' && action.type !== 'finance/markTransactionsSynced') {
    if (state.auth.isAuthenticated && state.auth.user?.email && !state.auth.user?.isGuest) {
      const userData = {
        finance: state.finance,
        auth: state.auth
      };
      
      // 1. Instant Local Backup
      localStorage.setItem(`finsage_data_${state.auth.user.email}`, JSON.stringify(userData));
      localStorage.setItem('finsage_last_user', state.auth.user.email);

      // 2. Cloud Sync: immediate for transaction changes, debounced for everything else
      const isTransactionChange = action.type === 'finance/addTransaction' || action.type === 'finance/deleteTransaction';

      if (isTransactionChange) {
        // Push immediately so refresh / cross-device sees up-to-date data
        if (syncTimeout) clearTimeout(syncTimeout);
        setSyncing(true);
        api.post('/sync/push', { finance: state.finance })
          .then(() => {
            console.log("☁️ Cloud Sync Successful (instant)");
            setSyncing(false);
            store.dispatch({ type: 'finance/markTransactionsSynced' });
          })
          .catch(() => {
            console.warn("☁️ Cloud Sync Pending (Offline or DB Down)");
            setSyncing(false);
          });
      } else {
        // Debounce non-critical state changes (salary, currency, etc.)
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(async () => {
          try {
              setSyncing(true);
              await api.post('/sync/push', { finance: state.finance });
              console.log("☁️ Cloud Sync Successful");
              store.dispatch({ type: 'finance/markTransactionsSynced' });
          } catch (e) {
              console.warn("☁️ Cloud Sync Pending (Offline or DB Down)");
          } finally {
              setSyncing(false);
          }
        }, 2000);
      }
    }
  }

  if (action.type === 'auth/logout') {
    localStorage.removeItem('finsage_last_user');
    localStorage.removeItem('finsage_token');
    localStorage.removeItem('finsage_chat_guest@finsage.local');
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('finsage_chat_guest');
      sessionStorage.removeItem('finsage_guest_queries');
    }
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
      return {
        auth: parsed.auth,
        finance: sanitizeFinance(parsed.finance)
      };
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
