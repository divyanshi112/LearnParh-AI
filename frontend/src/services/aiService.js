const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

export async function sendTutorMessage(message) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please log in to use the AI Tutor.');

  const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The server returned an invalid response. Please try again.');
  }
  if (!response.ok) throw new Error(data.message || 'The AI Tutor request failed.');
  if (typeof data.response !== 'string' || !data.response.trim()) {
    throw new Error('The AI Tutor returned an empty response. Please try again.');
  }
  return data.response;
}
