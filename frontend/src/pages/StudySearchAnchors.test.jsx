import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext.jsx';
import StudyMaterials from './StudyMaterials.jsx';
import StudyPlan from './StudyPlan.jsx';
import { getStudentProfile } from '../services/api.js';
import {
  getStudyPlanData,
} from '../services/studyPlanService.js';
import { listStudyMaterials } from '../services/studyMaterialService.js';

vi.mock('../services/api.js', () => ({
  getStudentProfile: vi.fn(),
}));

vi.mock('../components/StudyTimer.jsx', () => ({
  default: () => <div />,
}));

vi.mock('../services/studyPlanService.js', () => ({
  createSubject: vi.fn(),
  createTarget: vi.fn(),
  createTopic: vi.fn(),
  deleteSubject: vi.fn(),
  deleteTarget: vi.fn(),
  deleteTopic: vi.fn(),
  getStudyPlanData: vi.fn(),
  updateSubject: vi.fn(),
  updateTarget: vi.fn(),
  updateTopic: vi.fn(),
}));

vi.mock('../services/studyMaterialService.js', () => ({
  deleteStudyMaterial: vi.fn(),
  indexStudyMaterial: vi.fn(),
  listStudyMaterials: vi.fn(),
  uploadStudyMaterial: vi.fn(),
  viewStudyMaterial: vi.fn(),
}));

const originalScrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');

describe('search destination anchors', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ _id: 'student-1' }));
    getStudentProfile.mockResolvedValue({ success: false });
    getStudyPlanData.mockResolvedValue({
      subjects: [{
        _id: 'subject-1',
        name: 'DBMS',
        topics: [{ _id: 'topic-1', name: 'Relational Algebra', status: 'Not Started' }],
      }],
      targets: [],
    });
    listStudyMaterials.mockResolvedValue([{
      _id: 'material-1',
      originalName: 'Database Normalization.pdf',
      subjectName: 'DBMS',
      sizeBytes: 1024,
      pageCount: 1,
      uploadedAt: '2026-01-01T00:00:00.000Z',
      indexingStatus: 'indexed',
    }]);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    if (originalScrollDescriptor) {
      Object.defineProperty(Element.prototype, 'scrollIntoView', originalScrollDescriptor);
    } else {
      delete Element.prototype.scrollIntoView;
    }
    vi.clearAllMocks();
  });

  it('scrolls to the selected study-plan topic after loading it', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    window.history.replaceState(null, '', '/study-plan#topic-topic-1');

    render(
      <MemoryRouter initialEntries={['/study-plan#topic-topic-1']}>
        <AuthProvider><StudyPlan /></AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Relational Algebra')).toBeTruthy();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' }));
    expect(document.getElementById('topic-topic-1')).toBeTruthy();
  });

  it('scrolls to the selected material after loading it', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    window.history.replaceState(null, '', '/study-materials#material-material-1');

    render(
      <MemoryRouter initialEntries={['/study-materials#material-material-1']}>
        <AuthProvider><StudyMaterials /></AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Database Normalization.pdf')).toBeTruthy();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' }));
    expect(document.getElementById('material-material-1')).toBeTruthy();
  });
});
