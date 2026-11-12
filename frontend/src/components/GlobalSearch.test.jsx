import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext.jsx';
import GlobalSearch from './GlobalSearch.jsx';
import { listStudyMaterials } from '../services/studyMaterialService.js';
import { getStudyPlanData } from '../services/studyPlanService.js';

vi.mock('../services/studyMaterialService.js', () => ({
  listStudyMaterials: vi.fn(),
}));

vi.mock('../services/studyPlanService.js', () => ({
  getStudyPlanData: vi.fn(),
}));

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{`${location.pathname}${location.hash}`}</output>;
}

function renderSearch() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <GlobalSearch />
        <CurrentPath />
      </AuthProvider>
    </MemoryRouter>
  );
}

function searchFor(query) {
  const input = screen.getByRole('combobox', { name: 'Search LearnPath' });
  fireEvent.click(input);
  fireEvent.change(input, { target: { value: query } });
  return input;
}

describe('GlobalSearch', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ _id: 'student-1' }));
    getStudyPlanData.mockResolvedValue({
      subjects: [{
        _id: 'dbms-subject',
        name: 'DBMS',
        description: 'Database systems',
        topics: [{ _id: 'topic-1', name: 'Relational Algebra', status: 'Not Started' }],
      }],
      targets: [],
    });
    listStudyMaterials.mockResolvedValue([{
      _id: 'material-1',
      originalName: 'Database Normalization.pdf',
      subjectName: 'DBMS',
    }]);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('finds Quiz case-insensitively and opens the page with a mouse click', async () => {
    renderSearch();
    searchFor('qUiZ');

    fireEvent.click(await screen.findByRole('option', { name: /Practice Quizzes/ }));
    expect(screen.getByTestId('current-path').textContent).toBe('/quizzes');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('finds DBMS and an existing topic and opens their study-plan anchors', async () => {
    renderSearch();
    searchFor('DBMS');

    fireEvent.click(await screen.findByRole('option', { name: /^DBMS Subject/ }));
    expect(screen.getByTestId('current-path').textContent).toBe('/study-plan#subject-dbms-subject');

    searchFor('relational algebra');
    fireEvent.click(await screen.findByRole('option', { name: /Relational Algebra/ }));
    expect(screen.getByTestId('current-path').textContent).toBe('/study-plan#topic-topic-1');
  });

  it('finds an uploaded material by file name and links to its existing section', async () => {
    renderSearch();
    searchFor('normalization');

    fireEvent.click(await screen.findByRole('option', { name: /Database Normalization\.pdf/ }));
    expect(screen.getByTestId('current-path').textContent).toBe('/study-materials#material-material-1');
  });

  it('shows a no-results message for an unknown keyword', async () => {
    renderSearch();
    searchFor('unmatched-keyword');

    expect(await screen.findByText('No results found')).toBeTruthy();
  });

  it('opens with Ctrl+K, closes with Escape, and opens a result with arrow keys and Enter', async () => {
    renderSearch();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    const input = screen.getByRole('combobox', { name: 'Search LearnPath' });
    expect(input.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(input.getAttribute('aria-expanded')).toBe('false'));

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.change(input, { target: { value: 'Quiz' } });
    await screen.findByRole('option', { name: /Practice Quizzes/ });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('current-path').textContent).toBe('/quizzes');
  });
});
