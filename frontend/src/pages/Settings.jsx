import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { User, Bell, Shield, Moon, Save, Check } from 'lucide-react';
import { studentProfile } from '../services/dashboardService';

export default function Settings() {
  const [profile, setProfile] = useState(studentProfile);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout pageTitle="Settings">
      <div className="space-y-6 max-w-4xl">
        {/* Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-dark-900 to-dark-850 border border-slate-800">
          <h2 className="text-2xl font-bold text-white tracking-tight">Account & Platform Settings</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Manage your personal profile, notifications, and study schedule preferences.
          </p>
        </div>

        {/* Profile Card */}
        <div className="p-6 rounded-2xl bg-dark-900 border border-slate-800 shadow-xl">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
            <User className="w-5 h-5 text-brand-purple-light" />
            <h3 className="text-base font-bold text-white">Student Profile</h3>
          </div>

          <form onSubmit={handleSave} className="mt-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-850 border border-slate-800 text-white focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-950 border border-slate-800 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Learning Track</label>
                <input
                  type="text"
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-850 border border-slate-800 text-white focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Target Exam Date</label>
                <input
                  type="text"
                  value={profile.targetExamDate}
                  onChange={(e) => setProfile({ ...profile, targetExamDate: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-850 border border-slate-800 text-white focus:outline-none focus:border-brand-purple"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Authentication & JWT credentials configured in upcoming auth phase.
              </span>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-blue text-white text-xs font-semibold shadow-glow-purple hover:opacity-95 transition-all flex items-center space-x-1.5"
              >
                {saved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

