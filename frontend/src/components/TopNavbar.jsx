import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  Sparkles, 
  Server, 
  Activity, 
  RefreshCw, 
  Check, 
  Command,
  X
} from 'lucide-react';
import { fetchHealthStatus } from '../services/api';
import { studentProfile } from '../services/dashboardService';

export default function TopNavbar({ pageTitle = 'Dashboard', setMobileOpen }) {
  const [backendHealth, setBackendHealth] = useState(null);
  const [pinging, setPinging] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live health monitoring
  const checkBackend = async () => {
    setPinging(true);
    const res = await fetchHealthStatus();
    setBackendHealth(res);
    setPinging(false);
  };

  useEffect(() => {
    checkBackend();
    // Poll every 30 seconds for live connection status
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = Boolean(backendHealth?.success && backendHealth?.data?.status === 'healthy');

  const demoNotifications = [
    { id: 1, title: 'New AI Quiz Ready', time: '10m ago', unread: true },
    { id: 2, title: 'Streak Milestone: 8 Days!', time: '2h ago', unread: false },
    { id: 3, title: 'Weekly Review Generated', time: 'Yesterday', unread: false },
  ];

  return (
    <header className="sticky top-0 z-20 h-16 bg-dark-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Menu Button & Dynamic Page Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
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
            className="w-full pl-9 pr-12 py-1.5 text-xs rounded-xl bg-dark-850/80 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/50 transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center space-x-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-dark-800 rounded border border-slate-700/60">
              <Command className="w-2.5 h-2.5 mr-0.5" /> K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Actions, Backend Status Badge & Profile */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Requirement: Live Backend Connection Status Indicator */}
        <div 
          onClick={checkBackend}
          title={`Backend API: ${isConnected ? 'Connected (Click to refresh)' : 'Disconnected (Click to retry)'}`}
          className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border text-xs cursor-pointer select-none transition-all duration-200 hover:opacity-90 ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:border-rose-500/50'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`}></span>
          <span className="hidden sm:inline font-semibold">
            {isConnected ? 'API Connected' : 'API Offline'}
          </span>
          <RefreshCw className={`w-3 h-3 text-slate-400 hover:text-white ${pinging ? 'animate-spin text-brand-purple-light' : ''}`} />
        </div>

        {/* Notifications Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dark-800 border border-slate-800/80 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-purple shadow-glow-purple"></span>
          </button>

          {/* Notifications Popover */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-dark-900 border border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-semibold text-white">Notifications</span>
                <span className="text-[10px] text-brand-purple-light font-medium cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="mt-2 space-y-2">
                {demoNotifications.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-xl bg-dark-850/60 hover:bg-dark-850 border border-slate-800/60 text-xs transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-200">{n.title}</p>
                      {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-brand-purple"></span>}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Student Avatar */}
        <div className="flex items-center space-x-2 pl-1 sm:pl-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-purple to-brand-blue flex items-center justify-center text-white font-bold text-xs shadow-glow-purple ring-2 ring-purple-500/30">
            AM
          </div>
          <span className="hidden md:block text-xs font-semibold text-slate-200">
            {studentProfile.name.split(' ')[0]}
          </span>
        </div>
      </div>
    </header>
  );
}

