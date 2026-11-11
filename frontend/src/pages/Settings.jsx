import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { User, Bell, Shield, Moon, Save, Check } from 'lucide-react';

const studentProfile = {
  name: 'Alex Morgan',
  role: 'Computer Science & AI Track',
  email: 'alex.morgan@learnpath.ai',
  targetExamDate: '15 Nov 2026',
};

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
        <div className="p-6 rounded-xl bg-dark-900 border border-slate-800">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Account & Platform Settings</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Manage your personal profile, notifications, and study schedule preferences.
          </p>
        </div>

        {/* Profile Card */}
        <div className="p-6 rounded-xl bg-dark-900 border border-slate-800">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
            <User className="w-5 h-5 text-brand-blue-light" />
            <h3 className="text-base font-semibold text-white">Student Profile</h3>
          </div>

          <form onSubmit={handleSave} className="mt-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="field-control px-3.5 py-2"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="field-control px-3.5 py-2 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Learning Track</label>
                <input
                  type="text"
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  className="field-control px-3.5 py-2"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Target Exam Date</label>
                <input
                  type="text"
                  value={profile.targetExamDate}
                  onChange={(e) => setProfile({ ...profile, targetExamDate: e.target.value })}
                  className="field-control px-3.5 py-2"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Authentication & JWT credentials configured in upcoming auth phase.
              </span>

              <button
                type="submit"
                className="button-primary px-5 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5"
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
