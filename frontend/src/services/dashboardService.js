/**
 * LearnPath AI - Dashboard Data Service
 * 
 * NOTE: Currently powered by structured demo data for Phase 2 UI preview.
 * Designed with asynchronous promises to mirror future MongoDB API contracts.
 */

export const DEMO_DATA_NOTICE = "Demo dataset for UI testing & verification. Real analytics will link to MongoDB Atlas.";

export const studentProfile = {
  id: "student_001",
  name: "Alex Morgan",
  role: "Computer Science & AI Track",
  email: "alex.morgan@learnpath.ai",
  targetExamDate: "15 Nov 2026",
  currentTrack: "Machine Learning & Algorithms",
  dailyGoalTarget: 4,
};

export const dashboardStats = [
  {
    id: "study-hours",
    title: "Total Study Hours",
    value: "28.5 hrs",
    trend: "+4.2 hrs",
    trendType: "positive",
    subtitle: "vs. last week",
    iconKey: "Clock",
    accent: "purple",
  },
  {
    id: "topics-completed",
    title: "Topics Completed",
    value: "19 / 24",
    trend: "79% progress",
    trendType: "positive",
    subtitle: "Semester curriculum",
    iconKey: "BookOpen",
    accent: "blue",
  },
  {
    id: "quiz-accuracy",
    title: "Quiz Accuracy",
    value: "92.4%",
    trend: "+6.1%",
    trendType: "positive",
    subtitle: "Across 14 tests",
    iconKey: "Target",
    accent: "indigo",
  },
  {
    id: "learning-streak",
    title: "Current Learning Streak",
    value: "8 Days",
    trend: "Personal Best: 14",
    trendType: "neutral",
    subtitle: "Keep it up today!",
    iconKey: "Flame",
    accent: "amber",
  },
];

export const weeklyActivityData = [
  { day: "Mon", hours: 3.5, target: 3.0, quizzes: 2 },
  { day: "Tue", hours: 4.2, target: 3.0, quizzes: 3 },
  { day: "Wed", hours: 2.8, target: 3.0, quizzes: 1 },
  { day: "Thu", hours: 5.0, target: 3.0, quizzes: 4 },
  { day: "Fri", hours: 3.8, target: 3.0, quizzes: 2 },
  { day: "Sat", hours: 6.2, target: 3.0, quizzes: 5 },
  { day: "Sun", hours: 3.0, target: 3.0, quizzes: 1 },
];

export const initialDailyGoals = [
  {
    id: "goal-1",
    title: "Complete Dynamic Programming memoization module",
    category: "Algorithms",
    estimatedMinutes: 45,
    completed: true,
  },
  {
    id: "goal-2",
    title: "Solve 5 practice problems on Binary Search Trees",
    category: "Data Structures",
    estimatedMinutes: 30,
    completed: true,
  },
  {
    id: "goal-3",
    title: "Review Neural Networks backpropagation math",
    category: "Machine Learning",
    estimatedMinutes: 40,
    completed: false,
  },
  {
    id: "goal-4",
    title: "Take Adaptive Practice Quiz #4 (Complexity & Sorts)",
    category: "Quizzes",
    estimatedMinutes: 20,
    completed: false,
  },
];

export const aiRecommendations = [
  {
    id: "rec-1",
    topic: "Gradient Descent Optimization",
    subject: "Machine Learning",
    reason: "Reinforces concepts from yesterday's neural networks quiz",
    difficulty: "Intermediate",
    duration: "25 mins",
    type: "Concept Deep-Dive",
  },
  {
    id: "rec-2",
    topic: "Dijkstra & A* Graph Traversal",
    subject: "Data Structures",
    reason: "High frequency in target syllabus",
    difficulty: "Advanced",
    duration: "35 mins",
    type: "Interactive Problem Set",
  },
  {
    id: "rec-3",
    topic: "Hypothesis Testing & P-Values",
    subject: "Applied Statistics",
    reason: "Identified minor accuracy dip in last week's quiz",
    difficulty: "Beginner",
    duration: "20 mins",
    type: "AI Tutor Walkthrough",
  },
];

/**
 * Simulates fetching dashboard bundle with artificial latency
 */
export async function getDashboardData() {
  // Simulate network roundtrip (200ms) to ensure component loading states work properly
  await new Promise((r) => setTimeout(r, 200));

  return {
    isDemoData: true,
    notice: DEMO_DATA_NOTICE,
    student: studentProfile,
    stats: dashboardStats,
    weeklyActivity: weeklyActivityData,
    initialGoals: initialDailyGoals,
    recommendations: aiRecommendations,
  };
}

