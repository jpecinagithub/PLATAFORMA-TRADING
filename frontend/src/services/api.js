import axios from 'axios';

const isProd = import.meta.env.PROD;
const BASE = isProd ? '/api/trading' : '/api';

const api = axios.create({
  baseURL: BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/trading/login';
    }
    return Promise.reject(err);
  }
);

export default api;
