import express from 'express';
import { getLearningRecommendations } from '../controllers/recommendation.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/', (req, res, next) =>
  Promise.resolve(getLearningRecommendations(req, res)).catch(next)
);

export default router;
