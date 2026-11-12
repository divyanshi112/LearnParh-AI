import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import WeeklyActivityChart from '../components/WeeklyActivityChart';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getDashboardData } from '../services/dashboardService.js';

const skillsMastery = [
  { name: 'Algorithm Complexity Analysis', level: 94, category: 'Algorithms' },
  { name: 'Binary Trees & Traversals', level: 88, category: 'Data Structures' },
  { name: 'Dynamic Programming Patterns', level: 78, category: 'Algorithms' },
  { name: 'Neural Network Architectures', level: 68, category: 'Machine Learning' },
  { name: 'Probability & Matrix Operations', level: 85, category: 'Mathematics' },
];

export default function Progress() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [weeklyActivity, setWeeklyActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dashboard = await getDashboardData();
      if (!Array.isArray(dashboard.weeklyActivity)) {
        throw new Error('The server returned incomplete weekly study activity.');
      }
      setWeeklyActivity(dashboard.weeklyActivity);
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut();
        navigate('/login', { replace: true });
        return;
      }
      setError(requestError.message || 'Could not load your weekly study activity.');
    } finally {
      setLoading(false);
    }
  }, [navigate, signOut]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  return (
    <DashboardLayout pageTitle="My Progress">
      <div className="space-y-6">
        {/* Banner */}
        <div className="p-6 rounded-xl bg-dark-900 border border-slate-800">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Learning Analytics & Retention</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Detailed breakdown of your study velocity, retention accuracy, and concept mastery over time.
          </p>
        </div>

        {/* Weekly Activity Detailed Chart */}
        {loading ? (
          <div className="flex min-h-72 items-center justify-center rounded-xl border border-slate-800 bg-dark-900 text-sm text-slate-400" role="status">
            <LoaderCircle className="mr-3 h-5 w-5 animate-spin" />
            Loading your weekly study activity...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/30 bg-dark-900 p-5 text-sm text-rose-200" role="alert">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p>{error}</p>
                <button type="button" onClick={loadActivity} className="mt-3 font-medium underline">
                  Try again
                </button>
              </div>
            </div>
          </div>
        ) : (
          <WeeklyActivityChart data={weeklyActivity} />
        )}

        {/* Skill Mastery Breakdown */}
        <div className="p-6 rounded-xl bg-dark-900 border border-slate-800">
          <h3 className="text-base font-semibold text-white mb-4">Topic Mastery Ratings</h3>
          <div className="space-y-4">
            {skillsMastery.map((skill, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-200">{skill.name}</span>
                  <span className="text-slate-400 font-mono">{skill.level}% Mastery</span>
                </div>
                <div className="w-full h-2 rounded-full bg-dark-950 border border-slate-800 overflow-hidden">
                  <div
                  className="h-full rounded-full bg-brand-blue"
                    style={{ width: `${skill.level}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
