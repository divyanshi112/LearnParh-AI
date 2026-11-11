import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { getLearningRecommendations } from '../services/recommendationService.js';

const LEVEL_STYLES = {
  weak: 'border-rose-900/70 bg-rose-950/30 text-rose-300',
  moderate: 'border-amber-900/70 bg-amber-950/30 text-amber-300',
  strong: 'border-emerald-900/70 bg-emerald-950/30 text-emerald-300',
  unassessed: 'border-slate-700 bg-dark-800 text-slate-400',
};

const PRIORITY_STYLES = {
  high: 'border-rose-900/70 bg-rose-950/30 text-rose-300',
  medium: 'border-amber-900/70 bg-amber-950/30 text-amber-300',
  low: 'border-slate-700 bg-dark-800 text-slate-400',
};

export default function AIRecommendations({ topics = [] }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getLearningRecommendations());
    } catch (requestError) {
      setError(requestError.message || 'Could not load your recommendations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const analytics = data?.analytics;
  const assessedTopics = analytics?.topics?.filter((topic) => topic.level !== 'unassessed') || [];

  return (
    <div className="space-y-5 rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-2 border-b border-slate-800/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-blue-light" />
            <h3 className="text-base font-bold tracking-tight text-white sm:text-lg">Adaptive Learning Recommendations</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Personalized from your saved quiz answers and topic-level accuracy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/quizzes" className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue-light hover:underline">
            Practice quiz <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link to="/study-plan" className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white">
            Study plan
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-24 items-center justify-center text-sm text-slate-400" role="status">
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          Analyzing your quiz performance...
        </div>
      ) : error ? (
        <div className="flex flex-col gap-3 rounded-lg border border-rose-900/70 bg-rose-950/30 p-4 text-sm text-rose-200 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </span>
          <button type="button" onClick={loadRecommendations} className="inline-flex shrink-0 items-center gap-1 self-start text-xs font-medium text-rose-100 hover:underline">
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      ) : analytics?.totalAttempts === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 p-5 text-center">
          <BookOpen className="mx-auto h-6 w-6 text-slate-500" />
          <h4 className="mt-2 text-sm font-semibold text-white">Complete a quiz to get personalized guidance</h4>
          <p className="mt-1 text-xs text-slate-400">
            Topic strengths, revision priorities, and future quiz difficulty will appear after your first saved attempt.
          </p>
          <Link to="/quizzes" className="button-primary mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium">
            Start a quiz <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Quiz attempts', analytics.totalAttempts],
              ['Questions', analytics.totalQuestions],
              ['Correct / incorrect', `${analytics.correctAnswers} / ${analytics.incorrectAnswers}`],
              ['Average score', analytics.averageScore === null ? '—' : `${analytics.averageScore}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-800 bg-dark-850 p-3">
                <p className="text-[11px] text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-dark-850 px-4 py-3">
            <p className="text-sm text-slate-300">
              Overall quiz accuracy:{' '}
              <span className="font-semibold text-white">
                {analytics.overallAccuracy === null ? '—' : `${analytics.overallAccuracy}%`}
              </span>
            </p>
            <p className="text-sm text-slate-300">
              Suggested next quiz:{' '}
              <span className="font-semibold text-brand-blue-light">{data.nextQuizDifficulty}</span>
            </p>
          </div>

          {assessedTopics.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold text-white">Topic performance</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {assessedTopics.map((topic) => (
                  <div key={topic.topicId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-dark-850 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{topic.topicName}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{topic.subjectName} · {topic.totalQuestions} questions</p>
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${LEVEL_STYLES[topic.level]}`}>
                      {topic.level} · {topic.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h4 className="mb-2 text-sm font-semibold text-white">Recommended next steps</h4>
            {data.recommendations.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.recommendations.map((recommendation) => (
                  <article key={recommendation.topicId} className="rounded-lg border border-slate-800 bg-dark-850 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{recommendation.subjectName}</p>
                        <h5 className="mt-1 text-sm font-semibold text-white">{recommendation.topicName}</h5>
                      </div>
                      <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase ${PRIORITY_STYLES[recommendation.priority]}`}>
                        {recommendation.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{recommendation.reason}</p>
                    <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-200">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-blue-light" />
                      {recommendation.action}
                    </p>
                    <p className="mt-3 border-t border-slate-800 pt-2 text-xs text-slate-400">
                      Next quiz difficulty: <span className="font-medium text-white">{recommendation.recommendedDifficulty}</span>
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                Your quiz attempts do not have enough topic-level answer data yet. Complete a new quiz to build precise topic recommendations.
              </p>
            )}
          </section>

          {data.overallGuidance && (
            <p className="rounded-lg border border-brand-blue/20 bg-brand-blue/5 px-4 py-3 text-sm leading-6 text-slate-300">
              {data.overallGuidance}
            </p>
          )}
        </>
      )}

      {topics.length > 0 && (
        <section className="border-t border-slate-800/80 pt-4">
          <h4 className="text-sm font-semibold text-white">Continue your study plan</h4>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {topics.slice(0, 3).map((topic) => (
              <div key={`${topic.subject}-${topic.id}`} className="rounded-lg border border-slate-800 bg-dark-850 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{topic.subject}</p>
                <p className="mt-1 text-sm font-medium text-slate-200">{topic.name}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
