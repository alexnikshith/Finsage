import { configureStore, combineReducers } from '@reduxjs/toolkit';
import financeReducer from '../features/finance/financeSlice';
import authReducer from '../features/auth/authSlice';

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

// Middleware to persist state to localStorage and prepare for Cloud Sync
const persistenceMiddleware = store => next => action => {
  const result = next(action);
  const state = store.getState();
  
  // 🚨 CRITICAL FIX: Do not save during the login action itself!
  // The login action wipes the state (Nuclear Reset). If we save here, 
  // we accidentally overwrite the user's real saved data with an empty state!
  if (action.type !== 'auth/loginSuccess' && action.type !== 'auth/logout') {
    if (state.auth.isAuthenticated && state.auth.user?.username) {
      const userData = {
        finance: state.finance,
        auth: state.auth
      };
      localStorage.setItem(`finsage_data_${state.auth.user.username}`, JSON.stringify(userData));
      localStorage.setItem('finsage_last_user', state.auth.user.username);
    }
  }

  if (action.type === 'auth/logout') {
    localStorage.removeItem('finsage_last_user');
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
