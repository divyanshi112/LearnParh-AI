import express from 'express';
import {
  createSubject,
  createTarget,
  createTopic,
  deleteSubject,
  deleteTarget,
  deleteTopic,
  getDashboardSummary,
  listSubjects,
  listTargets,
  updateSubject,
  updateTarget,
  updateTopic,
} from '../controllers/studyPlan.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const requireObjectBody = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: 'A JSON object body is required' });
  }
  return next();
};

router.use(authenticateToken);

router.get('/dashboard', asyncRoute(getDashboardSummary));

router.route('/subjects')
  .get(asyncRoute(listSubjects))
  .post(requireObjectBody, asyncRoute(createSubject));
router.route('/subjects/:subjectId')
  .put(requireObjectBody, asyncRoute(updateSubject))
  .delete(asyncRoute(deleteSubject));
router.route('/subjects/:subjectId/topics')
  .post(requireObjectBody, asyncRoute(createTopic));
router.route('/subjects/:subjectId/topics/:topicId')
  .put(requireObjectBody, asyncRoute(updateTopic))
  .delete(asyncRoute(deleteTopic));
router.route('/targets')
  .get(asyncRoute(listTargets))
  .post(requireObjectBody, asyncRoute(createTarget));
router.route('/targets/:targetId')
  .put(requireObjectBody, asyncRoute(updateTarget))
  .delete(asyncRoute(deleteTarget));

export default router;
