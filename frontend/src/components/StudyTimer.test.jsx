import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudyTimer from './StudyTimer.jsx';
import {
  getCurrentStudySession,
  startStudySession,
  updateStudySession,
} from '../services/studySessionService.js';

vi.mock('../services/studySessionService.js', () => ({
  createManualStudySession: vi.fn(),
  getCurrentStudySession: vi.fn(),
  startStudySession: vi.fn(),
  updateStudySession: vi.fn(),
}));

const subjects = [{
  _id: 'subject-1',
  name: 'Math',
  topics: [{ _id: 'topic-1', name: 'Algebra' }],
}];

const sessionWith = (status, { durationSeconds = 0, runningSince = null } = {}) => ({
  _id: 'session-1',
  subject: 'subject-1',
  topic: 'topic-1',
  subjectName: 'Math',
  topicName: 'Algebra',
  status,
  durationSeconds,
  elapsedSeconds: durationSeconds,
  runningSince,
});

async function flushRequests() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('StudyTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
    getCurrentStudySession.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('starts, pauses, resumes, and finishes with only active time counted', async () => {
    const onSessionSaved = vi.fn();
    const { container } = render(
      <StudyTimer subjects={subjects} onSessionSaved={onSessionSaved} />
    );
    await flushRequests();

    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'subject-1' } });
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'topic-1' } });

    startStudySession.mockResolvedValue(sessionWith('running', {
      runningSince: new Date(Date.now()).toISOString(),
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }));
    await flushRequests();
    expect(startStudySession).toHaveBeenCalledWith('subject-1', 'topic-1');

    act(() => {
      vi.advanceTimersByTime(125_000);
    });
    expect(container.textContent).toContain('00:02:05');

    updateStudySession.mockResolvedValueOnce(sessionWith('paused', { durationSeconds: 125 }));
    fireEvent.click(screen.getByRole('button', { name: /Pause/ }));
    await flushRequests();
    expect(container.textContent).toContain('00:02:05');

    act(() => {
      vi.advanceTimersByTime(60 * 60_000);
    });
    expect(container.textContent).toContain('00:02:05');

    updateStudySession.mockResolvedValueOnce(sessionWith('running', {
      durationSeconds: 125,
      runningSince: new Date(Date.now()).toISOString(),
    }));
    fireEvent.click(screen.getByRole('button', { name: /Resume/ }));
    await flushRequests();
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(container.textContent).toContain('00:02:35');

    const completed = {
      ...sessionWith('completed', { durationSeconds: 155 }),
      durationMinutes: 155 / 60,
    };
    updateStudySession.mockResolvedValueOnce(completed);
    fireEvent.click(screen.getByRole('button', { name: /Finish/ }));
    await flushRequests();
    expect(updateStudySession).toHaveBeenLastCalledWith('session-1', 'finish');
    expect(onSessionSaved).toHaveBeenCalledWith(completed);
    expect(container.textContent).toContain('Study session saved:');
  });

  it('keeps elapsed time and a single interval across dashboard re-renders', async () => {
    const { rerender, container, unmount } = render(<StudyTimer subjects={subjects} />);
    await flushRequests();
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'subject-1' } });
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'topic-1' } });
    startStudySession.mockResolvedValue(sessionWith('running', {
      runningSince: new Date(Date.now()).toISOString(),
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }));
    await flushRequests();
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    rerender(<StudyTimer subjects={[...subjects]} />);
    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      vi.advanceTimersByTime(4_000);
    });

    expect(container.textContent).toContain('00:00:07');
    expect(updateStudySession).not.toHaveBeenCalled();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
