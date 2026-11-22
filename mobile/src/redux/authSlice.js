import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Platform } from 'react-native';
import apiClient from '../api/client';
import {
  saveAuthToken,
  saveAuthUser,
  getAuthToken,
  getAuthUser,
  clearAuthStorage,
} from '../services/secureStoreService';
import {
  getCurrentPushTokenAsync,
  registerForPushNotificationsAsync,
} from '../services/pushNotificationService';

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
      if (response.data?.requiresVerification) {
        return {
          requiresVerification: true,
          emailSent: response.data.emailSent !== false,
          email: response.data.email,
          message: response.data.message,
        };
      }
      const { token, ...user } = response.data;
      await saveAuthToken(token);
      await saveAuthUser(user);
      return { token, user };
    } catch (error) {
      if (error.response?.data?.isEmailVerified === false) {
        return rejectWithValue({
          message:
            error.response.data.message ||
            'This email is already registered and awaiting verification.',
          isEmailVerified: false,
          email: error.response.data.email || credentials.email,
        });
      }
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
      if (error.response?.data?.isEmailVerified === false) {
        return rejectWithValue({
          message:
            error.response.data.message ||
            'Please verify your email address before signing in.',
          isEmailVerified: false,
          email:
            error.response.data.email ||
            credentials.email ||
            credentials.identifier,
        });
      }
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Sign in failed'
      );
    }
  }
);

export const resendVerification = createAsyncThunk(
  'auth/resendVerification',
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/users/resend-verification', {
        email,
      });
      return response.data;
    } catch (error) {
      if (error.response?.data?.retryAfterSeconds) {
        return rejectWithValue({
          message:
            error.response.data.message ||
            `Please wait ${error.response.data.retryAfterSeconds} seconds before requesting another confirmation link.`,
          retryAfterSeconds: error.response.data.retryAfterSeconds,
        });
      }
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          'Failed to resend verification email'
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
  async (profileData, { getState, rejectWithValue }) => {
    try {
      const response = await apiClient.put('/users/profile', profileData);
      const currentUser = getState().auth.user || {};
      const mergedUser = { ...currentUser, ...response.data };
      await saveAuthUser(mergedUser);
      return mergedUser;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update profile'
      );
    }
  }
);

export const syncPushToken = createAsyncThunk(
  'auth/syncPushToken',
  async ({ requestPermission = false } = {}, { getState }) => {
    const { token } = getState().auth;
    if (!token || Platform.OS === 'web') {
      return null;
    }
    const pushToken = requestPermission
      ? await registerForPushNotificationsAsync()
      : await getCurrentPushTokenAsync();
    if (!pushToken) {
      return null;
    }
    await apiClient
      .post('/users/push-token', {
        pushToken,
        device: Platform.OS,
      })
      .catch(() => {});
    return pushToken;
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
    signingOut: false,
    signOutPromptVisible: false,
    authNotice: null,
    error: null,
  },
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    requestSignOut: (state) => {
      state.signOutPromptVisible = true;
    },
    cancelSignOut: (state) => {
      state.signOutPromptVisible = false;
    },
    clearAuthNotice: (state) => {
      state.authNotice = null;
    },
    showAuthNotice: (state, action) => {
      const payload =
        typeof action.payload === 'string'
          ? { message: action.payload, tone: 'success' }
          : action.payload || {};
      if (payload.message) {
        state.authNotice = {
          key: Date.now(),
          message: payload.message,
          tone: payload.tone || 'success',
        };
      }
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
        if (action.payload?.requiresVerification) {
          state.token = null;
          state.user = null;
        } else {
          state.token = action.payload.token;
          state.user = action.payload.user;
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error =
          typeof action.payload === 'object' && action.payload?.message
            ? action.payload.message
            : action.payload;
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
        state.error =
          typeof action.payload === 'object' && action.payload?.message
            ? action.payload.message
            : action.payload;
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
      .addCase(logout.pending, (state) => {
        state.signingOut = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.signingOut = false;
        state.signOutPromptVisible = false;
        state.user = null;
        state.token = null;
        state.error = null;
        state.authNotice = {
          key: Date.now(),
          message: 'Signed out successfully',
        };
      })
      .addCase(logout.rejected, (state) => {
        state.signingOut = false;
        state.signOutPromptVisible = false;
      });
  },
});

export const {
  clearAuthError,
  requestSignOut,
  cancelSignOut,
  clearAuthNotice,
  showAuthNotice,
} = authSlice.actions;

export default authSlice.reducer;
