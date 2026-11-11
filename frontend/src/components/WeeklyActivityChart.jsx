import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar
} from 'recharts';
// Custom Dark Mode Tooltip
const formatHours = (hours) => (
  hours > 0 && hours < 0.1 ? '<0.1' : hours.toFixed(1)
);

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 rounded-lg bg-dark-950 border border-slate-700 text-xs">
        <p className="font-bold text-white mb-1.5 flex items-center justify-between gap-4">
          <span>{label}</span>
          <span className="text-[10px] text-slate-400 font-normal">Activity Details</span>
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-brand-blue-light space-x-3">
            <span>Hours Studied:</span>
            <span className="font-bold font-mono text-white">{formatHours(data.hours)} hrs</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 space-x-3">
            <span>Daily Target:</span>
            <span className="font-mono text-slate-300">
              {data.target === null || data.target === undefined ? 'Not set' : `${data.target} hrs`}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300 space-x-3 pt-1 border-t border-slate-800">
            <span>Quizzes Solved:</span>
            <span className="font-bold font-mono text-white">{data.quizzes}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function WeeklyActivityChart({ data = [] }) {
  const [chartView, setChartView] = useState('area'); // 'area' | 'bar'

  const totalWeeklyHours = data.reduce((acc, curr) => acc + curr.hours, 0);
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const elapsedDays = data.filter((entry) => entry.date <= today).length;
  const avgDailyHours = elapsedDays ? totalWeeklyHours / elapsedDays : 0;
  const dailyTarget = data[0]?.target;
  const hasActivity = data.some((entry) => entry.hours > 0 || entry.quizzes > 0);

  return (
    <div className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Weekly Learning Activity
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Total this week: <strong className="text-white">{formatHours(totalWeeklyHours)} hrs</strong>
            {' '}· Average: <strong className="text-white">{formatHours(avgDailyHours)} hrs/day</strong>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Daily target: <strong className="text-slate-200">
              {dailyTarget === undefined || dailyTarget === null ? 'Not set' : `${dailyTarget} hrs`}
            </strong>
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center rounded-lg bg-dark-850 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setChartView('area')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                chartView === 'area'
                  ? 'bg-dark-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Curve
            </button>
            <button
              onClick={() => setChartView('bar')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                chartView === 'bar'
                  ? 'bg-dark-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bars
            </button>
          </div>
        </div>
      </div>

      {!hasActivity ? (
        <div className="mt-6 flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-700 text-sm text-slate-400">
          No study activity has been recorded this week.
        </div>
      ) : (
      <div className="mt-6 h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          {chartView === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6095D5" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#6095D5" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A0A5AE" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#A0A5AE" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#343941" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="#A0A5AE"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#343941' }}
              />
              <YAxis
                stroke="#A0A5AE"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                unit="h"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="hours"
                name="Hours Studied"
                stroke="#6095D5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#purpleGradient)"
              />
              {data.some((entry) => entry.target > 0) && (
                <Area
                  type="monotone"
                  dataKey="target"
                  name="Daily Study Goal"
                  stroke="#A0A5AE"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#blueGradient)"
                />
              )}
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#343941" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="#A0A5AE"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#343941' }}
              />
              <YAxis
                stroke="#A0A5AE"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                unit="h"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="hours"
                fill="#6095D5"
                radius={[4, 4, 0, 0]}
                name="Hours Studied"
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
            <span>Study Hours Logged</span>
          </div>
          {data.some((entry) => entry.target > 0) && <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            <span>Daily Study Goal</span>
          </div>}
        </div>
        <span className="text-[11px] text-slate-500 font-mono">This week</span>
      </div>
    </div>
  );
}
