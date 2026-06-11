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
      state.user = { email, isGuest };
      state.isAuthenticated = true;
      state.loading = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    }
  },
});

export const { loginSuccess, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;
