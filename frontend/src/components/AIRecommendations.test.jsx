import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AIRecommendations from './AIRecommendations.jsx';
import { getLearningRecommendations } from '../services/recommendationService.js';

vi.mock('../services/recommendationService.js', () => ({
  getLearningRecommendations: vi.fn(),
}));

const response = (averageScore, overallAccuracy) => ({
  analytics: {
    totalAttempts: 3,
    totalQuestions: 20,
    correctAnswers: 9,
    incorrectAnswers: 11,
    averageScore,
    overallAccuracy,
    topics: [],
  },
  recommendations: [],
  overallGuidance: '',
  nextQuizDifficulty: 'Medium',
});

function renderRecommendations() {
  return render(
    <MemoryRouter>
      <AIRecommendations />
    </MemoryRouter>
  );
}

describe('AIRecommendations score metrics', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('never formats a missing average score as undefined%', async () => {
    getLearningRecommendations.mockResolvedValue(response(undefined, 45));
    renderRecommendations();

    const averageScore = await screen.findByText('Average score');
    expect(within(averageScore.parentElement).getByText('—')).toBeTruthy();
    expect(screen.getByText('45%', { selector: 'span' })).toBeTruthy();
    expect(screen.queryByText('undefined%')).toBeNull();
  });

  it('shows updated attempt average and overall accuracy after a fresh load', async () => {
    getLearningRecommendations
      .mockResolvedValueOnce(response(43, 45))
      .mockResolvedValueOnce(response(46, 47));
    const firstRender = renderRecommendations();

    let averageScore = await screen.findByText('Average score');
    expect(within(averageScore.parentElement).getByText('43%')).toBeTruthy();
    expect(screen.getByText('45%', { selector: 'span' })).toBeTruthy();

    firstRender.unmount();
    renderRecommendations();
    averageScore = await screen.findByText('Average score');
    expect(within(averageScore.parentElement).getByText('46%')).toBeTruthy();
    expect(screen.getByText('47%', { selector: 'span' })).toBeTruthy();
    expect(getLearningRecommendations).toHaveBeenCalledTimes(2);
  });
});
