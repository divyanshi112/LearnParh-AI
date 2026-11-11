const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

export async function getDashboardData() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please log in to view your dashboard.');

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const response = await fetch(
    `${API_BASE_URL}/api/study-plan/dashboard?timeZone=${encodeURIComponent(timeZone)}`,
    {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    }
  );

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The server returned an invalid dashboard response.');
  }

  if (!response.ok) {
    const error = new Error(result.message || 'Could not load your dashboard.');
    error.status = response.status;
    throw error;
  }
  if (!result.success || !result.data) {
    throw new Error('The server returned incomplete dashboard data.');
  }

  return result.data;
}
