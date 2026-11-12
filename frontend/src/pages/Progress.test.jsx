import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext.jsx';
import Progress from './Progress.jsx';
import { getDashboardData } from '../services/dashboardService.js';

vi.mock('../components/DashboardLayout', () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock('../components/WeeklyActivityChart', () => ({
  default: ({ data }) => <output data-testid="weekly-activity">{JSON.stringify(data)}</output>,
}));

vi.mock('../services/dashboardService.js', () => ({
  getDashboardData: vi.fn(),
}));

const activity = [
  { date: '2026-11-09', day: 'Mon', hours: 3.5, sessions: 2, target: 2, quizzes: 0 },
  ...['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => ({
    date: `2026-11-${String(index + 10).padStart(2, '0')}`,
    day,
    hours: 0,
    sessions: 0,
    target: 2,
    quizzes: 0,
  })),
];

function renderProgress() {
  return render(
    <MemoryRouter>
      <AuthProvider><Progress /></AuthProvider>
    </MemoryRouter>
  );
}

describe('Progress weekly activity', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ _id: 'student-1' }));
    getDashboardData.mockResolvedValue({ weeklyActivity: activity });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('fetches the shared dashboard activity and passes it to the chart', async () => {
    const { unmount } = renderProgress();

    const chartData = await screen.findByTestId('weekly-activity');
    expect(JSON.parse(chartData.textContent)[0]).toMatchObject({
      date: '2026-11-09',
      day: 'Mon',
      hours: 3.5,
      sessions: 2,
    });
    expect(getDashboardData).toHaveBeenCalledTimes(1);

    unmount();
    renderProgress();
    await screen.findByTestId('weekly-activity');
    await waitFor(() => expect(getDashboardData).toHaveBeenCalledTimes(2));
  });
});
