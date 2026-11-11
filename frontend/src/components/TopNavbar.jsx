import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  Bell, 
  Command,
  ChevronDown,
  UserRound,
  Pencil,
  LogOut
} from 'lucide-react';
import { getStudentProfile } from '../services/api';
import { useAuth } from '../contexts/AuthContext.jsx';

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const getInitials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'S';

export default function TopNavbar({ pageTitle = 'Dashboard', setMobileOpen }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const profileMenuRef = useRef(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [student, setStudent] = useState(() => ({ user: readStoredUser(), profile: null }));
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    const loadStudent = async () => {
      const response = await getStudentProfile();
      if (!active || !response.success) return;
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      setStudent({
        user: response.user || readStoredUser(),
        profile: response.profile,
      });
    };
    const handleProfileUpdate = () => loadStudent();

    loadStudent();
    window.addEventListener('learnpath-profile-updated', handleProfileUpdate);
    return () => {
      active = false;
      window.removeEventListener('learnpath-profile-updated', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileMenuOpen]);

  const studentName = student.profile?.fullName || student.user?.name || 'Student';
  const profilePicture = student.profile?.profilePicture;

  return (
    <header className="sticky top-0 z-20 min-h-16 bg-dark-950 border-b border-slate-800 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
      {/* Left: Mobile Menu Button & Dynamic Page Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight flex items-center space-x-2">
            <span>{pageTitle}</span>
          </h1>
        </div>
      </div>

      {/* Center: Search Field */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search study topics, quizzes, modules..."
            className="field-control w-full pl-9 pr-12 py-2 text-xs"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center space-x-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-dark-800 rounded border border-slate-700">
              <Command className="w-2.5 h-2.5 mr-0.5" /> K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Notifications Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 border border-slate-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Notifications Popover */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl bg-dark-900 border border-slate-800 p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-semibold text-white">Notifications</span>
              </div>
              <div className="mt-3 py-4 text-center text-xs text-slate-400">
                No notifications yet.
              </div>
            </div>
          )}
        </div>

        {/* Student Profile Menu */}
        <div className="relative pl-1 sm:pl-2" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            aria-label="Open student profile menu"
            className="flex items-center space-x-2 rounded-lg p-1 pr-2 hover:bg-dark-800 transition-colors"
          >
            {profilePicture ? (
              <img src={profilePicture} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-white font-semibold text-xs ring-1 ring-slate-700">
                {getInitials(studentName)}
              </span>
            )}
            <span className="hidden md:block text-xs font-semibold text-slate-200 max-w-24 truncate">
              {studentName.split(' ')[0]}
            </span>
            <ChevronDown className={`hidden sm:block h-3.5 w-3.5 text-slate-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-700 bg-dark-900 p-2 z-50"
            >
              <div className="px-3 py-3 border-b border-slate-800">
                <p className="text-sm font-semibold text-white truncate">{studentName}</p>
                <p className="text-xs text-slate-400 truncate">{student.user?.email || ''}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 mt-1 rounded-lg text-sm text-slate-200 hover:bg-dark-800 transition-colors"
              >
                <UserRound className="h-4 w-4 text-brand-purple-light" />
                <span>My Profile</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate('/profile', { state: { editProfile: true } });
                }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-dark-800 transition-colors"
              >
                <Pencil className="h-4 w-4 text-brand-purple-light" />
                <span>Edit Profile</span>
              </button>
              <div className="my-1 border-t border-slate-800" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  signOut();
                  setProfileMenuOpen(false);
                  navigate('/login', { replace: true });
                }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
