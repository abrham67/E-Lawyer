// Generic API utility for CRUD operations
import { getApiErrorMessage, safeParseApiResponse } from './apiError';

async function readResponsePayload(res: Response) {
  const text = await res.text().catch(() => '');
  return safeParseApiResponse(text);
}

function buildApiError(payload: any, status: number) {
  const message = typeof payload === 'string'
    ? payload || `HTTP ${status}`
    : getApiErrorMessage(payload, `HTTP ${status}`);
  const err: any = new Error(message);
  err.status = status;
  err.payload = payload;
  return err;
}

export async function apiGet(url: string, token?: string) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!res.ok) {
    const payload = await readResponsePayload(res);
    throw buildApiError(payload, res.status);
  }
  return res.json();
}

export async function apiPost(url: string, data: any, token?: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const payload = await readResponsePayload(res);
    throw buildApiError(payload, res.status);
  }
  return res.json();
}

export async function apiPut(url: string, data: any, token?: string) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const payload = await readResponsePayload(res);
    throw buildApiError(payload, res.status);
  }
  return res.json();
}

export async function apiPatch(url: string, data?: any, token?: string) {
  const opts: any = {
    method: 'PATCH',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  };
  if (data !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(data);
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    const payload = await readResponsePayload(res);
    throw buildApiError(payload, res.status);
  }
  // try to parse JSON, otherwise return text
  const text = await res.text();
  return safeParseApiResponse(text);
}

export async function apiDelete(url: string, token?: string) {
  // First attempt: standard DELETE
  let res = await fetch(url, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (res.ok) {
    const text = await res.text();
    return text;
  }
  // If proxy/dev server blocks DELETE (404/405 with "Cannot DELETE"), retry with POST fallback for cases only
  const body = await readResponsePayload(res);
  const bodyText = typeof body === 'string' ? body : getApiErrorMessage(body, '');
  const blocked = res.status === 404 || res.status === 405 || /Cannot\s+DELETE/i.test(bodyText);
  const isCaseItem = /\/api\/cases\/+[^\/]+$/i.test(url);
  if (blocked && isCaseItem) {
    const retry = await fetch(`${url}/delete`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (retry.ok) {
      // backend returns JSON {deleted:true}; normalize to text
      try { const j = await retry.json(); return JSON.stringify(j); } catch { return retry.text(); }
    }
    const retryPayload = await readResponsePayload(retry);
    throw buildApiError(retryPayload, retry.status);
  }
  throw buildApiError(body, res.status);
}


// Cases
export const CasesAPI = {
  list: async (token?: string) => {
    const res = await apiGet('/api/cases', token);
    return res && res.cases ? res.cases : res;
  },
  get: (id: string, token?: string) => apiGet(`/api/cases/${id}`, token),
  create: (data: any, token?: string) => apiPost('/api/cases', data, token),
  // Connect a client to a lawyer (creates a pending case/connection)
  connect: (data: any, token?: string) => apiPost('/api/cases/connect', data, token),
  // Disconnect/remove a connection (DELETE /api/cases/:id/disconnect)
  disconnect: (id: string, token?: string) => apiDelete(`/api/cases/${id}/disconnect`, token),
  update: (id: string, data: any, token?: string) => apiPut(`/api/cases/${id}`, data, token),
  delete: (id: string, token?: string) => apiDelete(`/api/cases/${id}`, token)
};

// Court Sessions
export const CourtSessionsAPI = {
  list: (token?: string) => apiGet('/api/courtsessions', token),
  get: (id: string, token?: string) => apiGet(`/api/courtsessions/${id}`, token),
  create: (data: any, token?: string) => apiPost('/api/courtsessions', data, token),
  update: (id: string, data: any, token?: string) => apiPut(`/api/courtsessions/${id}`, data, token),
  delete: (id: string, token?: string) => apiDelete(`/api/courtsessions/${id}`, token)
};

// Documents
export const DocumentsAPI = {
  list: (token?: string) => apiGet('/api/documents', token),
  get: (id: string, token?: string) => apiGet(`/api/documents/${id}`, token),
  create: (data: any, token?: string) => apiPost('/api/documents', data, token),
  update: (id: string, data: any, token?: string) => apiPut(`/api/documents/${id}`, data, token),
  delete: (id: string, token?: string) => apiDelete(`/api/documents/${id}`, token)
};

// Profiles
export const ProfilesAPI = {
  list: (token?: string) => apiGet('/api/profiles', token),
  get: (id: string, token?: string) => apiGet(`/api/profiles/${id}`, token),
  create: (data: any, token?: string) => apiPost('/api/profiles', data, token),
  update: (id: string, data: any, token?: string) => apiPut(`/api/profiles/${id}`, data, token),
  delete: (id: string, token?: string) => apiDelete(`/api/profiles/${id}`, token)
};

// Users
export const UsersAPI = {
  list: (token?: string) => apiGet('/api/users', token),
  get: (id: string, token?: string) => apiGet(`/api/users/${id}`, token),
  create: (data: any, token?: string) => apiPost('/api/users', data, token),
  update: (id: string, data: any, token?: string) => apiPut(`/api/users/${id}`, data, token),
  delete: (id: string, token?: string) => apiDelete(`/api/users/${id}`, token)
};

// Lawyers (backend provides /api/lawyers)
export const LawyersAPI = {
  list: (token?: string) => apiGet('/api/lawyers', token),
  get: (id: string, token?: string) => apiGet(`/api/lawyers/${id}`, token)
};

// batch fetch
export const LawyersBatchAPI = {
  batchGet: (ids: string[] = [], token?: string) => apiPost('/api/lawyers/batch', { ids }, token)
};

// Communication (messages)
export const CommunicationAPI = {
  list: (token?: string) => apiGet('/api/communication/messages', token),
  get: (id: string, token?: string) => apiGet(`/api/communication/messages/${id}`, token),
  create: (data: any, token?: string) => apiPost('/api/communication/messages', data, token),
  delete: (id: string, token?: string) => apiDelete(`/api/communication/messages/${id}`, token)
};

// Notifications
export const NotificationsAPI = {
  list: (token?: string) => apiGet('/api/notifications', token),
  // mark a single notification as read (PATCH /api/notifications/:id/read)
  markRead: (id: string, token?: string) => apiPatch(`/api/notifications/${id}/read`, undefined, token)
};
