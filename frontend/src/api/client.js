// Loomdo Offline API Client

const BASE_URL = '/api';

export async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    const res = await fetch(url, { ...options, headers });
    
    // Handle CSV or text responses
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      return await res.text();
    }

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data?.detail || data?.message || `HTTP error ${res.status}`;
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Health
  checkHealth: () => apiRequest('/settings'),

  // Dashboard
  getDashboard: () => apiRequest('/dashboard/summary'),

  // Inventory
  getSuppliers: () => apiRequest('/inventory/suppliers'),
  getYarnBatches: () => apiRequest('/inventory/yarn'),
  getYarnStockSummary: () => apiRequest('/inventory/stock-summary'),
  logYarnArrival: (payload) => apiRequest('/inventory/yarn/arrival', { method: 'POST', body: JSON.stringify(payload) }),
  checkYarnFeasibility: (payload) => apiRequest('/inventory/check-feasibility', { method: 'POST', body: JSON.stringify(payload) }),

  // Production
  getMachines: () => apiRequest('/production/machines'),
  updateMachineStatus: (id, status) => apiRequest(`/production/machines/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  assignJob: (payload) => apiRequest('/production/jobs/assign', { method: 'POST', body: JSON.stringify(payload) }),
  updateJobProgress: (id, payload) => apiRequest(`/production/jobs/${id}/progress`, { method: 'PATCH', body: JSON.stringify(payload) }),
  simulateTick: () => apiRequest('/production/telemetry-tick', { method: 'POST' }),
  getReassignSuggestions: (jobId) => apiRequest(`/production/jobs/${jobId}/reassign-suggestions`),
  transferJob: (jobId, payload) => apiRequest(`/production/jobs/${jobId}/transfer`, { method: 'POST', body: JSON.stringify(payload) }),

  // Quality
  getRolls: (params = '') => apiRequest(`/quality/rolls${params ? '?' + params : ''}`),
  getRollPedigree: (id) => apiRequest(`/quality/rolls/${id}`),
  logDefect: (rollId, payload) => apiRequest(`/quality/rolls/${rollId}/defects`, { method: 'POST', body: JSON.stringify(payload) }),
  completeInspection: (rollId, decision) => apiRequest(`/quality/rolls/${rollId}/complete-inspection?decision=${decision}`, { method: 'POST' }),
  createRoll: (payload) => apiRequest('/quality/rolls', { method: 'POST', body: JSON.stringify(payload) }),

  // Orders
  getOrders: (params = '') => apiRequest(`/orders${params ? '?' + params : ''}`),
  getOrderDetails: (id) => apiRequest(`/orders/${id}`),
  getBuyers: () => apiRequest('/orders/buyers'),
  createOrder: (payload) => apiRequest('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  simulateOrderFeasibility: (payload) => apiRequest('/orders/simulate-feasibility', { method: 'POST', body: JSON.stringify(payload) }),
  getPublicTracking: (ref) => apiRequest(`/orders/track/${ref}`),

  // Dispatch
  getFinishedStock: () => apiRequest('/dispatch/finished-stock'),
  getEligibleRollsForBuyer: (buyerId) => apiRequest(`/dispatch/eligible-rolls/${buyerId}`),
  getDispatchHistory: () => apiRequest('/dispatch/history'),
  executeDispatch: (payload) => apiRequest('/dispatch', { method: 'POST', body: JSON.stringify(payload) }),

  // Workforce
  getWorkers: () => apiRequest('/workforce/workers'),
  getAttendance: (params = '') => apiRequest(`/workforce/attendance${params ? '?' + params : ''}`),
  logAttendance: (payload) => apiRequest('/workforce/attendance', { method: 'POST', body: JSON.stringify(payload) }),
  generateWages: (payload) => apiRequest('/workforce/generate-wages', { method: 'POST', body: JSON.stringify(payload) }),
  getWagesReport: () => apiRequest('/workforce/wages'),

  // Costing
  getOrderCosting: () => apiRequest('/costing/orders'),

  // Insights
  getAnomalies: () => apiRequest('/insights/anomalies'),
  getDefectHeatmap: () => apiRequest('/insights/defect-heatmap'),
  getYieldWastage: () => apiRequest('/insights/yield-wastage'),
  getDelayRisk: () => apiRequest('/insights/delay-risk'),

  // Floor Map
  getFloorLayout: () => apiRequest('/floormap/layout'),

  // Settings & Odoo Export
  getSettings: () => apiRequest('/settings'),
  updateSettings: (payload) => apiRequest('/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  getAuditTrail: (entity = '') => apiRequest(`/settings/audit-trail${entity ? '?entity=' + entity : ''}`),
  getShiftHandoverReport: () => apiRequest('/settings/shift-handover-report'),
  downloadOdooExport: (type) => apiRequest(`/settings/odoo-export/${type}`),

  // Simulator
  triggerSimTick: () => apiRequest('/simulation/tick', { method: 'POST' })
};
