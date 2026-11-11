const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

export async function sendTutorMessage(message, { history = [], documentIds = [] } = {}) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please log in to use the AI Tutor.');

  const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, history, documentIds }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The server returned an invalid response. Please try again.');
  }
  if (!response.ok) {
    const error = new Error(data.message || 'The AI Tutor request failed.');
    error.status = response.status;
    error.documentIds = Array.isArray(data.documentIds) ? data.documentIds : [];
    throw error;
  }
  const responseText = data.answer || data.response;
  if (typeof responseText !== 'string' || !responseText.trim()) {
    throw new Error('The AI Tutor returned an empty response. Please try again.');
  }
  if (data.sources !== undefined && !Array.isArray(data.sources)) {
    throw new Error('The AI Tutor returned invalid document references. Please try again.');
  }
  return { response: responseText, sources: data.sources || [] };
}
