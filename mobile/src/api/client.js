import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getAuthToken } from '../services/secureStoreService';

const getHostFromExpo = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  const host = hostUri.split(':')[0];
  if (!host || host.includes('exp.direct')) {
    return null;
  }

  return host;
};

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS !== 'web') {
    const lanHost = getHostFromExpo();
    if (lanHost) {
      return `http://${lanHost}:5000/api`;
    }
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/api';
    }
  }

  return 'http://localhost:5000/api';
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (typeof config.headers?.delete === 'function') {
        config.headers.delete('Content-Type');
      } else if (config.headers) {
        delete config.headers['Content-Type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
