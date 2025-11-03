import axios from 'axios';

// Vite uses import.meta.env instead of process.env
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// GitHub API
export const githubAPI = {
  collect: (repository, options) => api.post('/github/collect', { repository, options }),
  getRateLimit: () => api.get('/github/rate-limit')
};

// Email API
export const emailAPI = {
  getAll: (params) => api.get('/emails', { params }),
  getStats: () => api.get('/emails/stats'),
  add: (emailData) => api.post('/emails', emailData),
  delete: (id) => api.delete(`/emails/${id}`),
  bulkDelete: (data) => api.delete('/emails', { data })
};

// Repository API
export const repositoryAPI = {
  delete: (repository) => api.delete(`/repositories/${encodeURIComponent(repository)}`)
};

// Send API
export const sendAPI = {
  testSMTP: (smtpConfig) => api.post('/send/test', smtpConfig),
  testConnection: (host, port) => api.post('/send/test-connection', { host, port }),
  // sendSingle: (data) => api.post('/send/single', data), // Disabled - single email sending removed
  sendBulk: (data) => api.post('/send/bulk', data)
};

export default api;