import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WeeklyActivityChart from './WeeklyActivityChart.jsx';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  AreaChart: ({ data, children }) => (
    <div data-testid="curve-chart" data-hours={data.map((entry) => entry.hours).join(',')}>
      {React.Children.toArray(children).filter((child) => child.type !== 'defs')}
    </div>
  ),
  Area: ({ dataKey }) => <span data-testid={`series-${dataKey}`} />,
  ComposedChart: ({ data, children }) => (
    <div data-testid="bar-chart" data-hours={data.map((entry) => entry.hours).join(',')}>{children}</div>
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Bar: ({ dataKey }) => <span data-testid={`series-${dataKey}`} />,
  Line: ({ dataKey }) => <span data-testid={`series-${dataKey}`} />,
}));

const data = [
  { date: '2026-11-09', day: 'Mon', hours: 3.5, sessions: 1, target: 2, quizzes: 0 },
  ...['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => ({
    date: `2026-11-${String(index + 10).padStart(2, '0')}`,
    day,
    hours: 0,
    sessions: 0,
    target: 2,
    quizzes: 0,
  })),
];

describe('WeeklyActivityChart', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('preserves the same daily hours and target line when switching chart views', () => {
    render(<WeeklyActivityChart data={data} />);

    expect(screen.getByText(/Total this week:/)).toBeTruthy();
    expect(screen.getByText('3.5 hrs')).toBeTruthy();
    expect(screen.getByTestId('curve-chart').getAttribute('data-hours')).toBe('3.5,0,0,0,0,0,0');
    expect(screen.getByTestId('series-target')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Curve' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Bars' }));
    expect(screen.getByRole('button', { name: 'Bars' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('bar-chart').getAttribute('data-hours')).toBe('3.5,0,0,0,0,0,0');
    expect(screen.getByTestId('series-target')).toBeTruthy();
    expect(screen.getByText('3.5 hrs')).toBeTruthy();
  });

  it('does not show an empty state when a real zero-duration session is present', () => {
    const zeroDurationSession = data.map((entry, index) => ({
      ...entry,
      sessions: index === 0 ? 1 : 0,
      hours: 0,
      quizzes: 0,
    }));

    render(<WeeklyActivityChart data={zeroDurationSession} />);
    expect(screen.queryByText('No study activity has been recorded this week.')).toBeNull();
    expect(screen.getByTestId('curve-chart')).toBeTruthy();
  });
});
