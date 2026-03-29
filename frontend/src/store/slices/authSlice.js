import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// ─── Safe localStorage read ────────────────────────────────────────────────
const getStoredToken = () => {
  try { return localStorage.getItem('accessToken') || null; }
  catch { return null; }
};

const clearStoredTokens = () => {
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  } catch { /* ignore */ }
};

// ─── Async thunks ─────────────────────────────────────────────────────────
export const register = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/register', data);
    localStorage.setItem('accessToken', res.data.data.accessToken);
    localStorage.setItem('refreshToken', res.data.data.refreshToken);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

export const login = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', data);
    localStorage.setItem('accessToken', res.data.data.accessToken);
    localStorage.setItem('refreshToken', res.data.data.refreshToken);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try { await api.post('/auth/logout'); } catch { /* always clear locally */ }
  clearStoredTokens();
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  const token = getStoredToken();
  if (!token) return rejectWithValue('no_token');

  try {
    const res = await api.get('/auth/me');
    return res.data.data.user;
  } catch (err) {
    if (err.response?.status === 401) clearStoredTokens();
    return rejectWithValue(err.response?.data?.message || 'session_expired');
  }
});

export const refreshTokens = createAsyncThunk('auth/refresh', async (_, { rejectWithValue }) => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    const res = await api.post('/auth/refresh', { refreshToken });
    localStorage.setItem('accessToken', res.data.data.accessToken);
    localStorage.setItem('refreshToken', res.data.data.refreshToken);
    return res.data.data;
  } catch (err) {
    clearStoredTokens();
    return rejectWithValue('Session expired');
  }
});

// ─── Slice ────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: getStoredToken(),
    isAuthenticated: false, // Wait for fetchMe or Login to confirm
    loading: false,
    error: null,
    initialized: false, // Unblocks ProtectedRoute once true
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    forceLogout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.initialized = true;
      clearStoredTokens();
    },
  },
  extraReducers: (builder) => {
    // Auth Pending States
    builder.addMatcher(
      (action) => action.type.endsWith('/pending') && !action.type.includes('fetchMe'),
      (state) => { state.loading = true; state.error = null; }
    );

    // Login & Register Fulfilled
    const setAuthSuccess = (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.initialized = true;
    };
    builder.addCase(register.fulfilled, setAuthSuccess);
    builder.addCase(login.fulfilled, setAuthSuccess);

    // Auth Rejected
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.initialized = true;
    });

    // fetchMe
    builder.addCase(fetchMe.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchMe.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.initialized = true;
    });
    builder.addCase(fetchMe.rejected, (state) => {
      state.loading = false;
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.initialized = true; 
    });

    // Refresh
    builder.addCase(refreshTokens.fulfilled, (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
    });
    builder.addCase(refreshTokens.rejected, (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    });
  },
});

export const { clearError, forceLogout } = authSlice.actions;
export default authSlice.reducer;