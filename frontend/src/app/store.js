import { configureStore, combineReducers } from '@reduxjs/toolkit';
import financeReducer from '../features/finance/financeSlice';
import authReducer from '../features/auth/authSlice';

const appReducer = combineReducers({
  finance: financeReducer,
  auth: authReducer,
});

const rootReducer = (state, action) => {
  // Nuclear Reset: If we log out, wipe everything
  if (action.type === 'auth/logout') {
    state = undefined;
  }
  
  // Nuclear Switch: If we log in, we must ensure the finance state is fresh 
  // before the new user's data is potentially loaded or saved.
  if (action.type === 'auth/loginSuccess') {
    // We keep the auth part but reset finance to force a clean slate
    return appReducer({
      auth: state.auth,
      finance: undefined // This forces financeSlice to use its initialState
    }, action);
  }

  return appReducer(state, action);
};

// Middleware to persist state to localStorage and prepare for Cloud Sync
const persistenceMiddleware = store => next => action => {
  const result = next(action);
  const state = store.getState();
  
  if (state.auth.isAuthenticated && state.auth.user?.email) {
    const userData = {
      finance: state.finance,
      auth: state.auth
    };
    localStorage.setItem(`finsage_data_${state.auth.user.email}`, JSON.stringify(userData));
    localStorage.setItem('finsage_last_user', state.auth.user.email);
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
