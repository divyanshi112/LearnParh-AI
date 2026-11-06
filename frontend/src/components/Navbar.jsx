import React from 'react';
import { Sparkles, Activity, Layers } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="border-b border-slate-800 bg-dark-950 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-brand-blue flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white">
                LearnPath <span className="text-brand-blue-light">AI</span>
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-dark-800 text-slate-400 border border-slate-700">
                Phase 1
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              GenAI-Powered Personalised Learning Platform
            </p>
          </div>
        </div>

        {/* Right Info Badges */}
        <div className="flex items-center space-x-3 text-sm">
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-dark-800 border border-slate-800 text-slate-300">
            <Layers className="w-4 h-4 text-brand-blue-light" />
            <span className="text-xs">Stack: React + Express + Tailwind</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-dark-800 border border-slate-800 text-slate-300">
            <Activity className="w-4 h-4 text-emerald-300" />
            <span className="text-xs font-medium text-slate-200">System Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}
