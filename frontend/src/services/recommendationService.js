const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

export async function getLearningRecommendations() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please log in to view personalized recommendations.');

  const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The recommendation service returned an invalid response.');
  }
  if (!response.ok) {
    const error = new Error(result.message || 'Could not load learning recommendations.');
    error.status = response.status;
    throw error;
  }
  if (!result.success || !result.data) {
    throw new Error('The recommendation service returned incomplete data.');
  }
  return result.data;
}
