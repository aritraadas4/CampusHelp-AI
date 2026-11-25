// Centralized API client for CampusHelp AI

const API_BASE = '/api';

export function getStoredToken() {
  return localStorage.getItem('campushelp_token');
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('campushelp_token', token);
  } else {
    localStorage.removeItem('campushelp_token');
  }
}

export function getStoredUser() {
  const user = localStorage.getItem('campushelp_user');
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('campushelp_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('campushelp_user');
  }
}

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    ...(options.headers || {})
  };

  // Add JSON content-type if not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Request failed (${response.status})`;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      // response wasn't JSON
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

export const api = {
  // Auth
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.access_token);
    setStoredUser(data.user);
    return data;
  },

  async register(email, password, full_name) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    });
    setStoredToken(data.access_token);
    setStoredUser(data.user);
    return data;
  },

  async getMe() {
    return request('/auth/me');
  },

  logout() {
    setStoredToken(null);
    setStoredUser(null);
  },

  // AI & Classifier
  async analyzeComplaint(complaint) {
    return request('/complaints/analyze', {
      method: 'POST',
      body: JSON.stringify({ complaint }),
    });
  },

  // Complaints
  async submitComplaint(data) {
    return request('/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async trackComplaint(ticketId) {
    return request(`/complaints/track/${encodeURIComponent(ticketId.trim())}`);
  },

  async getComplaint(id) {
    return request(`/complaints/${encodeURIComponent(id)}`);
  },

  async listComplaints(filters = {}) {
    const params = new URLSearchParams();
    if (filters.department) params.append('department', filters.department);
    if (filters.status) params.append('status', filters.status);
    if (filters.urgency) params.append('urgency', filters.urgency);
    if (filters.review_required !== undefined && filters.review_required !== null && filters.review_required !== '') {
      params.append('review_required', filters.review_required);
    }
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/complaints${qs}`);
  },

  async updateComplaint(id, updates) {
    return request(`/complaints/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Analytics
  async getAnalytics() {
    return request('/analytics');
  },

  // File Upload
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return request('/uploads', {
      method: 'POST',
      body: formData,
    });
  },
};
