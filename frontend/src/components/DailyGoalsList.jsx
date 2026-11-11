import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, Target, Trophy } from 'lucide-react';

const formatStudyTime = (hours) => {
  if (hours > 0 && hours < 0.1) return `${Math.round(hours * 60)} min`;
  return hours.toFixed(1);
};

export default function DailyGoalsList({
  targets = [],
  dailyStudyTarget,
  studyHoursLogged = 0,
  completionPercentage = 0,
  onToggleTarget,
}) {
  const [updatingId, setUpdatingId] = useState(null);
  const completedCount = targets.filter((target) => target.completed).length;
  const allComplete = targets.length > 0 && completedCount === targets.length;

  const toggleTarget = async (target) => {
    setUpdatingId(target.id);
    try {
      await onToggleTarget(target);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
      <div className="border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold tracking-tight text-white sm:text-lg">Today&apos;s Learning Goals</h3>
          {allComplete && (
            <Trophy className="h-4 w-4 text-amber-400" aria-label="All targets completed" />
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {dailyStudyTarget
            ? `${formatStudyTime(studyHoursLogged)} of ${dailyStudyTarget} study hours logged`
            : `${formatStudyTime(studyHoursLogged)} study hours logged`}
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-dark-850 p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200">Today&apos;s targets</span>
          <span className="font-mono font-bold text-white">
            {completedCount} of {targets.length} complete ({completionPercentage}%)
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full border border-slate-800/80 bg-dark-950"
          role="progressbar"
          aria-valuenow={completionPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Daily target completion"
        >
          <div
            className="h-full rounded-full bg-brand-blue transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {targets.length ? (
        <div className="mt-4 space-y-2.5">
          {targets.map((target) => (
            <div
              key={target.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                target.completed
                  ? 'border-slate-800/60 bg-dark-950/40 opacity-75'
                  : 'border-slate-800 bg-dark-850'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleTarget(target)}
                disabled={updatingId === target.id}
                aria-label={target.completed ? `Mark ${target.title} incomplete` : `Complete ${target.title}`}
                className="mt-0.5 text-slate-400 transition-colors hover:text-brand-blue-light disabled:opacity-50"
              >
                {target.completed
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  : <Circle className="h-5 w-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-medium ${target.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                  {target.title}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500">
                  {target.subject && (
                    <span className="inline-flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {target.subject}
                    </span>
                  )}
                  {updatingId === target.id && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Saving
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-slate-700 p-4 text-center">
          <p className="text-xs text-slate-400">No study targets are scheduled for today.</p>
          <Link to="/study-plan" className="mt-2 inline-block text-xs font-medium text-brand-blue-light hover:underline">
            Create a study target
          </Link>
        </div>
      )}
    </div>
  );
}
