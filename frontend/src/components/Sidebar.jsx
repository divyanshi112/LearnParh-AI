import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  LayoutDashboard,
  BookOpen,
  Bot,
  CheckSquare,
  FileText,
  TrendingUp,
  Settings,
  Sparkles,
  GraduationCap,
  X,
  LogOut
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'My Study Plan', path: '/study-plan', icon: BookOpen },
  { name: 'AI Tutor', path: '/ai-tutor', icon: Bot },
  { name: 'Practice Quizzes', path: '/quizzes', icon: CheckSquare },
  { name: 'Study Materials', path: '/study-materials', icon: FileText },
  { name: 'My Progress', path: '/progress', icon: TrendingUp },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const getInitials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'S';

export default function Sidebar({ mobileOpen, setMobileOpen, student = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const examDate = student?.targetExamDate
    ? new Date(student.targetExamDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

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
      {(examDate || student?.dailyStudyTarget) && (
      <div className="px-4 pb-4">
        <div className="p-3.5 rounded-lg bg-dark-900 border border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Study Goals</span>
          </div>
          {examDate && <div className="text-xs font-medium text-white">Target exam: {examDate}</div>}
          {student?.dailyStudyTarget && (
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Daily study goal:</span>
              <span className="font-semibold text-slate-200">{student.dailyStudyTarget} hours</span>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Student Profile Section */}
      <div className="p-4 border-t border-slate-800">
        <NavLink to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center space-x-3 rounded-lg p-2 transition-colors hover:bg-dark-800">
          {student?.profilePicture ? (
            <img src={student.profilePicture} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-dark-700 text-xs font-semibold text-white">
              {getInitials(student?.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold text-white">{student?.name || 'My Profile'}</p>
            <p className="truncate text-[11px] text-slate-400">{student?.academicTrack || student?.email || 'View profile'}</p>
          </div>
        </NavLink>
        {/* Logout Button */}
        <div className="px-4 py-2 mt-2">
          <button
            onClick={() => {
              signOut();
              setMobileOpen(false);
              navigate('/login', { replace: true });
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
