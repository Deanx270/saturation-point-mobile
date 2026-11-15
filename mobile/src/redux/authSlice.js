import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/client';
import {
  saveAuthToken,
  saveAuthUser,
  getAuthToken,
  getAuthUser,
  clearAuthStorage,
} from '../services/secureStoreService';
import { getCurrentPushTokenAsync } from '../services/pushNotificationService';

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStoredAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      const user = await getAuthUser();
      if (token && user) {
        return { token, user };
      }
      return { token: null, user: null };
    } catch (error) {
      return rejectWithValue('Failed to load credentials');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/users/register', credentials);
      const { token, ...user } = response.data;
      await saveAuthToken(token);
      await saveAuthUser(user);
      return { token, user };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Registration failed'
      );
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/users/login', credentials);
      const { token, ...user } = response.data;
      await saveAuthToken(token);
      await saveAuthUser(user);
      return { token, user };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Sign in failed'
      );
    }
  }
);

export const socialLogin = createAsyncThunk(
  'auth/socialLogin',
  async (socialData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/users/social-login', socialData);
      const { token, ...user } = response.data;
      await saveAuthToken(token);
      await saveAuthUser(user);
      return { token, user };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Sign in failed'
      );
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await apiClient.put('/users/profile', profileData);
      await saveAuthUser(response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update profile'
      );
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (providedToken, { rejectWithValue }) => {
    try {
      const pushToken = providedToken || (await getCurrentPushTokenAsync());
      if (pushToken) {
        await apiClient.post('/users/push-token/remove', { pushToken }).catch(() => {});
      }
      await clearAuthStorage();
      return true;
    } catch (error) {
      return rejectWithValue('Sign out failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    loading: false,
    initialLoading: true,
    error: null,
  },
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadStoredAuth.pending, (state) => {
        state.initialLoading = true;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.initialLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(loadStoredAuth.rejected, (state) => {
        state.initialLoading = false;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(socialLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(socialLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(socialLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.error = null;
      });
  },
});

export const { clearAuthError } = authSlice.actions;

export default authSlice.reducer;
