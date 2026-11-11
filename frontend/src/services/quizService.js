const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:5000';

async function request(path, body) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please log in to use practice quizzes.');

  const response = await fetch(`${API_BASE_URL}/api/quizzes${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The quiz service returned an invalid response. Please try again.');
  }
  if (!response.ok) throw new Error(data.message || 'Quiz request failed.');
  return data;
}

export const generateQuiz = (settings) => request('/generate', settings);
export const submitQuiz = (submission) => request('/submit', submission);
export const getQuizHistory = () => request('/history');
