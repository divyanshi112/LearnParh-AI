import express from 'express';
import { createProfile, getProfile, updateProfile } from '../controllers/profile.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/', getProfile);
router.post('/', createProfile);
router.put('/', updateProfile);

export default router;
