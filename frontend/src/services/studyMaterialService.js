const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please log in to manage study materials.');

  const response = await fetch(`${API_BASE_URL}/api/study-materials${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The study materials service returned an invalid response.');
  }
  if (!response.ok) {
    const error = new Error(data.message || 'Study material request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function listStudyMaterials() {
  const result = await request('/');
  if (!Array.isArray(result.documents)) {
    throw new Error('The study materials service returned an invalid document list.');
  }
  return result.documents;
}

export async function uploadStudyMaterial(file, subjectId = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (subjectId) formData.append('subjectId', subjectId);
  const result = await request('/', { method: 'POST', body: formData });
  if (!result.document) {
    throw new Error('The study materials service did not return the uploaded document.');
  }
  return result.document;
}

export async function indexStudyMaterial(documentId) {
  const result = await request(`/${encodeURIComponent(documentId)}/index`, { method: 'POST' });
  if (!result.document || !['indexed', 'ready'].includes(result.document.indexingStatus)) {
    throw new Error('The PDF was not indexed successfully.');
  }
  return result.document;
}

export async function deleteStudyMaterial(documentId) {
  return request(`/${encodeURIComponent(documentId)}`, { method: 'DELETE' });
}

export async function viewStudyMaterial(documentId, onOpen) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please log in to view study materials.');

  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    throw new Error('Allow pop-ups to view this PDF.');
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/study-materials/${encodeURIComponent(documentId)}/file`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) {
      let message = 'Could not open this study material.';
      try {
        const data = await response.json();
        message = data.message || message;
      } catch {
        message = 'The study materials service returned an invalid response.';
      }
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    previewWindow.location.href = objectUrl;
    onOpen?.();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    previewWindow.close();
    throw error;
  }
}
