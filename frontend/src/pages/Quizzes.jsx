import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { CheckSquare, Clock, Award, Play, CheckCircle2, AlertCircle } from 'lucide-react';

const quizList = [
  {
    id: 1,
    title: 'Dynamic Programming & Memoization',
    category: 'Algorithms',
    questionsCount: 10,
    timeLimit: '15 mins',
    difficulty: 'Intermediate',
    lastScore: '90%',
    status: 'Completed',
  },
  {
    id: 2,
    title: 'Graph Traversal (BFS, DFS, Dijkstra)',
    category: 'Data Structures',
    questionsCount: 12,
    timeLimit: '20 mins',
    difficulty: 'Advanced',
    lastScore: '83%',
    status: 'Completed',
  },
  {
    id: 3,
    title: 'Linear Algebra: Eigenvalues & PCA',
    category: 'Mathematics',
    questionsCount: 8,
    timeLimit: '12 mins',
    difficulty: 'Beginner',
    lastScore: null,
    status: 'Ready to Start',
  },
  {
    id: 4,
    title: 'Deep Learning: Backprop & Loss Functions',
    category: 'Machine Learning',
    questionsCount: 15,
    timeLimit: '25 mins',
    difficulty: 'Advanced',
    lastScore: null,
    status: 'Ready to Start',
  },
];

export default function Quizzes() {
  const [activeQuiz, setActiveQuiz] = useState(null);

  return (
    <DashboardLayout pageTitle="Practice Quizzes">
      <div className="space-y-6">
        {/* Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-dark-900 to-dark-850 border border-slate-800">
          <h2 className="text-2xl font-bold text-white tracking-tight">Adaptive Practice Quizzes</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Auto-generated quizzes calibrated to your syllabus. Full interactive testing engine and real-time grading will be integrated in Phase 4.
          </p>
        </div>

        {/* Quiz Catalog */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizList.map((q) => (
            <div
              key={q.id}
              className="p-5 rounded-2xl bg-dark-900 border border-slate-800 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-brand-blue-light border border-blue-500/20">
                    {q.category}
                  </span>
                  <span className="text-xs font-medium text-slate-400">{q.difficulty}</span>
                </div>

                <h3 className="text-base font-bold text-white mt-3 tracking-tight">{q.title}</h3>

                <div className="flex items-center space-x-4 text-xs text-slate-400 mt-2">
                  <span className="flex items-center space-x-1">
                    <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                    <span>{q.questionsCount} Questions</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{q.timeLimit}</span>
                  </span>
                  {q.lastScore && (
                    <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                      <Award className="w-3.5 h-3.5" />
                      <span>Best: {q.lastScore}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">{q.status}</span>
                <button
                  onClick={() => setActiveQuiz(q)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-gradient-to-r hover:from-brand-purple hover:to-brand-blue text-slate-200 hover:text-white border border-slate-700/80 transition-all flex items-center space-x-1.5"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{q.status === 'Completed' ? 'Retake Quiz' : 'Start Quiz'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {activeQuiz && (
          <div className="p-4 rounded-xl bg-dark-850 border border-brand-purple/40 text-xs flex items-center justify-between animate-in fade-in duration-150">
            <span className="text-slate-200">
              Selected <strong>{activeQuiz.title}</strong>. Interactive timed test harness scheduled for Phase 4.
            </span>
            <button onClick={() => setActiveQuiz(null)} className="text-slate-400 hover:text-white px-2">
              Close
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

