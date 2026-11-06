import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import StatsCard from '../components/StatsCard.jsx';
import WeeklyActivityChart from '../components/WeeklyActivityChart.jsx';
import DailyGoalsList from '../components/DailyGoalsList.jsx';
import AIRecommendations from '../components/AIRecommendations.jsx';
import HealthStatusCard from '../components/HealthStatusCard.jsx';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Server,
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
      <div className="rounded-xl bg-dark-900 border border-slate-800 p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-dark-800 border border-slate-700 text-xs font-medium text-slate-400 mb-3">
              <span>Student productivity</span>
            </div>

            {/* Requirement: Welcome back, Student! / Ready to make progress today? */}
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight">
              Welcome back, <span className="text-brand-blue-light">Student!</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2">
              Ready to make progress today? You are on an 8-day streak. Complete 2 more tasks to hit today's benchmark.
            </p>

            <div className="mt-3 flex items-center space-x-2 text-xs text-slate-500">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Dashboard metrics and recommendations are currently sample data.</span>
            </div>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <Link to="/study-plan" className="button-primary w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center space-x-2">
              <span>Resume Study Plan</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
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
      <section className="mt-2">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Server className="w-4 h-4 text-emerald-300" />
            <span>Live Backend API Verification & Diagnostics</span>
          </div>
          <button
            onClick={() => setShowHealthCard(!showHealthCard)}
            className="text-xs text-brand-blue-light hover:underline flex items-center space-x-1"
          >
            <span>{showHealthCard ? 'Hide Diagnostics' : 'Show Diagnostics'}</span>
            {showHealthCard ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showHealthCard && (
          <div>
            <HealthStatusCard />
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
