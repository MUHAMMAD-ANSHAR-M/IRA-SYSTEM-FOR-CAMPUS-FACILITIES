import { io } from 'socket.io-client';

let BACKEND_URL = import.meta.env.VITE_API_URL || '';
if (BACKEND_URL && !BACKEND_URL.startsWith('http://') && !BACKEND_URL.startsWith('https://')) {
  BACKEND_URL = `https://${BACKEND_URL}`;
}

const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// Socket singleton
let socket = null;

export function getSocket() {
  if (!socket) {
    let socketOrigin = import.meta.env.VITE_SOCKET_URL || BACKEND_URL || window.location.origin;
    if (socketOrigin && !socketOrigin.startsWith('http://') && !socketOrigin.startsWith('https://')) {
      socketOrigin = `https://${socketOrigin}`;
    }
    socket = io(socketOrigin, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
  }
  return socket;
}

export function getAuthHeaders() {
  const token = localStorage.getItem('ira_token');
  const demoUser = localStorage.getItem('ira_demo_user');
  
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (demoUser) {
    try {
      const u = JSON.parse(demoUser);
      headers['x-demo-user-id'] = u.id;
      headers['x-demo-user-role'] = u.role;
    } catch (e) {}
  }

  return headers;
}

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    const error = new Error(data.message || data.error || 'Request failed');
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

// Facility APIs
export const getFacilities = (params = '') => fetchApi(`/facilities${params ? `?${params}` : ''}`);
export const getFacilityById = (id) => fetchApi(`/facilities/${id}`);
export const updateFacilityStatus = (id, payload) => fetchApi(`/facilities/${id}/status`, {
  method: 'PUT',
  body: JSON.stringify(payload)
});

// Booking APIs
export const previewAllocation = (payload) => fetchApi('/bookings/preview', {
  method: 'POST',
  body: JSON.stringify(payload)
});

export const createBooking = (payload) => fetchApi('/bookings', {
  method: 'POST',
  body: JSON.stringify(payload)
});

export const getBookings = (params = '') => fetchApi(`/bookings${params ? `?${params}` : ''}`);
export const updateBookingStatus = (id, status, remarks) => fetchApi(`/bookings/${id}/status`, {
  method: 'PUT',
  body: JSON.stringify({ status, remarks })
});

export const runConcurrencyTest = (payload) => fetchApi('/bookings/concurrency-test', {
  method: 'POST',
  body: JSON.stringify(payload)
});

// Analytics APIs
export const getDashboardSummary = () => fetchApi('/analytics/summary');
export const getUtilizationHeatmap = () => fetchApi('/analytics/heatmap');
export const getForecast = (params) => fetchApi(`/analytics/forecast?${new URLSearchParams(params).toString()}`);
export const getDemoUsers = () => fetchApi('/auth/demo-users');
export const loginApi = (email, password) => fetchApi('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
