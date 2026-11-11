import express from 'express';
import { generateQuiz, listQuizHistory, submitQuiz } from '../controllers/quiz.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const requireObjectBody = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: 'A JSON object body is required.' });
  }
  return next();
};

router.use(authenticateToken);
router.get('/history', asyncRoute(listQuizHistory));
router.post('/generate', requireObjectBody, asyncRoute(generateQuiz));
router.post('/submit', requireObjectBody, asyncRoute(submitQuiz));

export default router;
