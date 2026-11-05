import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import StatsCard from '../components/StatsCard.jsx';
import WeeklyActivityChart from '../components/WeeklyActivityChart.jsx';
import DailyGoalsList from '../components/DailyGoalsList.jsx';
import AIRecommendations from '../components/AIRecommendations.jsx';
import HealthStatusCard from '../components/HealthStatusCard.jsx';
import {
  Sparkles,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Server,
  Zap,
  Info
} from 'lucide-react';
import { getDashboardData } from '../services/dashboardService.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHealthCard, setShowHealthCard] = useState(true);

  useEffect(() => {
    getDashboardData().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  return (
    <DashboardLayout pageTitle="Student Dashboard">
      {/* 3. Welcome Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dark-900 via-dark-850 to-dark-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-72 h-72 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-brand-purple-light mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 2 &bull; Student Dashboard Active</span>
            </div>

            {/* Requirement: Welcome back, Student! / Ready to make progress today? */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple-light via-indigo-300 to-brand-blue-light">Student!</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2 font-medium">
              Ready to make progress today? You are on an 8-day streak. Complete 2 more tasks to hit today's benchmark.
            </p>

            <div className="mt-3 flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Displaying demo metrics for Phase 2 UI verification (MongoDB integration in Phase 3).</span>
            </div>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <button className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-brand-purple to-brand-blue text-white shadow-glow-purple hover:opacity-95 transition-all flex items-center justify-center space-x-2">
              <span>Resume Study Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Statistics Cards */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.stats.map((stat) => (
            <StatsCard
              key={stat.id}
              title={stat.title}
              value={stat.value}
              trend={stat.trend}
              trendType={stat.trendType}
              subtitle={stat.subtitle}
              iconKey={stat.iconKey}
              accent={stat.accent}
            />
          ))}
        </div>
      </section>

      {/* 5 & 6. Main Analytics & Goals Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 5. Weekly Learning Activity Chart (2 Cols on lg) */}
        <div className="lg:col-span-2">
          <WeeklyActivityChart data={data?.weeklyActivity} />
        </div>

        {/* 6. Today's Learning Goals (1 Col on lg) */}
        <div className="lg:col-span-1">
          <DailyGoalsList />
        </div>
      </section>

      {/* 7. AI Recommendations */}
      <section>
        <AIRecommendations recommendations={data?.recommendations} />
      </section>

      {/* Backend Connection Health Inspector (Preserved Requirement) */}
      <section className="mt-8">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Live Backend API Verification & Diagnostics</span>
          </div>
          <button
            onClick={() => setShowHealthCard(!showHealthCard)}
            className="text-xs text-brand-purple-light hover:underline flex items-center space-x-1"
          >
            <span>{showHealthCard ? 'Hide Diagnostics' : 'Show Diagnostics'}</span>
            {showHealthCard ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showHealthCard && (
          <div className="animate-in fade-in duration-200">
            <HealthStatusCard />
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
