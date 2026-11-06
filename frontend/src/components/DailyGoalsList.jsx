import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  Sparkles, 
  Tag, 
  Trophy,
  RotateCcw
} from 'lucide-react';
import { initialDailyGoals } from '../services/dashboardService';

const categoryColors = 'bg-dark-800 text-slate-400 border-slate-700';

export default function DailyGoalsList() {
  const [goals, setGoals] = useState(initialDailyGoals);
  const [newGoalText, setNewGoalText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Requirement: Interactive checkboxes
  const toggleGoal = (goalId) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, completed: !g.completed } : g))
    );
  };

  const resetGoals = () => {
    setGoals(initialDailyGoals);
  };

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;

    const newGoal = {
      id: `goal-${Date.now()}`,
      title: newGoalText.trim(),
      category: 'Algorithms',
      estimatedMinutes: 25,
      completed: false,
    };

    setGoals([...goals, newGoal]);
    setNewGoalText('');
    setIsAdding(false);
  };

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.completed).length;
  const progressPct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
  const isAllCompleted = totalGoals > 0 && completedGoals === totalGoals;

  return (
    <div className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Today's Learning Goals
            </h3>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-dark-800 text-slate-400 border border-slate-700">
              Interactive
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Check off daily milestones as you study
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={resetGoals}
            title="Reset to default demo tasks"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-800 hover:bg-dark-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-brand-purple-light" />
            <span>Add Goal</span>
          </button>
        </div>
      </div>

      {/* Dynamic Progress Bar */}
      <div className="mt-4 p-4 rounded-lg bg-dark-850 border border-slate-800">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-200">Daily Progress</span>
            {isAllCompleted && (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-400">
                <Trophy className="w-3 h-3" />
                <span>100% Complete!</span>
              </span>
            )}
          </div>
          <span className="font-mono font-bold text-white">
            {completedGoals} of {totalGoals} tasks ({progressPct}%)
          </span>
        </div>

        {/* Progress track */}
        <div className="w-full h-2.5 rounded-full bg-dark-950 overflow-hidden border border-slate-800/80">
          <div
            className="h-full rounded-full bg-brand-blue transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Inline Add Goal Form */}
      {isAdding && (
        <form onSubmit={handleAddGoal} className="mt-4 p-3 rounded-lg bg-dark-850 border border-slate-700">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newGoalText}
              onChange={(e) => setNewGoalText(e.target.value)}
              placeholder="e.g. Master Binary Search recursion..."
              className="field-control flex-1 px-3 py-2 text-xs"
              autoFocus
            />
            <button
              type="submit"
              className="button-primary px-3 py-1.5 rounded-lg text-xs font-semibold"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Goals Checklist List */}
      <div className="mt-4 space-y-2.5">
        {goals.map((goal) => {
          const categoryStyle = categoryColors;

          return (
            <div
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              className={`p-3 rounded-lg border transition-colors duration-150 cursor-pointer flex items-start space-x-3 group select-none ${
                goal.completed
                  ? 'bg-dark-950/40 border-slate-800/60 opacity-75'
                  : 'bg-dark-850 hover:bg-dark-800 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Checkbox Icon */}
              <button
                type="button"
                className="mt-0.5 text-slate-400 group-hover:text-brand-blue-light transition-colors"
                aria-label={goal.completed ? 'Mark uncompleted' : 'Mark completed'}
              >
                {goal.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-500 group-hover:text-brand-blue-light" />
                )}
              </button>

              {/* Task Details */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-medium tracking-tight transition-all ${
                    goal.completed
                      ? 'line-through text-slate-500'
                      : 'text-slate-200 group-hover:text-white'
                  }`}
                >
                  {goal.title}
                </p>

                <div className="flex items-center space-x-3 mt-1.5">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${categoryStyle}`}>
                    {goal.category}
                  </span>
                  <span className="flex items-center text-[10px] text-slate-500 space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{goal.estimatedMinutes} mins</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
