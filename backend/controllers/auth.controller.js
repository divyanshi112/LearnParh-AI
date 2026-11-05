import { User } from '../models/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = '7d'; // 7 days token life

/**
 * Validate email and password manually (no external validator library).
 */
const validateRegisterInput = ({ name, email, password }) => {
  const errors = {};
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Name is required';
  }
  if (!email || typeof email !== 'string') {
    errors.email = 'Email is required';
  } else {
    const emailRegex = /^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      errors.email = 'Invalid email format';
    }
  }
  if (!password || typeof password !== 'string') {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  return errors;
};

/** Register new user */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const validationErrors = validateRegisterInput({ name, email, password });
    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
    }

    // Check for duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: 'Email already registered' });
    }

    // Hash the password with bcrypt (12 rounds is a good default)
    const hashed = await bcrypt.hash(password, 12);
    const newUser = await User.create({ name, email, password: hashed });

    // Do NOT send password back
    const { password: _, ...userData } = newUser.toObject();
    return res.status(201).json({ success: true, user: userData });
  } catch (err) {
    console.error('[Auth Register] error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/** Login existing user */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Email and password required' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid credentials' });
    }
    // Create JWT payload (only safe fields)
    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Return token and minimal user info (no password)
    const { password: _, ...userData } = user.toObject();
    return res.json({ success: true, token, user: userData });
  } catch (err) {
    console.error('[Auth Login] error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
