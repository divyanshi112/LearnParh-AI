import dns from 'dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { User, StudentProfile, StudyPlan, QuizResult, LearningProgress } from './models/index.js';

// Resolve Windows DNS SRV lookup issues for MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore if not supported in environment
}

dotenv.config();

console.log('========================================================');
console.log('🧪 LEARNPATH AI - MONGODB ATLAS CONNECTION VERIFICATION');
console.log('========================================================\n');

try {
  console.log('▶ [1/3] Connecting to MongoDB Atlas using backend/config/db.js...');
  const conn = await connectDB();
  console.log('   ✓ Connection readyState:', mongoose.connection.readyState === 1 ? '1 (Connected)' : mongoose.connection.readyState);
  console.log('   ✓ Active Database Name:', mongoose.connection.name);
  console.log('   ✓ Cluster Host:', mongoose.connection.host);

  console.log('\n▶ [2/3] Verifying Mongoose Schemas & Compilations...');
  console.log('   ✓ User Model registered:', Boolean(User.modelName));
  console.log('   ✓ StudentProfile Model registered:', Boolean(StudentProfile.modelName));
  console.log('   ✓ StudyPlan Model registered:', Boolean(StudyPlan.modelName));
  console.log('   ✓ QuizResult Model registered:', Boolean(QuizResult.modelName));
  console.log('   ✓ LearningProgress Model registered:', Boolean(LearningProgress.modelName));

  console.log('\n▶ [3/3] Sending Ping to MongoDB Atlas Admin Service...');
  const adminDb = mongoose.connection.db.admin();
  const pingResult = await adminDb.ping();
  console.log('   ✓ MongoDB Ping Output:', JSON.stringify(pingResult));

  console.log('\n========================================================');
  console.log('🎉 MONGODB ATLAS IS 100% OPERATIONAL & VERIFIED!');
  console.log('========================================================');
  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error('\n❌ MongoDB Connection Verification Failed:', error.message);
  console.log('========================================================');
  process.exit(1);
}
