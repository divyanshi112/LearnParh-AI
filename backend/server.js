import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import studyPlanRoutes from './routes/studyPlan.routes.js';
import aiRoutes from './routes/ai.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';
import studyMaterialRoutes from './routes/studyMaterial.routes.js';
import studySessionRoutes from './routes/studySession.routes.js';
import testDBRoutes from './routes/testDB.routes.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5178',
  'http://127.0.0.1:5178'
];

// Configure Cross-Origin Resource Sharing (CORS)
app.use(cors({
  origin: (origin, callback) => {
    const whitelist = [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5178',
      'http://127.0.0.1:5178',
      'https://learnparh-ai.vercel.app'
    ];
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      // reject silently – CORS will not set Access‑Control‑Allow‑Origin
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Base API route mount
app.use('/api', healthRoutes);
app.use('/api', testDBRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/study-plan', studyPlanRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/study-materials', studyMaterialRoutes);
app.use('/api/study-sessions', studySessionRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'LearnPath AI Backend API',
    version: '1.0.0',
    documentation: '/api/health',
    status: 'online'
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Global server reference
let server = null;

/**
 * Connect to MongoDB Atlas first.
 * Ensure the server starts only after the database connection succeeds.
 */
const startServer = async () => {
  try {
    console.log('[LearnPath AI] ⏳ Initializing database connection...');
    await connectDB();

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[LearnPath AI] 🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`[LearnPath AI] 🩺 Health check endpoint: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error(`[LearnPath AI] ❌ Fatal error: Database connection failed. Server not started.`);
    console.error(`[LearnPath AI] 💡 Details: ${error.message}`);
    process.exit(1);
  }
};

startServer();

export { app, server };
export default app;
