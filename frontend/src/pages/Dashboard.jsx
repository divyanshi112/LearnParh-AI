import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import StatsCard from '../components/StatsCard.jsx';
import WeeklyActivityChart from '../components/WeeklyActivityChart.jsx';
import DailyGoalsList from '../components/DailyGoalsList.jsx';
import AIRecommendations from '../components/AIRecommendations.jsx';
import StudyTimer from '../components/StudyTimer.jsx';
import {
  AlertCircle,
  ArrowRight,
  LoaderCircle,
} from 'lucide-react';
import { getDashboardData } from '../services/dashboardService.js';
import { updateTarget } from '../services/studyPlanService.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getDashboardData());
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut();
        navigate('/login', { replace: true });
        return;
      }
      setError(requestError.message || 'Could not load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, [navigate, signOut]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleTargetToggle = async (target) => {
    setActionError('');
    try {
      await updateTarget(target.id, { completed: !target.completed });
      setData(await getDashboardData());
    } catch (requestError) {
      setActionError(requestError.message || 'Could not update this daily target.');
    }
  };

  if (loading && !data) {
    return (
      <DashboardLayout pageTitle="Student Dashboard">
        <div
          className="flex min-h-64 items-center justify-center rounded-xl border border-slate-800 bg-dark-900 text-slate-400"
          role="status"
        >
          <LoaderCircle className="mr-3 h-5 w-5 animate-spin" />
          Loading your dashboard...
        </div>
      </DashboardLayout>
    );
  }

  if (error && !data) {
    return (
      <DashboardLayout pageTitle="Student Dashboard">
        <div className="rounded-xl border border-rose-500/30 bg-dark-900 p-6 text-rose-300" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p>{error}</p>
              <button type="button" onClick={loadDashboard} className="mt-3 font-medium underline">
                Try again
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { student, studyPlan, today, quizSummary, weeklyActivity } = data;
  const targetExamDate = formatDate(student.targetExamDate);
  const stats = [
    {
      id: 'subjects',
      title: 'Subjects',
      value: String(studyPlan.totalSubjects),
      subtitle: 'In your study plan',
      iconKey: 'BookOpen',
      accent: 'blue',
    },
    {
      id: 'topics',
      title: 'Topics Completed',
      value: `${studyPlan.completedTopics} / ${studyPlan.totalTopics}`,
      subtitle: `${studyPlan.pendingTopics} not started · ${studyPlan.inProgressTopics} in progress`,
      iconKey: 'Target',
      accent: 'indigo',
    },
    {
      id: 'completion',
      title: 'Overall Completion',
      value: `${studyPlan.completionPercentage}%`,
      subtitle: 'Based on completed topics',
      iconKey: 'Target',
      accent: 'purple',
    },
    {
      id: 'quizzes-solved',
      title: 'Quizzes Solved',
      value: String(quizSummary.attempts),
      subtitle: 'Completed attempts',
      iconKey: 'Target',
      accent: 'indigo',
    },
    {
      id: 'quiz-accuracy',
      title: 'Quiz Accuracy',
      value: quizSummary.accuracyPercentage === null
        ? 'No attempts'
        : `${quizSummary.accuracyPercentage}%`,
      subtitle: `${quizSummary.attempts} saved attempts`,
      iconKey: 'Clock',
      accent: 'purple',
    },
  ];

  return (
    <DashboardLayout pageTitle="Student Dashboard" student={student}>
      <div className="rounded-xl border border-slate-800 bg-dark-900 p-6 sm:p-7">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center rounded-md border border-slate-700 bg-dark-800 px-2.5 py-1 text-xs font-medium text-slate-400">
              Student productivity
            </div>
            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
              Welcome back, <span className="text-brand-blue-light">{student.name}</span>
            </h2>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              {student.academicTrack || 'Your learning dashboard'}
              {student.dailyStudyTarget ? ` · Daily study goal: ${student.dailyStudyTarget} hours` : ''}
              {targetExamDate ? ` · Target date: ${targetExamDate}` : ''}
            </p>
            {!student.academicTrack && (
              <Link to="/profile" className="mt-3 inline-block text-xs text-brand-blue-light hover:underline">
                Complete your profile
              </Link>
            )}
          </div>
          <Link
            to="/study-plan"
            className="button-primary flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-medium sm:w-auto"
          >
            <span>Resume Study Plan</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat) => (
            <StatsCard
              key={stat.id}
              title={stat.title}
              value={stat.value}
              subtitle={stat.subtitle}
              iconKey={stat.iconKey}
              accent={stat.accent}
            />
          ))}
        </div>
      </section>

      {!studyPlan.totalSubjects && (
        <section className="rounded-xl border border-slate-800 bg-dark-900 p-5 text-sm text-slate-400">
          Your study plan is empty. Add a subject and topics to see your progress here.
          <Link to="/study-plan" className="ml-2 font-medium text-brand-blue-light hover:underline">
            Open My Study Plan
          </Link>
        </section>
      )}

      {actionError && (
        <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {actionError}
        </div>
      )}

      <StudyTimer subjects={studyPlan.subjects} onSessionSaved={loadDashboard} />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeeklyActivityChart data={weeklyActivity} />
        </div>
        <div className="lg:col-span-1">
          <DailyGoalsList
            targets={today.targets}
            dailyStudyTarget={student.dailyStudyTarget}
            studyHoursLogged={today.studyHoursLogged}
            completionPercentage={today.completionPercentage}
            onToggleTarget={handleTargetToggle}
          />
        </div>
      </section>

      <section>
        <AIRecommendations topics={studyPlan.nextTopics} />
      </section>
    </DashboardLayout>
  );
}
