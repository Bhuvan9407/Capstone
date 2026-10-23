import api, { apiError } from './api.js';

const sessionExpiredRedirect = () => {
  window.location.assign('/login?reason=expired');
};
window.addEventListener('coach:session-expired', sessionExpiredRedirect);

export const authApi = {
  me: () => api.get('/auth/me'),
  register: (body) => api.post('/auth/register', body),
  registerMentor: (body) => api.post('/auth/register/mentor', body),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  login: (body) => api.post('/auth/login', body),
  logout: () => api.post('/auth/logout'),
  forgot: (email) => api.post('/auth/forgot-password', { email }),
  reset: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  changePassword: (body) => api.post('/auth/change-password', body),
  updateMe: (body) => api.patch('/users/me', body),
  devInbox: () => api.get('/auth/dev-inbox'),
};

export const evidenceApi = {
  list: (params) => api.get('/evidence', { params }),
  facets: () => api.get('/evidence/facets'),
  get: (id) => api.get(`/evidence/${id}`),
  create: (body) => api.post('/evidence', body),
  update: (id, body) => api.patch(`/evidence/${id}`, body),
  remove: (id) => api.delete(`/evidence/${id}`),
};

export const resumeApi = {
  list: () => api.get('/resumes'),
  get: (id) => api.get(`/resumes/${id}`),
  upload: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/resumes', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / (e.total || 1))),
    });
  },
  reprocess: (id) => api.post(`/resumes/${id}/reprocess`),
  remove: (id) => api.delete(`/resumes/${id}`),
};

export const jobTargetApi = {
  list: (params) => api.get('/job-targets', { params }),
  get: (id) => api.get(`/job-targets/${id}`),
  create: (body) => api.post('/job-targets', body),
  update: (id, body) => api.patch(`/job-targets/${id}`, body),
  extract: (id) => api.post(`/job-targets/${id}/extract`),
  confirm: (id, body) => api.patch(`/job-targets/${id}/confirm`, body),
  compare: (id) => api.get(`/job-targets/${id}/compare`),
  remove: (id) => api.delete(`/job-targets/${id}`),
};

export const chatApi = {
  ask: (body) => api.post('/career-chat', body),
  conversations: () => api.get('/career-chat/conversations'),
  conversation: (id) => api.get(`/career-chat/conversations/${id}`),
};

export const agentApi = {
  run: (body) => api.post('/preparation-agent', body),
  runInfo: (id) => api.get(`/preparation-agent/runs/${id}`),
};

export const planApi = {
  list: (status) => api.get('/plans', { params: status ? { status } : {} }),
  get: (id) => api.get(`/plans/${id}`),
  update: (id, body) => api.patch(`/plans/${id}`, body),
  confirm: (id) => api.post(`/plans/${id}/confirm`),
  setItem: (id, itemIndex, completed) => api.patch(`/plans/${id}/items/complete`, { itemIndex, completed }),
  remove: (id) => api.delete(`/plans/${id}`),
};

export const mentorApi = {
  invite: (body) => api.post('/mentor-invitations', body),
  myInvitations: () => api.get('/mentor-invitations'),
  revokeInvitation: (id) => api.post(`/mentor-invitations/${id}/revoke`),
  pendingInvitations: () => api.get('/mentor-invitations/pending'),
  acceptInvitation: (token) => api.post('/mentor-invitations/accept', { token }),
  grants: () => api.get('/grants'),
  saveGrant: (body) => api.post('/grants', body),
  revokeGrant: (id) => api.delete(`/grants/${id}`),
  shared: () => api.get('/shared'),
  sharedResume: (id) => api.get(`/shared/resumes/${id}`),
  createReview: (body) => api.post('/reviews', body),
  reviews: () => api.get('/reviews'),
  review: (id) => api.get(`/reviews/${id}`),
  comment: (id, body, evidenceId) => api.post(`/reviews/${id}/comments`, evidenceId ? { body, evidenceId } : { body }),
  suggest: (id, text) => api.post(`/reviews/${id}/suggestions`, { text }),
  completeReview: (id) => api.post(`/reviews/${id}/complete`),
};

export const portfolioApi = {
  publicView: (slug) => api.get(`/portfolios/${slug}`),
  own: () => api.get('/portfolio'),
  preview: () => api.get('/portfolio/preview'),
  visibility: (action, changes) => api.patch('/portfolio/visibility', { action, changes }),
};

export const publicApi = {
  roleGuides: () => api.get('/role-guides'),
  report: (body) => api.post('/abuse', body),
};

export const adminApi = {
  pendingMentors: () => api.get('/admin/mentors/pending'),
  verifyMentor: (mentorId, verified = true) => api.post('/admin/mentors/verify', { mentorId, verified }),
  reports: (status) => api.get('/admin/abuse', { params: status ? { status } : {} }),
  processReport: (reportId, status, resolutionNote) => api.post('/admin/abuse/process', { reportId, status, resolutionNote }),
  moderation: (body) => api.post('/admin/moderation', body),
  health: () => api.get('/admin/service-health'),
  audit: (page = 1) => api.get('/admin/audit', { params: { page } }),
};

export { apiError };
