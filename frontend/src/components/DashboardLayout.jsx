import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

export default function DashboardLayout({ children, pageTitle = 'Dashboard' }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col font-sans">
      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area (Offset for desktop fixed sidebar) */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        <TopNavbar pageTitle={pageTitle} setMobileOpen={setMobileOpen} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto space-y-6">
          {children}
        </main>

        {/* Global Dashboard Footer */}
        <footer className="border-t border-slate-800 bg-dark-950 py-4 px-6 text-center text-xs text-slate-500">
          <p>
            LearnPath AI &copy; 2026 &mdash; GenAI-Powered Personalized Learning Platform.
          </p>
        </footer>
      </div>
    </div>
  );
}
