const TOKEN_KEY = 'sat_point_jwt_token';
const USER_KEY = 'sat_point_user_data';

export const saveAuthToken = async (token) => {
  try {
    if (token && typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  } catch (e) {}
};

export const getAuthToken = async () => {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const saveAuthUser = async (user) => {
  try {
    if (user && typeof localStorage !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch (e) {}
};

export const getAuthUser = async () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const userData = localStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const clearAuthStorage = async () => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch (e) {}
};
