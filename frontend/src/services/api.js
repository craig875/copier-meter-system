import axios from 'axios';

// In production, set VITE_API_URL to your backend URL (e.g. https://your-app.railway.app)
// In development, uses /api which is proxied to localhost:3001
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Users API
export const usersApi = {
  getAll: () => api.get('/users').then(res => res.data),
  create: (data) => api.post('/users', data).then(res => res.data),
  update: (id, data) => api.put(`/users/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/users/${id}`).then(res => res.data),
};

// Machines API
export const machinesApi = {
  getAll: (params) => {
    // Remove null/undefined/empty branch from params
    const cleanParams = { ...params };
    if (cleanParams.branch === null || cleanParams.branch === undefined || cleanParams.branch === '') {
      delete cleanParams.branch;
    }
    return api.get('/machines', { params: cleanParams }).then(res => res.data);
  },
  getOne: (id) => api.get(`/machines/${id}`),
  create: (data) => api.post('/machines', data),
  update: (id, data) => api.put(`/machines/${id}`, data),
  delete: (id) => api.delete(`/machines/${id}`),
  import: (data, year, month, branch) => {
    const payload = { data, year, month };
    if (branch) payload.branch = branch;
    return api.post('/machines/import', payload);
  },
  decommission: (id) => api.post(`/machines/${id}/decommission`),
  recommission: (id) => api.post(`/machines/${id}/recommission`),
};

// Readings API
export const readingsApi = {
  get: (year, month, includeDecommissioned = false, branch = null) => {
    const params = { year, month, includeDecommissioned: includeDecommissioned ? 'true' : undefined };
    if (branch) params.branch = branch;
    return api.get('/readings', { params });
  },
  submit: (data) => api.post('/readings', data),
  export: (year, month, branch = null) => {
    const params = { year, month };
    if (branch) params.branch = branch;
    return api.get('/readings/export', { 
      params,
      responseType: 'blob',
    });
  },
  getHistory: (machineId, limit = 12, branch = null) => {
    const params = { limit };
    if (branch) params.branch = branch;
    return api.get(`/readings/history/${machineId}`, { params });
  },
  import: (data, year, month, branch) => {
    return api.post('/readings/import', { data, year, month, branch });
  },
  delete: (machineId, year, month) => {
    return api.delete(`/readings/machine/${machineId}`, { params: { year, month } });
  },
  unlock: (year, month, branch) => {
    return api.post('/readings/unlock', {}, { params: { year, month, branch } });
  },
};

// Dashboard API
export const dashboardApi = {
  get: () => api.get('/dashboard'),
};


export default api;
