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
import { BarChart3, TrendingUp, Calendar, Info } from 'lucide-react';
import { weeklyActivityData } from '../services/dashboardService';

// Custom Dark Mode Tooltip
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3.5 rounded-xl bg-dark-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs">
        <p className="font-bold text-white mb-1.5 flex items-center justify-between gap-4">
          <span>{label}</span>
          <span className="text-[10px] text-slate-400 font-normal">Activity Details</span>
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-brand-purple-light space-x-3">
            <span>Hours Studied:</span>
            <span className="font-bold font-mono text-white">{data.hours} hrs</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 space-x-3">
            <span>Daily Target:</span>
            <span className="font-mono text-slate-300">{data.target} hrs</span>
          </div>
          <div className="flex items-center justify-between text-brand-blue-light space-x-3 pt-1 border-t border-slate-800">
            <span>Quizzes Solved:</span>
            <span className="font-bold font-mono text-white">{data.quizzes}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function WeeklyActivityChart({ data = weeklyActivityData }) {
  const [chartView, setChartView] = useState('area'); // 'area' | 'bar'

  const totalWeeklyHours = data.reduce((acc, curr) => acc + curr.hours, 0).toFixed(1);
  const avgDailyHours = (totalWeeklyHours / data.length).toFixed(1);

  return (
    <div className="rounded-2xl border border-slate-800 bg-dark-900 shadow-xl p-5 sm:p-6 transition-all duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Weekly Learning Activity
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-brand-purple-light border border-purple-500/20">
              Demo Data
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Total this week: <strong className="text-white">{totalWeeklyHours} hrs</strong> (Avg: {avgDailyHours} hrs/day)
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center rounded-xl bg-dark-850 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setChartView('area')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                chartView === 'area'
                  ? 'bg-gradient-to-r from-brand-purple to-brand-blue text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Curve
            </button>
            <button
              onClick={() => setChartView('bar')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                chartView === 'bar'
                  ? 'bg-gradient-to-r from-brand-purple to-brand-blue text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bars
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="mt-6 h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartView === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis 
                dataKey="day" 
                stroke="#64748B" 
                fontSize={12} 
                tickLine={false} 
                axisLine={{ stroke: '#1E293B' }} 
              />
              <YAxis 
                stroke="#64748B" 
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
                stroke="#A855F7"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#purpleGradient)"
              />
              <Area
                type="monotone"
                dataKey="target"
                name="Target"
                stroke="#3B82F6"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#blueGradient)"
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis 
                dataKey="day" 
                stroke="#64748B" 
                fontSize={12} 
                tickLine={false} 
                axisLine={{ stroke: '#1E293B' }} 
              />
              <YAxis 
                stroke="#64748B" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                unit="h"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="hours" 
                fill="#A855F7" 
                radius={[6, 6, 0, 0]} 
                name="Hours Studied"
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-purple"></span>
            <span>Study Hours Logged</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue border border-dashed border-slate-200"></span>
            <span>Target Benchmark (3.0h)</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Last refreshed: Today, 11:30 AM
        </span>
      </div>
    </div>
  );
}

