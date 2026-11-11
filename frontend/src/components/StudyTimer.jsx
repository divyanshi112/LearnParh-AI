import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Clock3, LoaderCircle, Pause, Play, Square } from 'lucide-react';
import {
  createManualStudySession,
  getCurrentStudySession,
  startStudySession,
  updateStudySession,
} from '../services/studySessionService.js';

const localDateTimeValue = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const formatElapsed = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((part) => String(part).padStart(2, '0')).join(':');
};

const makeEntryKey = () => (
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

export default function StudyTimer({ subjects = [], onSessionSaved }) {
  const [session, setSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const actionInProgress = useRef(false);
  const [manualOpen, setManualOpen] = useState(false);
  const manualEntryKey = useRef('');
  const [manualStartTime, setManualStartTime] = useState(
    () => localDateTimeValue(new Date(Date.now() - 30 * 60_000))
  );
  const [manualDuration, setManualDuration] = useState('30');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedSubject = subjects.find((subject) => String(subject._id || subject.id) === subjectId);
  const topics = selectedSubject?.topics || [];
  const selectedTopic = topics.find((topic) => String(topic._id || topic.id) === topicId);
  const active = session?.status === 'running' || session?.status === 'paused';
  const displayedSubjectId = session ? String(session.subject) : subjectId;
  const displayedTopicId = session ? String(session.topic) : topicId;

  const loadActiveSession = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const current = await getCurrentStudySession();
      setSession(current);
      setElapsedSeconds(current?.elapsedSeconds || 0);
      if (current) {
        setSubjectId(String(current.subject));
        setTopicId(String(current.topic));
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not restore your active study session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  useEffect(() => {
    if (session?.status !== 'running') return undefined;
    const tick = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    const heartbeat = window.setInterval(async () => {
      try {
        const updated = await updateStudySession(session._id, 'heartbeat');
        setSession(updated);
        setElapsedSeconds(updated.elapsedSeconds || 0);
        if (updated.status !== 'running') {
          setNotice('Your timer was paused after being inactive. Resume when you are ready.');
        }
      } catch (requestError) {
        setError(requestError.message || 'The study timer could not save its active state.');
      }
    }, 15_000);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(heartbeat);
    };
  }, [session?._id, session?.status]);

  const handleStart = async () => {
    if (actionInProgress.current || saving) return;
    if (!selectedSubject || !selectedTopic) {
      setError('Select a subject and topic from your study plan before starting the timer.');
      return;
    }
    actionInProgress.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const started = await startStudySession(subjectId, topicId);
      setSession(started);
      setElapsedSeconds(started.elapsedSeconds || 0);
    } catch (requestError) {
      setError(requestError.message || 'Could not start this study session.');
      if (requestError.status === 409) await loadActiveSession();
    } finally {
      actionInProgress.current = false;
      setSaving(false);
    }
  };

  const handleAction = async (action) => {
    if (!session || actionInProgress.current || saving) return;
    actionInProgress.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await updateStudySession(session._id, action);
      if (action === 'finish') {
        setSession(null);
        setElapsedSeconds(0);
        setNotice(`Study session saved: ${updated.durationMinutes} minutes on ${updated.topicName}.`);
        await onSessionSaved?.(updated);
      } else {
        setSession(updated);
        setElapsedSeconds(updated.elapsedSeconds || 0);
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not update this study session.');
      if (requestError.status === 404) await loadActiveSession();
    } finally {
      actionInProgress.current = false;
      setSaving(false);
    }
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    if (actionInProgress.current || saving) return;
    if (!selectedSubject || !selectedTopic) {
      setError('Select a subject and topic from your study plan before saving study time.');
      return;
    }
    actionInProgress.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const start = new Date(manualStartTime);
      if (!manualEntryKey.current) manualEntryKey.current = makeEntryKey();
      const saved = await createManualStudySession({
        subjectId,
        topicId,
        startTime: start.toISOString(),
        durationMinutes: Number(manualDuration),
        entryKey: manualEntryKey.current,
      });
      setManualOpen(false);
      manualEntryKey.current = '';
      setNotice(`Manual study time saved: ${saved.durationMinutes} minutes on ${saved.topicName}.`);
      await onSessionSaved?.(saved);
    } catch (requestError) {
      setError(requestError.message || 'Could not save your manual study time.');
    } finally {
      actionInProgress.current = false;
      setSaving(false);
    }
  };

  const subjectOptions = useMemo(() => subjects.map((subject) => ({
    id: String(subject._id || subject.id),
    name: subject.name,
    topics: subject.topics || [],
  })), [subjects]);

  return (
    <section className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-brand-blue-light">
            <Clock3 className="h-4 w-4" />
            <h3 className="text-base font-semibold text-white">Study timer</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Track focused study time by subject and topic. Paused time is not counted.
          </p>
        </div>
        {session && (
          <span className={`rounded-md border px-2 py-1 text-[11px] ${
            session.status === 'running'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
          }`}>
            {session.status === 'running' ? 'In progress' : 'Paused'}
          </span>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && <p role="status" className="mt-3 text-xs text-emerald-300">{notice}</p>}

      {loading ? (
        <div className="flex min-h-28 items-center justify-center text-sm text-slate-400" role="status">
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Restoring your study timer...
        </div>
      ) : subjects.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">
          Add a subject and topic to your study plan before tracking study time.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-300">
              Subject
              <select
                value={displayedSubjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setTopicId('');
                }}
                disabled={Boolean(active) || saving}
                className="field-control mt-1.5 w-full px-3 py-2 text-sm"
              >
                <option value="">Select a subject</option>
                {subjectOptions.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-300">
              Topic
              <select
                value={displayedTopicId}
                onChange={(event) => setTopicId(event.target.value)}
                disabled={Boolean(active) || saving || !topics.length}
                className="field-control mt-1.5 w-full px-3 py-2 text-sm"
              >
                <option value="">Select a topic</option>
                {topics.map((topic) => (
                  <option key={topic._id || topic.id} value={topic._id || topic.id}>{topic.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {active ? (
              <>
                <p className="mr-2 min-w-28 font-mono text-2xl font-semibold tabular-nums text-white" aria-live="off">
                  {formatElapsed(elapsedSeconds)}
                </p>
                {session.status === 'running' ? (
                  <button type="button" onClick={() => handleAction('pause')} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-dark-800 disabled:opacity-50">
                    <Pause className="h-4 w-4" /> Pause
                  </button>
                ) : (
                  <button type="button" onClick={() => handleAction('resume')} disabled={saving} className="button-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-50">
                    <Play className="h-4 w-4" /> Resume
                  </button>
                )}
                <button type="button" onClick={() => handleAction('finish')} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-950/30 disabled:opacity-50">
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                  Finish
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleStart} disabled={saving} className="button-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-50">
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {saving ? 'Starting session...' : 'Start session'}
                </button>
                <button type="button" onClick={() => setManualOpen((open) => {
                  if (open) manualEntryKey.current = '';
                  return !open;
                })} disabled={saving || !selectedTopic} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-dark-800 disabled:opacity-50">
                  {manualOpen ? 'Cancel manual entry' : 'Add time manually'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {session && (
        <p className="mt-3 text-xs text-slate-400">
          {session.subjectName} · {session.topicName}
        </p>
      )}

      {manualOpen && !active && (
        <form onSubmit={handleManualSubmit} className="mt-4 grid gap-3 rounded-lg border border-slate-800 bg-dark-850 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-xs font-medium text-slate-300">
            Session started
            <input
              type="datetime-local"
              value={manualStartTime}
              onChange={(event) => setManualStartTime(event.target.value)}
              max={localDateTimeValue(new Date())}
              required
              className="field-control mt-1.5 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-300">
            Duration (minutes)
            <input
              type="number"
              min="1"
              max="1440"
              step="1"
              value={manualDuration}
              onChange={(event) => setManualDuration(event.target.value)}
              required
              className="field-control mt-1.5 w-full px-3 py-2 text-sm"
            />
          </label>
          <button type="submit" disabled={saving} className="button-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-medium disabled:opacity-50">
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Save study time
          </button>
        </form>
      )}
    </section>
  );
}
