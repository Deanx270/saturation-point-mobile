import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'saturation_point_jwt';
const USER_KEY = 'saturation_point_user';

export const saveAuthToken = async (token) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.warn('SecureStore save error:', error);
  }
};

export const getAuthToken = async () => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    return null;
  }
};

export const saveAuthUser = async (user) => {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.warn('SecureStore save user error:', error);
  }
};

export const getAuthUser = async () => {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

export const clearAuthStorage = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (error) {
    console.warn('SecureStore delete error:', error);
  }
};
