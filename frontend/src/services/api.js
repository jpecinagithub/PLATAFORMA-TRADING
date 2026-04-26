import axios from 'axios';

const isProd = import.meta.env.PROD;
const BASE = isProd ? '/api/trading' : '/api';

const api = axios.create({
  baseURL: BASE,
  withCredentials: true, // send httpOnly cookie on every request
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/trading/login';
    }
    return Promise.reject(err);
  }
);

export default api;
