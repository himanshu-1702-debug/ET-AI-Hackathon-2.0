const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

function authHeader() {
  const token = localStorage.getItem('plant_brain_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get(path) {
  const res = await fetch(BASE + path, { headers: { ...authHeader() } });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

async function upload(path, formData) {
  const res = await fetch(BASE + path, { method: 'POST', body: formData, headers: { ...authHeader() } });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export const api = {
  status: () => get('/status'),

  login: (username, password) => post('/auth/login', { username, password }),
  me: () => get('/auth/me'),

  getJobStatus: (jobId) => get(`/jobs/${jobId}`),
  listJobs: (status = null, limit = 50) => get(`/jobs${status ? `?status=${status}` : ''}&limit=${limit}`),
  getDeadLetterQueue: () => get('/jobs/dlq/all'),
  replayJob: (jobId) => post(`/jobs/${jobId}/replay`, {}),
  getObservability: () => get('/system/observability'),

  whatsappStatus: () => get('/whatsapp/status'),
  resetSystem: () => post('/system/reset', {}),

  uploadDocument: (file, docType) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('doc_type', docType);
    return upload('/documents/upload', fd);
  },
  ingestThread: (text, sourceLabel = 'whatsapp_thread') =>
    post('/documents/ingest-thread', { text, source_label: sourceLabel }),

  askCopilot: (question, language = 'en', maxHops = 2) =>
    post('/copilot/query', { question, language, max_hops: maxHops }),

  generateOnboardingPath: (role, area) => post('/onboarding/generate-path', { role, area }),

  getEscalations: (limit = 50) => get(`/escalations?limit=${limit}`),

  checkCompliance: (scopeQuery) => post('/compliance/check', { scope_query: scopeQuery }),
  generateEvidencePackage: (scope) => post('/compliance/evidence-package', { scope }),

  analyzeRCA: (equipmentQuery) => post('/rca/analyze', { equipment_query: equipmentQuery }),

  getInbox: (role) => get(`/routing/inbox/${role}`),
  getAllRouted: () => get('/routing/all'),
  acknowledgeFinding: (findingId) => post('/routing/acknowledge', { finding_id: findingId }),

  scanPatterns: (focusArea = '') => post('/lessons-learned/scan', { focus_area: focusArea }),

  tacitNextQuestion: (expertiseArea, conversationHistory) =>
    post('/tacit-capture/next-question', { expertise_area: expertiseArea, conversation_history: conversationHistory }),
  tacitFinalize: (expertiseArea, conversationHistory) =>
    post('/tacit-capture/finalize', { expertise_area: expertiseArea, conversation_history: conversationHistory }),

  getConversation: (screen) => get(`/conversations/${screen}`),
  appendConversationMessage: (screen, message) => post(`/conversations/${screen}`, message),
  clearConversation: (screen) => fetch(`${BASE}/conversations/${screen}`, { method: 'DELETE', headers: { ...authHeader() } }).then((r) => r.json()),

  getAuditRecent: (limit = 100, feature = null) =>
    get(`/audit/recent?limit=${limit}${feature ? `&feature=${feature}` : ''}`),

  getGraphSummary: () => get('/graph/summary'),
  getGraphEntity: (entityId, maxHops = 2) => get(`/graph/entity/${entityId}?max_hops=${maxHops}`),
  searchGraph: (q) => get(`/graph/search?q=${encodeURIComponent(q)}`),
};

export function isBackendError(err) {
  return err && typeof err === 'object' && 'status' in err;
}
