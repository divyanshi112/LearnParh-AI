import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { getJwtSecret } from '../config/jwt.js';

export const authenticateToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  const [scheme, token] = authorization?.split(' ') || [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  let secret;
  try {
    secret = getJwtSecret();
  } catch {
    return res.status(500).json({ success: false, message: 'Authentication is not configured' });
  }

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    });

    if (
      typeof payload !== 'object' ||
      typeof payload.id !== 'string' ||
      !mongoose.Types.ObjectId.isValid(payload.id)
    ) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }

    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
  }
};
