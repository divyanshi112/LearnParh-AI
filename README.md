# LearnPath AI 🎓⚡

> **GenAI-Powered Personalised Learning Platform**  
> Customised study plans, 24/7 AI tutoring, adaptive quizzes, and performance analysis.  
> **Project Target Deadline:** 15 November 2026

---

## 🏗️ System Architecture

LearnPath AI is structured into decoupled frontend and backend services:

```text
learnpath.ai/
├── .gitignore                      # Excludes node_modules, environment variables, build outputs
├── README.md                       # Platform documentation and startup guide
├── backend/
│   ├── config/                     # Server and database configuration stubs
│   │   └── db.js                   # Mongoose / MongoDB connection setup (Phase 2 stub)
│   ├── controllers/                # Request handlers and endpoint logic
│   │   └── health.controller.js    # Health status controller for GET /api/health
│   ├── middleware/                 # Express middleware (error handling, 404 handler)
│   │   └── error.middleware.js     # Standardized JSON error response handler
│   ├── models/                     # Data schemas (User, StudyPlan, Quiz, Progress)
│   │   └── .gitkeep
│   ├── routes/                     # API routing endpoints
│   │   └── health.routes.js        # Health check router definition
│   ├── .env                        # Local backend environment variables (git-ignored)
│   ├── .env.example                # Template for required environment variables
│   ├── package.json                # Backend dependencies and scripts
│   └── server.js                   # Express server entry point with CORS whitelist
└── frontend/
    ├── src/
    │   ├── components/             # Reusable UI components
    │   │   ├── AIRecommendations.jsx # Personalized topic & study suggestions
    │   │   ├── DailyGoalsList.jsx  # Interactive daily checklist with dynamic progress
    │   │   ├── DashboardLayout.jsx # Master layout wrapper (Sidebar + TopNavbar)
    │   │   ├── HealthStatusCard.jsx# Live backend connection verification card
    │   │   ├── Sidebar.jsx         # Responsive desktop fixed / mobile drawer sidebar
    │   │   ├── StatsCard.jsx       # Four statistical metric cards with trend indicators
    │   │   ├── TopNavbar.jsx       # Header with search, notifications, live API indicator
    │   │   └── WeeklyActivityChart.jsx # Responsive Recharts area/bar weekly study chart
    │   ├── pages/                  # Page-level route views (React Router)
    │   │   ├── AITutor.jsx         # 24/7 AI Tutor chat interface
    │   │   ├── Dashboard.jsx       # Main student dashboard view
    │   │   ├── Progress.jsx        # Learning analytics & topic mastery breakdown
    │   │   ├── Quizzes.jsx         # Practice quiz catalog with timers and scoring
    │   │   ├── Settings.jsx        # Profile, credentials, and track preferences
    │   │   └── StudyPlan.jsx       # Semester curriculum roadmap & exam milestones
    │   ├── services/               # API clients and HTTP communication
    │   │   ├── api.js              # Centralized fetch client calling backend endpoints
    │   │   └── dashboardService.js # Structured data layer prepared for MongoDB integration
    │   ├── App.jsx                 # Declarative React Router routing configuration
    │   ├── index.css               # Tailwind CSS directives and custom scrollbars
    │   └── main.jsx                # React root DOM mount
    ├── .env                        # Local frontend environment variables (git-ignored)
    ├── .env.example                # Template for frontend environment variables
    ├── index.html                  # HTML5 entry template with Inter typography
    ├── package.json                # Frontend dependencies (React, Recharts, Lucide, Router)
    ├── postcss.config.js           # PostCSS configuration for Tailwind CSS
    ├── tailwind.config.js          # Tailwind theme tokens (dark charcoal, purple, blue accents)
    └── vite.config.js              # Vite bundler configuration (port 5173, React plugin)
```

---

## 🎨 Design System

The frontend implements a **Premium Dark SaaS Dashboard**:
- **Background:** Deep Dark Navy / Charcoal (`#070A12` & `#0B0F19`)
- **Cards & Surfaces:** Subtle Slate borders (`#1E293B`, `rgba(255,255,255,0.08)`) with Dark Navy surfaces (`#131B2E`)
- **Accent Colors:** Electric Purple (`#A855F7`, `#C084FC`) and Ocean Blue (`#3B82F6`, `#60A5FA`)
- **Typography:** Clean, high-legibility Inter typeface

---

## 📦 Tech Stack

### Frontend
- **React.js (v18)** — Component-based UI library
- **Vite** — High-performance frontend build tool and dev server
- **JavaScript (ES Modules)** — Clean JavaScript implementation
- **Tailwind CSS** — Modern utility-first styling with custom dark theme tokens
- **React Router (v6)** — Client-side declarative routing across all pages
- **Recharts** — Responsive charting library for learning velocity analytics
- **Lucide React** — Modern iconography

### Backend
- **Node.js** — Asynchronous JavaScript runtime
- **Express.js** — Fast REST API framework
- **CORS** — Cross-Origin Resource Sharing middleware with origin validation
- **dotenv** — Zero-dependency environment variable manager
- **nodemon** — Auto-reloading development server daemon

---

## 🚀 Running the Application

### 1. Start the Backend
```bash
cd backend
npm run dev
```
- Server: `http://localhost:5000`
- Endpoint: `http://localhost:5000/api/health`

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```
- Client Application: `http://localhost:5173`

---

## 🧭 Page Routes & Navigation

| Route | Page | Description |
| :--- | :--- | :--- |
| `/` | **Dashboard** | Main overview: 4 stat cards, weekly activity chart, daily goals checklist, AI recommendations, live API health inspector |
| `/study-plan` | **My Study Plan** | Syllabus roadmap with progress meters and milestone tracking |
| `/ai-tutor` | **AI Tutor** | Interactive conversational tutoring interface with prompt suggestions |
| `/quizzes` | **Practice Quizzes** | Gemini-generated MCQ quizzes from study-plan subjects and topics, with grading and answer history |
| `/study-materials` | **Study Materials** | Upload, view, and delete your own PDF study materials |
| `/progress` | **My Progress** | Deep retention analytics, study hours, and topic mastery ratings |
| `/settings` | **Settings** | Student profile, track configuration, and study schedule preferences |

## Practice Quiz API

The authenticated quiz endpoints use the existing study-plan `Subject` records and Gemini configuration (`GEMINI_API_KEY` and `GEMINI_MODEL`). Quiz answer keys remain on the backend until submission.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/quizzes/generate` | Generate a quiz from `{ subjectId, topicIds, difficulty, questionCount }`; difficulty is `Easy`, `Medium`, or `Hard`, and question count is 5, 10, or 15 |
| `POST` | `/api/quizzes/submit` | Submit `{ quizId, answers: [{ questionId, selectedOption }] }`; scores are calculated by the backend |
| `GET` | `/api/quizzes/history` | List the authenticated student's saved attempts and answer explanations |

Quiz sessions are stored temporarily in MongoDB and expire after 24 hours. Generated questions are associated with their selected study-plan topics, and submitted attempts store the topic ID for every evaluated answer.

## Adaptive Learning Recommendations

The authenticated `GET /api/recommendations` endpoint analyzes the student's saved quiz scores and per-answer topic attribution, classifies assessed topics as weak (under 60%), moderate (60–79%), or strong (80% or higher), and uses Gemini to suggest revision actions. Recommended next-quiz difficulty is Easy for weak performance, Medium for moderate performance, and Hard when only strong topics have been assessed. Analytics and recommendations are cached in the student's `LearningRecommendation` record and recalculated when their quizzes or study plan change. Existing single-topic attempts can be attributed by their saved topic name; multi-topic attempts without per-answer attribution contribute to overall scores but are not guessed into topic-level results.

The dashboard loads the current student's recommendation record. The endpoint returns actual quiz totals, average score, accuracy, per-topic counts and classifications, Gemini revision actions, and the next suggested difficulty. With no assessed quiz data it returns an empty recommendation list and the dashboard prompts the student to complete a quiz.

## Study Materials API

All study-material endpoints require an authenticated student JWT. PDF uploads are limited to 10 MB and 500 pages; the original PDF is stored in GridFS on the existing MongoDB connection, and selectable text plus document metadata are stored in the `StudyMaterial` collection. Every list, view, and delete operation is scoped to the authenticated student. Scanned PDFs without selectable text are not supported in this stage.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/study-materials` | List the authenticated student's uploaded documents |
| `POST` | `/api/study-materials` | Upload multipart fields `file` (PDF) and `subjectId` |
| `GET` | `/api/study-materials/:documentId/file` | View the authenticated student's PDF |
| `DELETE` | `/api/study-materials/:documentId` | Delete the authenticated student's PDF and metadata |

## Student Profile API

The backend profile endpoints require the JWT returned by `POST /api/auth/login`:

```http
Authorization: Bearer <token>
```

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/profile` | Get the authenticated student's profile (`404` if it has not been created) |
| `POST` | `/api/profile` | Create the authenticated student's one profile (`409` if one already exists) |
| `PUT` | `/api/profile` | Update one or more fields on the authenticated student's profile |

Example create request:

```json
{
  "fullName": "Alex Morgan",
  "phoneNumber": "+1 555 123 4567",
  "collegeName": "Example University",
  "universityRollNumber": "CS-2026-001",
  "degree": "B.Tech",
  "specialization": "Computer Science",
  "currentYear": 2,
  "currentSemester": 4,
  "technicalSkills": ["React", "MongoDB"],
  "programmingLanguages": ["JavaScript", "Python"],
  "careerGoal": "Become a software engineer",
  "bio": "I enjoy building useful software.",
  "academicTrack": "Computer Science",
  "targetExamDate": null,
  "dailyStudyTarget": 2.5,
  "subjects": []
}
```

The profile also supports an optional `profilePicture` data URL (JPEG, PNG, or WebP, up to 512 KB), `gender`, `dateOfBirth`, `cgpa`, `linkedinUrl`, and `githubUrl`. `targetExamDate` and `subjects` are optional; subjects default to an empty list. Topic status must be `pending`, `in-progress`, or `completed`. `dailyStudyTarget` is measured in hours and must be between `0.25` and `24`. `GET /api/profile` includes the account name and email and returns `profile: null` until a profile is created. The authenticated user ID is taken from the JWT, not from the request body. Configure `JWT_SECRET` in the backend environment before using these protected endpoints.
#   L e a r n P a r h - A I  
 