import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { TrendingUp, Target, Award, Calendar, BarChart2 } from 'lucide-react';
import WeeklyActivityChart from '../components/WeeklyActivityChart';

const skillsMastery = [
  { name: 'Algorithm Complexity Analysis', level: 94, category: 'Algorithms' },
  { name: 'Binary Trees & Traversals', level: 88, category: 'Data Structures' },
  { name: 'Dynamic Programming Patterns', level: 78, category: 'Algorithms' },
  { name: 'Neural Network Architectures', level: 68, category: 'Machine Learning' },
  { name: 'Probability & Matrix Operations', level: 85, category: 'Mathematics' },
];

export default function Progress() {
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
        <WeeklyActivityChart />

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
