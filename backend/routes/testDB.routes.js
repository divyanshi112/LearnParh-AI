import express from 'express';
import { User } from '../models/index.js';

const router = express.Router();

/**
 * POST /api/test-db
 * Inserts a temporary test user into MongoDB and reads it back.
 * The document is not used elsewhere – it exists only for verification.
 */
router.post('/test-db', async (req, res) => {
  try {
    const timestamp = Date.now();
    const testEmail = `test_${timestamp}@example.com`;
    const newUser = await User.create({
      name: 'Test User',
      email: testEmail,
      password: 'password123', // will be hashed later in real code; for test we store raw
    });

    // Retrieve the same document to verify round‑trip
    const fetched = await User.findById(newUser._id).lean();

    return res.status(201).json({
      success: true,
      insertedId: newUser._id,
      retrieved: fetched,
    });
  } catch (err) {
    console.error('[TestDB] Error inserting/fetching test document:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

