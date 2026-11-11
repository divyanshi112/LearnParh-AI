/**
 * LearnPath AI - Frontend API Service
 * Centralizes all HTTP communication between React frontend and Express backend.
 */

// API Base URL from Vite environment variable with safe fallback for all environments
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:5000';

/**
 * Fetches the backend health status from GET /api/health
 *
 * @returns {Promise<{success: boolean, data: object|null, error: string|null, latencyMs: number}>}
 */
export async function fetchHealthStatus() {
  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);
    if (!response.ok) {
      throw new Error(`Server returned status HTTP ${response.status} (${response.statusText || 'Error'})`);
    }
    const data = await response.json();
    return { success: true, data, error: null, latencyMs };
  } catch (err) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);
    let message = err.message;
    if (err.name === 'AbortError') {
      message = 'Request timed out after 6 seconds. The backend server did not respond.';
    } else if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      message = `Cannot reach backend at ${API_BASE_URL}. Ensure the Express server is running.`;
    }
    return { success: false, data: null, error: message, latencyMs };
  }
}

/**
 * Login user with email and password.
 * Returns { success: boolean, token?: string, user?: object, message?: string }
 */
export async function loginUser({ email, password }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      if (!data.success || typeof data.token !== 'string' || !data.token || !data.user) {
        return { success: false, message: 'The server returned an incomplete sign-in response. Please try again.' };
      }
      return { success: true, token: data.token, user: data.user };
    }
    return { success: false, message: data.message || 'Login failed' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Register a new user.
 * Returns { success: boolean, message?: string }
 */
export async function registerUser({ name, email, password }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, message: data.message };
    }
    return { success: false, message: data.message || 'Registration failed' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function requestStudentProfile(method, body) {
  const token = localStorage.getItem('token');
  if (!token) {
    return { success: false, status: 401, message: 'Please log in to access your profile.' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    return response.ok
      ? { success: true, ...data }
      : {
          success: false,
          status: response.status,
          message: data.message || 'Profile request failed',
          errors: data.errors,
        };
  } catch (err) {
    return { success: false, message: err.message || 'Unable to reach the server.' };
  }
}

export const getStudentProfile = () => requestStudentProfile('GET');
export const createStudentProfile = (profile) => requestStudentProfile('POST', profile);
export const updateStudentProfile = (profile) => requestStudentProfile('PUT', profile);

// Backward-compatible alias
export const getBackendHealth = fetchHealthStatus;
