import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import StudyTimer from '../components/StudyTimer.jsx';
import {
  createSubject,
  createTarget,
  createTopic,
  deleteSubject,
  deleteTarget,
  deleteTopic,
  getStudyPlanData,
  updateSubject,
  updateTarget,
  updateTopic,
} from '../services/studyPlanService.js';

const TOPIC_STATUSES = ['Not Started', 'In Progress', 'Completed'];
const EMPTY_SUBJECT = { name: '', description: '' };
const EMPTY_TOPIC = { name: '', status: 'Not Started' };
const EMPTY_TARGET = { title: '', subjectId: '', topicId: '', targetDate: '', completed: false };

const dateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const displayDate = (value) => new Date(value).toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export default function StudyPlan() {
  const [subjects, setSubjects] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStudyPlanData();
      setSubjects(data.subjects);
      setTargets(data.targets);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const topicNames = useMemo(() => {
    const names = new Map();
    subjects.forEach((subject) => {
      subject.topics.forEach((topic) => names.set(String(topic._id), topic.name));
    });
    return names;
  }, [subjects]);

  const showDialog = (type, record = null, subjectId = '') => {
    setError('');
    setNotice('');
    setDialog({ type, record, subjectId });
    if (type === 'subject') {
      setForm(record ? { name: record.name, description: record.description || '' } : EMPTY_SUBJECT);
    } else if (type === 'topic') {
      setForm(record ? { name: record.name, status: record.status } : EMPTY_TOPIC);
    } else {
      setForm(record
        ? {
            title: record.title,
            subjectId: String(record.subject?._id || record.subject),
            topicId: record.topic ? String(record.topic) : '',
            targetDate: dateInputValue(record.targetDate),
            completed: record.completed,
          }
        : { ...EMPTY_TARGET, subjectId: subjectId || subjects[0]?._id || '' });
    }
  };

  const closeDialog = () => setDialog(null);
  const setField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const submitDialog = async (event) => {
    event.preventDefault();
    if (!dialog) return;
    setSaving(true);
    setError('');
    try {
      if (dialog.type === 'subject') {
        if (dialog.record) await updateSubject(dialog.record._id, form);
        else await createSubject(form);
      } else if (dialog.type === 'topic') {
        if (dialog.record) {
          await updateTopic(dialog.subjectId, dialog.record._id, form);
        } else {
          await createTopic(dialog.subjectId, form);
        }
      } else {
        const target = {
          ...form,
          topicId: form.topicId || null,
        };
        if (dialog.record) await updateTarget(dialog.record._id, target);
        else await createTarget(target);
      }
      closeDialog();
      if (await loadData()) setNotice('Your study plan has been updated.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const removeSubject = async (subject) => {
    if (!window.confirm(`Delete "${subject.name}" and its topics and study targets?`)) return;
    try {
      setError('');
      await deleteSubject(subject._id);
      if (await loadData()) setNotice('Subject and its study targets were deleted.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeTopic = async (subject, topic) => {
    if (!window.confirm(`Delete "${topic.name}" and any targets linked to it?`)) return;
    try {
      setError('');
      await deleteTopic(subject._id, topic._id);
      if (await loadData()) setNotice('Topic and its linked targets were deleted.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeTarget = async (target) => {
    if (!window.confirm(`Delete "${target.title}"?`)) return;
    try {
      setError('');
      await deleteTarget(target._id);
      if (await loadData()) setNotice('Study target deleted.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const toggleTarget = async (target) => {
    try {
      setError('');
      await updateTarget(target._id, { completed: !target.completed });
      if (await loadData()) {
        setNotice(target.completed ? 'Target marked as not completed.' : 'Target completed.');
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const dialogTitle = dialog?.type === 'subject'
    ? `${dialog.record ? 'Edit' : 'Add'} subject`
    : dialog?.type === 'topic'
      ? `${dialog.record ? 'Edit' : 'Add'} topic`
      : `${dialog?.record ? 'Edit' : 'Create'} study target`;

  return (
    <DashboardLayout pageTitle="My Study Plan">
      <div className="space-y-6">
        <section className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-dark-900 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-slate-400">
              <BookOpen className="h-4 w-4" />
              <span>Your learning, organized</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">My Study Plan</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Organize subjects and topics, then set daily targets to keep your learning on track.
            </p>
          </div>
          <button
            type="button"
            onClick={() => showDialog('target')}
            disabled={!subjects.length}
            className="button-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New target
          </button>
        </section>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {notice}
          </div>
        )}

        <StudyTimer
          subjects={subjects}
          onSessionSaved={async () => {
            await loadData();
            setNotice('Study time saved and added to your dashboard activity.');
          }}
        />

        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-slate-400" role="status">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading your study plan...
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Subjects</h3>
                  <p className="text-sm text-slate-400">Add topics and track their progress.</p>
                </div>
                <button
                  type="button"
                  onClick={() => showDialog('subject')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-dark-900 px-3.5 py-2 text-sm font-medium text-slate-200 hover:border-brand-blue"
                >
                  <Plus className="h-4 w-4" />
                  Add subject
                </button>
              </div>

              {subjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-dark-900 px-5 py-10 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-slate-500" />
                  <h4 className="mt-3 font-semibold text-white">No subjects yet</h4>
                  <p className="mt-1 text-sm text-slate-400">Add your first subject to start building your plan.</p>
                  <button
                    type="button"
                    onClick={() => showDialog('subject')}
                    className="button-primary mt-4 rounded-lg px-4 py-2 text-sm font-medium"
                  >
                    Add your first subject
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {subjects.map((subject) => (
                    <article key={subject._id} className="rounded-xl border border-slate-800 bg-dark-900 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="break-words text-base font-semibold text-white">{subject.name}</h4>
                          {subject.description && (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{subject.description}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => showDialog('subject', subject)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-dark-800 hover:text-white"
                            aria-label={`Edit ${subject.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSubject(subject)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                            aria-label={`Delete ${subject.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-slate-800 pt-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Topics ({subject.topics.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => showDialog('topic', null, subject._id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue-light hover:text-white"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add topic
                          </button>
                        </div>
                        {subject.topics.length === 0 ? (
                          <p className="py-2 text-sm text-slate-500">No topics added yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {subject.topics.map((topic) => (
                              <li key={topic._id} className="flex flex-wrap items-center gap-2 rounded-xl bg-dark-800/70 px-3 py-2">
                                <span className="min-w-0 flex-1 break-words text-sm text-slate-200">{topic.name}</span>
                                <select
                                  value={topic.status}
                                  onChange={async (event) => {
                                    try {
                                      setError('');
                                      await updateTopic(subject._id, topic._id, { status: event.target.value });
                                      if (await loadData()) setNotice('Topic status updated.');
                                    } catch (requestError) {
                                      setError(requestError.message);
                                    }
                                  }}
                                  className="max-w-36 rounded-lg border border-slate-700 bg-dark-900 px-2 py-1 text-xs text-slate-200 focus:border-brand-blue focus:outline-none"
                                  aria-label={`Status for ${topic.name}`}
                                >
                                  {TOPIC_STATUSES.map((status) => <option key={status}>{status}</option>)}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => showDialog('topic', topic, subject._id)}
                                  className="rounded-md p-1 text-slate-500 hover:text-white"
                                  aria-label={`Edit ${topic.name}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeTopic(subject, topic)}
                                  className="rounded-md p-1 text-slate-500 hover:text-rose-300"
                                  aria-label={`Delete ${topic.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Daily study targets</h3>
                  <p className="text-sm text-slate-400">Plan a task for a subject and mark it complete when done.</p>
                </div>
                {subjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => showDialog('target')}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-dark-900 px-3.5 py-2 text-sm font-medium text-slate-200 hover:border-brand-blue"
                  >
                    <Plus className="h-4 w-4" />
                    Add target
                  </button>
                )}
              </div>

              {targets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-dark-900 px-5 py-10 text-center">
                  <Target className="mx-auto h-8 w-8 text-slate-500" />
                  <h4 className="mt-3 font-semibold text-white">No study targets yet</h4>
                  <p className="mt-1 text-sm text-slate-400">
                    {subjects.length ? 'Create a target to plan your next study session.' : 'Add a subject before creating a target.'}
                  </p>
                  {subjects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => showDialog('target')}
                      className="button-primary mt-4 rounded-lg px-4 py-2 text-sm font-medium"
                    >
                      Create a target
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {targets.map((target) => (
                    <article key={target._id} className={`flex flex-col gap-3 rounded-xl border bg-dark-900 p-4 sm:flex-row sm:items-center ${target.completed ? 'border-emerald-500/20' : 'border-slate-800'}`}>
                      <button
                        type="button"
                        onClick={() => toggleTarget(target)}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${target.completed ? 'bg-emerald-500/10 text-emerald-300' : 'bg-dark-800 text-slate-500 hover:text-brand-blue-light'}`}
                        aria-label={target.completed ? `Mark ${target.title} incomplete` : `Complete ${target.title}`}
                      >
                        {target.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <h4 className={`break-words font-medium ${target.completed ? 'text-slate-400 line-through' : 'text-white'}`}>
                          {target.title}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span>{target.subject?.name || 'Subject unavailable'}</span>
                          {target.topic && topicNames.get(String(target.topic)) && (
                            <span>{topicNames.get(String(target.topic))}</span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {displayDate(target.targetDate)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => showDialog('target', target)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-dark-800 hover:text-white"
                          aria-label={`Edit ${target.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTarget(target)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                          aria-label={`Delete ${target.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {dialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) closeDialog();
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="study-plan-dialog-title"
            className="my-auto w-full max-w-lg rounded-xl border border-slate-700 bg-dark-900 p-5 sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 id="study-plan-dialog-title" className="text-lg font-semibold text-white">{dialogTitle}</h3>
              <button type="button" onClick={closeDialog} disabled={saving} className="rounded-lg p-1.5 text-slate-400 hover:bg-dark-800 hover:text-white" aria-label="Close dialog">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitDialog} className="space-y-4">
              {dialog.type === 'subject' && (
                <>
                  <label className="block text-sm text-slate-300">
                    Subject name
                    <input
                      name="name"
                      value={form.name || ''}
                      onChange={setField}
                      required
                      maxLength={100}
                      autoFocus
                      className="field-control mt-1.5 px-3 py-2.5"
                    />
                  </label>
                  <label className="block text-sm text-slate-300">
                    Description <span className="text-slate-500">(optional)</span>
                    <textarea
                      name="description"
                      value={form.description || ''}
                      onChange={setField}
                      maxLength={1000}
                      rows={3}
                      className="field-control mt-1.5 resize-y px-3 py-2.5"
                    />
                  </label>
                </>
              )}
              {dialog.type === 'topic' && (
                <>
                  <label className="block text-sm text-slate-300">
                    Topic name
                    <input
                      name="name"
                      value={form.name || ''}
                      onChange={setField}
                      required
                      maxLength={120}
                      autoFocus
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-dark-950 px-3 py-2.5 text-white outline-none focus:border-brand-purple"
                    />
                  </label>
                  {dialog.record && (
                    <label className="block text-sm text-slate-300">
                      Status
                      <select name="status" value={form.status} onChange={setField} className="field-control mt-1.5 px-3 py-2.5">
                        {TOPIC_STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </label>
                  )}
                </>
              )}
              {dialog.type === 'target' && (
                <>
                  <label className="block text-sm text-slate-300">
                    Target title
                    <input
                      name="title"
                      value={form.title || ''}
                      onChange={setField}
                      required
                      maxLength={160}
                      autoFocus
                      className="field-control mt-1.5 px-3 py-2.5"
                    />
                  </label>
                  <label className="block text-sm text-slate-300">
                    Subject
                    <select
                      name="subjectId"
                      value={form.subjectId || ''}
                      onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value, topicId: '' }))}
                      required
                      className="field-control mt-1.5 px-3 py-2.5"
                    >
                      {subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm text-slate-300">
                    Topic <span className="text-slate-500">(optional)</span>
                    <select
                      name="topicId"
                      value={form.topicId || ''}
                      onChange={setField}
                      className="field-control mt-1.5 px-3 py-2.5"
                    >
                      <option value="">No specific topic</option>
                      {subjects.find((subject) => String(subject._id) === String(form.subjectId))?.topics.map((topic) => (
                        <option key={topic._id} value={topic._id}>{topic.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm text-slate-300">
                    Target date
                    <input
                      type="date"
                      name="targetDate"
                      value={form.targetDate || ''}
                      onChange={setField}
                      required
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-dark-950 px-3 py-2.5 text-white outline-none focus:border-brand-purple"
                    />
                  </label>
                  {dialog.record && (
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" name="completed" checked={Boolean(form.completed)} onChange={setField} className="h-4 w-4 accent-purple-500" />
                      Completed
                    </label>
                  )}
                </>
              )}
              {error && (
                <p role="alert" className="flex items-center gap-2 text-sm text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeDialog} disabled={saving} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-dark-800 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="button-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
