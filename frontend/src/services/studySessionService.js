const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

async function request(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please log in to track study time.');

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/study-sessions${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (requestError) {
    const error = new Error(
      'Could not reach the study timer service. Check your connection and try again.'
    );
    error.cause = requestError;
    throw error;
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The study timer service returned an invalid response.');
  }
  if (!response.ok) {
    const error = new Error(result.message || 'Could not update your study session.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function getCurrentStudySession() {
  const result = await request('/current');
  return result.session || null;
}

export async function startStudySession(subjectId, topicId) {
  const result = await request('/start', {
    method: 'POST',
    body: { subjectId, topicId },
  });
  return result.session;
}

export async function updateStudySession(sessionId, action) {
  const result = await request(`/${encodeURIComponent(sessionId)}/${action}`, {
    method: 'POST',
    body: {},
  });
  return result.session;
}

export async function createManualStudySession({
  subjectId,
  topicId,
  startTime,
  durationMinutes,
  entryKey,
}) {
  const result = await request('/manual', {
    method: 'POST',
    body: { subjectId, topicId, startTime, durationMinutes, entryKey },
  });
  return result.session;
}
