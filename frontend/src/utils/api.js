import axios from 'axios';

// ─── Base URL resolution ────────────────────────────────────────────────────
// REACT_APP_API_URL is baked in at build time by Create React App.
// It MUST be set in Vercel's Environment Variables BEFORE building.
// If it's missing the app will log a clear error instead of silently
// hitting the wrong host.
const BASE_URL = process.env.REACT_APP_API_URL;

if (!BASE_URL) {
  // In development the CRA proxy handles it; in production this is a config error.
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '❌ REACT_APP_API_URL is not set.\n' +
      'Go to Vercel → Project → Settings → Environment Variables and add:\n' +
      '  REACT_APP_API_URL = https://your-backend.railway.app/api\n' +
      'Then redeploy.'
    );
  }
}

const api = axios.create({
  // In development fall back to localhost so `npm start` still works without an .env file.
  // In production, if BASE_URL is missing we still avoid hitting /api on the same host
  // by using a clearly broken placeholder that surfaces the real error.
  baseURL: BASE_URL || (
    process.env.NODE_ENV === 'production'
      ? 'MISSING_REACT_APP_API_URL'   // will produce a clear network error, not a 429 on Vercel
      : 'http://localhost:5000/api'
  ),
  withCredentials: true,
  timeout: 30000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const refreshBaseUrl = BASE_URL || 'http://localhost:5000/api';
        const res = await axios.post(
          `${refreshBaseUrl}/auth/refresh`,
          { refreshToken }
        );

        const newToken = res.data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        localStorage.setItem('refreshToken', res.data.data.refreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
