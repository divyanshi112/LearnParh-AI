import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { BookOpen, Calendar, Clock, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';

const modules = [
  {
    id: 1,
    title: 'Module 1: Foundations of Machine Learning & Linear Algebra',
    status: 'Completed',
    progress: 100,
    topicsCount: 8,
    estimatedWeeks: '2 Weeks',
  },
  {
    id: 2,
    title: 'Module 2: Advanced Data Structures & Graph Algorithms',
    status: 'In Progress',
    progress: 65,
    topicsCount: 10,
    estimatedWeeks: '3 Weeks',
  },
  {
    id: 3,
    title: 'Module 3: Neural Networks, Deep Learning & PyTorch',
    status: 'Up Next',
    progress: 0,
    topicsCount: 12,
    estimatedWeeks: '4 Weeks',
  },
  {
    id: 4,
    title: 'Module 4: Transformer Architecture & Large Language Models',
    status: 'Locked',
    progress: 0,
    topicsCount: 14,
    estimatedWeeks: '4 Weeks',
  },
];

export default function StudyPlan() {
  return (
    <DashboardLayout pageTitle="My Study Plan">
      <div className="space-y-6">
        {/* Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-dark-900 to-dark-850 border border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-purple-light uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Target Exam: 15 November 2026</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Personalized Study Roadmap</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Your dynamic curriculum maps syllabus requirements and exam milestones into structured weekly learning milestones. Full AI syllabus customizer will be activated in Phase 3.
          </p>
        </div>

        {/* Modules Roadmap List */}
        <div className="space-y-4">
          {modules.map((m) => (
            <div
              key={m.id}
              className="p-5 rounded-2xl bg-dark-900 border border-slate-800 hover:border-slate-700 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-xl border mt-1 ${
                  m.status === 'Completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : m.status === 'In Progress'
                      ? 'bg-purple-500/10 text-brand-purple-light border-purple-500/20'
                      : 'bg-dark-800 text-slate-500 border-slate-700/60'
                }`}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      m.status === 'Completed'
                        ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
                        : m.status === 'In Progress'
                          ? 'bg-purple-400/10 text-brand-purple-light border-purple-400/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {m.status}
                    </span>
                    <span className="text-xs text-slate-400">{m.estimatedWeeks}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mt-1.5">{m.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{m.topicsCount} Topics &bull; Includes 2 Adaptive Quizzes</p>
                </div>
              </div>

              {/* Progress and Action */}
              <div className="flex items-center space-x-4 w-full md:w-64">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Mastery</span>
                    <span className="font-semibold text-white">{m.progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-dark-950 border border-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-blue"
                      style={{ width: `${m.progress}%` }}
                    />
                  </div>
                </div>
                <button className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 border border-slate-700/80 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

