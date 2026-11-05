import mongoose from 'mongoose';

/**
 * Health Controller
 * Provides system status, database connection state, uptime, and environment information.
 */
export const getHealthStatus = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    success: true,
    status: 'healthy',
    message: 'LearnPath AI API is running successfully',
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      name: mongoose.connection.name || 'learnpath_ai',
      host: mongoose.connection.host || 'unknown',
      connected: dbState === 1,
    },
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
};
