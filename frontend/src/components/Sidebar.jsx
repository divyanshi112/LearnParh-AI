import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Bot,
  CheckSquare,
  TrendingUp,
  Settings,
  Sparkles,
  GraduationCap,
  X,
  Flame,
  LogOut
} from 'lucide-react';
import { studentProfile } from '../services/dashboardService';

const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'My Study Plan', path: '/study-plan', icon: BookOpen },
  { name: 'AI Tutor', path: '/ai-tutor', icon: Bot },
  { name: 'Practice Quizzes', path: '/quizzes', icon: CheckSquare },
  { name: 'My Progress', path: '/progress', icon: TrendingUp },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const navigate = useNavigate();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#141619] border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
        <NavLink to="/" className="flex items-center space-x-3 group" onClick={() => setMobileOpen(false)}>
          <div className="w-9 h-9 rounded-lg bg-brand-blue flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-lg font-semibold tracking-tight text-white">
              LearnPath <span className="text-brand-blue-light">AI</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Personalized Learning</p>
          </div>
        </NavLink>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Main Menu
        </div>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 group border-l-2 ${isActive
                ? 'bg-dark-800 text-white border-brand-blue'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-dark-800/60'
                }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-brand-purple-light' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-700 text-slate-400">
                  {item.badge}
                </span>
              )
              }
            </NavLink>
          );
        })}
      </nav>

      {/* Target Exam Deadline Widget */}
      <div className="px-4 pb-4">
        <div className="p-3.5 rounded-lg bg-dark-900 border border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Target Exam</span>
          </div>
          <div className="text-xs text-white font-medium">15 November 2026</div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Daily Goal Target:</span>
            <span className="font-semibold text-slate-200">4 tasks/day</span>
          </div>
        </div>
      </div>

      {/* Student Profile Section */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-dark-800 transition-colors">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-dark-700 flex items-center justify-center text-white font-semibold text-xs">
              AM
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#141619]"></span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{studentProfile.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{studentProfile.role}</p>
          </div>
          <div className="flex items-center text-amber-400 text-xs font-bold" title="Current Streak: 8 days">
            <Flame className="w-3.5 h-3.5 mr-0.5 fill-amber-400 text-amber-400" />
            <span>8</span>
          </div>
        </div>
        {/* Logout Button */}
        <div className="px-4 py-2 mt-2">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setMobileOpen(false);
              navigate('/login');
            }}
            className="w-full flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-dark-800/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div >
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed left) */}
      <aside className="hidden lg:block w-64 h-screen fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setMobileOpen(false)}></div>
          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
