import React from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { BookOpen } from 'lucide-react';

export default function Subjects() {
  return (
    <DashboardLayout pageTitle="Subjects">
      <section className="mx-auto flex min-h-72 max-w-3xl flex-col items-center justify-center rounded-xl border border-slate-800 bg-dark-900 px-6 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-dark-800 text-brand-blue-light">
          <BookOpen className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-white">Subjects</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
          Subject management is available in My Study Plan, where you can organize subjects, topics, and daily targets.
        </p>
        <a href="/study-plan" className="button-primary mt-5 rounded-lg px-4 py-2 text-sm font-medium">
          Open My Study Plan
        </a>
      </section>
    </DashboardLayout>
  );
}
