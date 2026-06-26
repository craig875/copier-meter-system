import axios from 'axios';

// Production build: set VITE_API_URL when the SPA is served separately from the API.
// Vite dev: always use same-origin `/api` (proxied to localhost:3001) so a wrong machine env cannot break login.
const baseURL = import.meta.env.DEV
  ? '/api'
  : import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
    : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** App site (JHB/CT) for API scoping — matches AuthContext effectiveBranch. */
function resolveStoredAppSite() {
  const fromStorage = localStorage.getItem('selectedBranch');
  if (fromStorage === 'JHB' || fromStorage === 'CT') return fromStorage;
  try {
    const user = JSON.parse(sessionStorage.getItem('user') || 'null');
    if (user?.branch === 'JHB' || user?.branch === 'CT') return user.branch;
  } catch {
    // ignore invalid session user JSON
  }
  return null;
}

/** Routes that must not receive site query params or custom headers (avoids CORS preflight on login). */
function isAuthRequest(url = '') {
  return url.includes('/auth/login')
    || url.includes('/auth/verify-2fa')
    || url.includes('/auth/me');
}

// Add auth token; attach site scope only on data API calls (not login/session)
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!isAuthRequest(config.url)) {
    const site = resolveStoredAppSite();
    if (site) {
      // Explicit branch on the request wins; interceptor fills in when missing.
      const existingBranch = config.params?.branch;
      config.params = {
        ...(config.params || {}),
        branch:
          existingBranch === 'JHB' || existingBranch === 'CT'
            ? existingBranch
            : site,
      };
      const method = (config.method || 'get').toLowerCase();
      if (
        method === 'post'
        && config.data
        && typeof config.data === 'object'
        && !(config.data instanceof FormData)
        && config.data.branch !== 'JHB'
        && config.data.branch !== 'CT'
      ) {
        const branch =
          config.params?.branch === 'JHB' || config.params?.branch === 'CT'
            ? config.params.branch
            : site;
        config.data = { ...config.data, branch };
      }
    }
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
      const onLoginPage = window.location.pathname === '/login';
      if (!isAuthStep && !onLoginPage) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
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
    const cleanParams = { ...params };
    if (cleanParams.branch === null || cleanParams.branch === undefined || cleanParams.branch === '') {
      delete cleanParams.branch;
    }
    const branch = cleanParams.branch;
    const url =
      branch === 'JHB' || branch === 'CT'
        ? `/machines?branch=${encodeURIComponent(branch)}`
        : '/machines';
    return api.get(url, { params: cleanParams }).then(res => res.data);
  },
  getOne: (id) => api.get(`/machines/${id}`),
  create: (data, branch = null) => {
    const params = branch ? { branch } : {};
    return api.post('/machines', data, { params });
  },
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
  export: (year, month, branch = null, format = 'xlsx') => {
    const params = { year, month, format };
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

// Notifications API
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
  /** Bulk import customers from CSV (customers only; no machines) */
  importBulk: (data, branch) => api.post('/customers/import', { data, branch }).then((r) => r.data),
};

// Makes & Models API (branch = app site: JHB or CT)
const makesModelsBranchParams = (branch) => {
  if (branch !== 'JHB' && branch !== 'CT') return {};
  return { branch };
};

export const makesApi = {
  getAll: (branch) => {
    if (branch !== 'JHB' && branch !== 'CT') {
      return Promise.resolve({ makes: [], site: null, needsBranch: true });
    }
    return api
      .get(`/makes?branch=${encodeURIComponent(branch)}`, { params: makesModelsBranchParams(branch) })
      .then((r) => r.data);
  },
  create: (data, branch) => {
    if (branch !== 'JHB' && branch !== 'CT') {
      return Promise.reject(new Error('Branch (JHB or CT) is required'));
    }
    const q = encodeURIComponent(branch);
    return api.post(`/makes?branch=${q}`, { ...data, branch }, { params: { branch } }).then((r) => r.data);
  },
  update: (id, data, branch) => {
    const q = branch === 'JHB' || branch === 'CT' ? `?branch=${encodeURIComponent(branch)}` : '';
    return api.put(`/makes/${id}${q}`, data, { params: makesModelsBranchParams(branch) }).then((r) => r.data);
  },
  delete: (id, branch) => {
    const q = branch === 'JHB' || branch === 'CT' ? `?branch=${encodeURIComponent(branch)}` : '';
    return api.delete(`/makes/${id}${q}`, { params: makesModelsBranchParams(branch) }).then((r) => r.data);
  },
  import: (data, branch) => api.post('/makes/import', { data, branch }).then((r) => r.data),
};
export const modelsApi = {
  getAll: (makeId = null, branch = null) => {
    const params = { ...makesModelsBranchParams(branch) };
    if (makeId) params.makeId = makeId;
    const q =
      branch === 'JHB' || branch === 'CT'
        ? `?branch=${encodeURIComponent(branch)}${makeId ? `&makeId=${encodeURIComponent(makeId)}` : ''}`
        : makeId
          ? `?makeId=${encodeURIComponent(makeId)}`
          : '';
    return api.get(`/models${q}`, { params }).then((r) => r.data);
  },
  create: (data, branch) => {
    if (branch !== 'JHB' && branch !== 'CT') {
      return Promise.reject(new Error('Branch (JHB or CT) is required'));
    }
    const q = encodeURIComponent(branch);
    return api.post(`/models?branch=${q}`, { ...data, branch }, { params: { branch } }).then((r) => r.data);
  },
  update: (id, data, branch) => {
    const q = branch === 'JHB' || branch === 'CT' ? `?branch=${encodeURIComponent(branch)}` : '';
    return api.put(`/models/${id}${q}`, data, { params: makesModelsBranchParams(branch) }).then((r) => r.data);
  },
  delete: (id, branch) => {
    const q = branch === 'JHB' || branch === 'CT' ? `?branch=${encodeURIComponent(branch)}` : '';
    return api.delete(`/models/${id}${q}`, { params: makesModelsBranchParams(branch) }).then((r) => r.data);
  },
};

// Connectivity Monitoring API (branch must match the user's selected / effective branch)
const connectivityBranchParams = (branch) => (branch ? { branch } : {});

export const connectivityApi = {
  getDashboard: (branch) =>
    api.get('/connectivity/dashboard', { params: connectivityBranchParams(branch) }).then((r) => r.data),
  getSummary: (branch) =>
    api.get('/connectivity/summary', { params: connectivityBranchParams(branch) }).then((r) => r.data),
  getTargets: (params = {}) => api.get('/connectivity/targets', { params }).then((r) => r.data),
  getTarget: (id, params = {}) => api.get(`/connectivity/targets/${id}`, { params }).then((r) => r.data),
  checkTarget: (id, branch) =>
    api.post(`/connectivity/targets/${id}/check`, {}, { params: connectivityBranchParams(branch) }).then((r) => r.data),
  createTarget: (data, branch) =>
    api.post('/connectivity/targets', data, { params: connectivityBranchParams(branch) }).then((r) => r.data),
  updateTarget: (id, data, branch) =>
    api.put(`/connectivity/targets/${id}`, data, { params: connectivityBranchParams(branch) }).then((r) => r.data),
  deleteTarget: (id, branch) =>
    api.delete(`/connectivity/targets/${id}`, { params: connectivityBranchParams(branch) }).then((r) => r.data),
  setTargetStatus: (id, status, branch) =>
    api.patch(`/connectivity/targets/${id}/status`, { status }, { params: connectivityBranchParams(branch) }).then((r) => r.data),
  getTimeWindows: (branch) =>
    api.get('/connectivity/time-windows', { params: connectivityBranchParams(branch) }).then((r) => r.data),
  createOrUpdateTimeWindow: (data, branch) =>
    api.post('/connectivity/time-windows', data, { params: connectivityBranchParams(branch) }).then((r) => r.data),
  getUptimeReport: (params) => api.get('/connectivity/reports/uptime', { params }).then((r) => r.data),
  getSlaReport: (params) => api.get('/connectivity/reports/sla', { params }).then((r) => r.data),
  exportReport: (params) => api.get('/connectivity/reports/export', { params, responseType: 'blob' }),
  getOutages: (params = {}) => api.get('/connectivity/outages', { params }).then((r) => r.data),
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
  increaseCosts: (percentIncrease, branch = null, makeId = null) =>
    api.post('/consumables/model-parts/increase-costs', {
      percentIncrease,
      branch: branch || undefined,
      makeId: makeId || undefined,
    }).then(res => res.data),
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
