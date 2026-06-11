import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const payload = action.payload || {};
      const email = typeof payload === 'string' ? payload : payload.email;
      const isGuest = payload && typeof payload === 'object' ? !!payload.isGuest : false;
      const role = (payload && payload.role) || 'user';
      const subscriptionExpiry = (payload && payload.subscriptionExpiry) || null;
      state.user = { email, isGuest, role, subscriptionExpiry };
      state.isAuthenticated = true;
      state.loading = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    // Called after successful Razorpay payment verification
    setPremium: (state, action) => {
      if (state.user) {
        state.user.role = 'premium';
        state.user.subscriptionExpiry = action.payload.subscriptionExpiry || null;
      }
    },
    // Called when subscription expires or is downgraded
    setFreemium: (state) => {
      if (state.user) {
        state.user.role = 'user';
        state.user.subscriptionExpiry = null;
      }
    },
  },
});

export const { loginSuccess, logout, setLoading, setPremium, setFreemium } = authSlice.actions;
export default authSlice.reducer;
