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

// Handle auth errors (session expired, invalid token)
// Don't redirect for login request - let the error propagate so the user sees "Invalid email or password"
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthStep = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/verify-2fa');
      if (!isAuthStep) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  verify2FA: (data) => api.post('/auth/verify-2fa', data),
  getMe: () => api.get('/auth/me'),
  get2FAStatus: () => api.get('/auth/2fa/status'),
  setup2FA: () => api.post('/auth/2fa/setup'),
  verify2FASetup: (data) => api.post('/auth/2fa/verify-setup', data),
  disable2FA: (data) => api.post('/auth/2fa/disable', data),
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

// Audit / Transaction History API (admin only)
export const auditApi = {
  getHistory: (params = {}) => api.get('/audit', { params }).then(res => res.data),
};

// Notifications API (admin only)
export const notificationsApi = {
  getAll: (params = {}) => api.get('/notifications', { params }).then(res => res.data),
  getUnreadCount: () => api.get('/notifications/unread-count').then(res => res.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
};

// Customers API
export const customersApi = {
  getAll: (branch = null) => {
    const params = branch ? { branch } : {};
    return api.get('/customers', { params }).then((r) => r.data);
  },
  getOne: (id) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (data) => api.post('/customers', data).then((r) => r.data),
  update: (id, data) => api.put(`/customers/${id}`, data).then((r) => r.data),
  archive: (id, isArchived = true) => api.patch(`/customers/${id}/archive`, { isArchived }).then((r) => r.data),
  delete: (id) => api.delete(`/customers/${id}`).then((r) => r.data),
};

// Makes & Models API
export const makesApi = {
  getAll: () => api.get('/makes').then((r) => r.data),
  create: (data) => api.post('/makes', data).then((r) => r.data),
  update: (id, data) => api.put(`/makes/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/makes/${id}`).then((r) => r.data),
  import: (data, branch) => api.post('/makes/import', { data, branch }).then((r) => r.data),
};
export const modelsApi = {
  getAll: (makeId = null) => {
    const params = makeId ? { makeId } : {};
    return api.get('/models', { params }).then((r) => r.data);
  },
  create: (data) => api.post('/models', data).then((r) => r.data),
  update: (id, data) => api.put(`/models/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/models/${id}`).then((r) => r.data),
};

// Consumables API
export const consumablesApi = {
  getModelParts: (modelId, branch = null) => {
    const params = modelId ? { modelId } : {};
    if (branch) params.branch = branch;
    return api.get('/consumables/model-parts', { params }).then((r) => r.data);
  },
  getModelPartsAll: (branch = null) => {
    const params = branch ? { branch } : {};
    return api.get('/consumables/model-parts/all', { params }).then(res => res.data);
  },
  getModelPart: (id) => api.get(`/consumables/model-parts/${id}`).then(res => res.data),
  createModelPart: (data) => api.post('/consumables/model-parts', data).then(res => res.data),
  updateModelPart: (id, data) => api.put(`/consumables/model-parts/${id}`, data).then(res => res.data),
  deleteModelPart: (id) => api.delete(`/consumables/model-parts/${id}`).then(res => res.data),
  recordPartOrder: (data) => api.post('/consumables/orders', data).then(res => res.data),
  importPartOrders: (data) => api.post('/consumables/orders/import', { data }).then(res => res.data),
  deletePartOrder: (id) => api.delete(`/consumables/orders/${id}`).then(res => res.data),
  getMachineHistory: (machineId, branch = null) => {
    const params = branch ? { branch } : {};
    return api.get(`/consumables/machines/${machineId}/history`, { params }).then(res => res.data);
  },
  getSummary: (params = {}) => api.get('/consumables/summary', { params }).then(res => res.data),
  getTonerAlerts: (branch = null) => {
    const params = branch ? { branch } : {};
    return api.get('/consumables/toner-alerts', { params }).then(res => res.data);
  },
};

export default api;
