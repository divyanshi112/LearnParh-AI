import React from 'react';
import { Compass, Bot, CheckSquare, BarChart3 } from 'lucide-react';

const pillars = [
  {
    icon: Compass,
    title: 'Custom Study Plans',
    description: 'Dynamic learning roadmaps tailored to the student\'s syllabus, existing mastery, and target exam deadlines.',
    badge: 'Phase 3',
    badgeColor: 'text-brand-purple-light border-purple-500/30 bg-purple-500/10',
    accentBorder: 'hover:border-brand-purple/60'
  },
  {
    icon: Bot,
    title: 'AI Tutoring Engine',
    description: 'Conversational GenAI tutor grounded in course materials, explaining difficult concepts with step-by-step guidance.',
    badge: 'Phase 3',
    badgeColor: 'text-brand-blue-light border-blue-500/30 bg-blue-500/10',
    accentBorder: 'hover:border-brand-blue/60'
  },
  {
    icon: CheckSquare,
    title: 'Adaptive Quizzes',
    description: 'Instant question generation and auto-grading that dynamically scales difficulty based on student performance.',
    badge: 'Phase 4',
    badgeColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    accentBorder: 'hover:border-indigo-500/60'
  },
  {
    icon: BarChart3,
    title: 'Performance Analysis',
    description: 'Comprehensive analytics uncovering retention gaps, study velocity, and personalized mastery recommendations.',
    badge: 'Phase 4',
    badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    accentBorder: 'hover:border-cyan-500/60'
  }
];

export default function PlatformOverview() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Platform Capabilities Roadmap</h3>
          <p className="text-sm text-slate-400">Core architecture modules to be implemented in upcoming phases</p>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Target Deadline: <span className="text-brand-purple-light font-semibold">15 November 2026</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pillars.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-xl bg-dark-900 border border-slate-800 transition-colors hover:border-slate-700 group"
            >
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-lg bg-dark-800 border border-slate-700 text-white transition-colors">
                  <Icon className="w-5 h-5 text-brand-blue-light" />
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              </div>
              <h4 className="text-base font-semibold text-white mt-4 tracking-tight">
                {item.title}
              </h4>
              <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Tech Stack Blueprint Card */}
      <div className="p-6 rounded-xl bg-dark-900 border border-slate-800">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Tech Stack Architecture
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-dark-850 border border-slate-800">
            <span className="text-slate-500 block mb-1">Frontend Client</span>
            <span className="font-semibold text-slate-200">React + Vite + Tailwind</span>
          </div>
          <div className="p-3 rounded-lg bg-dark-850 border border-slate-800">
            <span className="text-slate-500 block mb-1">Backend Server</span>
            <span className="font-semibold text-slate-200">Node.js + Express REST</span>
          </div>
          <div className="p-3 rounded-lg bg-dark-850 border border-slate-800">
            <span className="text-slate-500 block mb-1">Database (Phase 2)</span>
            <span className="font-semibold text-slate-200">MongoDB Atlas + Mongoose</span>
          </div>
          <div className="p-3 rounded-lg bg-dark-850 border border-slate-800">
            <span className="text-slate-500 block mb-1">GenAI (Phase 3)</span>
            <span className="font-semibold text-slate-200">Google Gemini API</span>
          </div>
        </div>
      </div>
    </div>
  );
}
