import express from 'express';
import { chat } from '../controllers/ai.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);
router.post('/chat', (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: 'A JSON object body is required.' });
  }
  return Promise.resolve(chat(req, res, next)).catch(next);
});

export default router;
