const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:5000';

async function request(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please log in to manage your study plan.');

  const response = await fetch(`${API_BASE_URL}/api/study-plan${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Study plan request failed');
  return data;
}

export const getStudyPlanData = async () => {
  const [subjectData, targetData] = await Promise.all([
    request('/subjects'),
    request('/targets'),
  ]);
  return { subjects: subjectData.subjects, targets: targetData.targets };
};

export const createSubject = (subject) =>
  request('/subjects', { method: 'POST', body: subject });
export const updateSubject = (id, subject) =>
  request(`/subjects/${id}`, { method: 'PUT', body: subject });
export const deleteSubject = (id) =>
  request(`/subjects/${id}`, { method: 'DELETE' });
export const createTopic = (subjectId, topic) =>
  request(`/subjects/${subjectId}/topics`, { method: 'POST', body: topic });
export const updateTopic = (subjectId, topicId, topic) =>
  request(`/subjects/${subjectId}/topics/${topicId}`, { method: 'PUT', body: topic });
export const deleteTopic = (subjectId, topicId) =>
  request(`/subjects/${subjectId}/topics/${topicId}`, { method: 'DELETE' });
export const createTarget = (target) =>
  request('/targets', { method: 'POST', body: target });
export const updateTarget = (id, target) =>
  request(`/targets/${id}`, { method: 'PUT', body: target });
export const deleteTarget = (id) =>
  request(`/targets/${id}`, { method: 'DELETE' });
