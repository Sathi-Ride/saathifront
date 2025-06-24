import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.0.9:9000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken = '';

export const setAccessToken = async (token: string) => {
  accessToken = token;
  await AsyncStorage.setItem('accessToken', token);
  apiClient.defaults.headers.Authorization = `Bearer ${token}`;
};

export const getAccessToken = async () => {
  if (!accessToken) {
    accessToken = await AsyncStorage.getItem('accessToken') || '';
  }
  return accessToken;
};

export const clearAccessToken = async () => {
  accessToken = '';
  await AsyncStorage.removeItem('accessToken');
  delete apiClient.defaults.headers.Authorization;
};

export const refreshAccessToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (refreshToken) {
      const response = await apiClient.post('/auth/refresh-token', { refreshToken });
      if (response.data.statusCode === 200) {
        await setAccessToken(response.data.data.accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.data.refreshToken || '');
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        originalRequest.headers.Authorization = `Bearer ${await getAccessToken()}`;
        return apiClient(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;