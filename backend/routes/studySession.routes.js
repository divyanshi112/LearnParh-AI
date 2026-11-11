import express from 'express';
import {
  createManualStudySession,
  getCurrentStudySession,
  startStudySession,
  updateStudySessionState,
} from '../controllers/studySession.controller.js';
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
router.get('/current', asyncRoute(getCurrentStudySession));
router.post('/start', requireObjectBody, asyncRoute(startStudySession));
router.post('/manual', requireObjectBody, asyncRoute(createManualStudySession));
router.post('/:sessionId/:action', requireObjectBody, asyncRoute(updateStudySessionState));

export default router;
