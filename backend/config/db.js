// Reusable MongoDB connection module with Atlas fallback to local MongoDB
import mongoose from 'mongoose';

/**
 * Connect to MongoDB Atlas using MONGODB_URI.
 * If the Atlas connection fails (e.g., IP not whitelisted), fall back to a local MongoDB instance.
 */
export const connectDB = async () => {
  const atlasUri = process.env.MONGODB_URI;
  const localUri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/learnpath_ai';

  // Try Atlas first
  if (atlasUri) {
    try {
      const conn = await mongoose.connect(atlasUri, {
        dbName: 'learnpath_ai',
        serverSelectionTimeoutMS: 15000, // 15 s timeout
      });
      console.log('[MongoDB] ✅ Connected to Atlas successfully');
      console.log(`[MongoDB] 🌐 Host: ${conn.connection.host}`);
      console.log(`[MongoDB] 📁 DB: ${conn.connection.name}`);
      return conn;
    } catch (err) {
      console.warn('[MongoDB] ⚠️ Atlas connection failed – will attempt local fallback');
      console.error(`[MongoDB] ⛔ ${err.message}`);
    }
  } else {
    console.warn('[MongoDB] ⚠️ MONGODB_URI not defined – skipping Atlas connection');
  }

  // Fallback to local MongoDB
  try {
    const conn = await mongoose.connect(localUri, {
      dbName: 'learnpath_ai',
      serverSelectionTimeoutMS: 15000,
    });
    console.log('[MongoDB] ✅ Connected to local MongoDB');
    console.log(`[MongoDB] 🌐 Host: ${conn.connection.host}`);
    console.log(`[MongoDB] 📁 DB: ${conn.connection.name}`);
    return conn;
  } catch (fallbackErr) {
    console.error('[MongoDB] ❌ Both Atlas and local connections failed');
    console.error(`[MongoDB] ⛔ ${fallbackErr.message}`);
    throw fallbackErr;
  }
};

export default connectDB;
