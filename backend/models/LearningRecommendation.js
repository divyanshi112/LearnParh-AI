import mongoose from 'mongoose';

const topicPerformanceSchema = new mongoose.Schema(
  {
    topicId: { type: String, required: true },
    subjectId: { type: String, required: true },
    subjectName: { type: String, required: true },
    topicName: { type: String, required: true },
    totalQuestions: { type: Number, required: true, min: 0 },
    correctAnswers: { type: Number, required: true, min: 0 },
    incorrectAnswers: { type: Number, required: true, min: 0 },
    averageScore: { type: Number, min: 0, max: 100, default: null },
    accuracy: { type: Number, min: 0, max: 100, default: null },
    level: {
      type: String,
      enum: ['weak', 'moderate', 'strong', 'unassessed'],
      required: true,
    },
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    topicId: { type: String, required: true },
    subjectId: { type: String, required: true },
    subjectName: { type: String, required: true },
    topicName: { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    reason: { type: String, required: true },
    action: { type: String, required: true },
    recommendedDifficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
    },
  },
  { _id: false }
);

const learningRecommendationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    sourceFingerprint: { type: String, required: true },
    analytics: {
      totalAttempts: { type: Number, required: true, min: 0 },
      totalQuestions: { type: Number, required: true, min: 0 },
      correctAnswers: { type: Number, required: true, min: 0 },
      incorrectAnswers: { type: Number, required: true, min: 0 },
      averageScore: { type: Number, min: 0, max: 100, default: null },
      overallAccuracy: { type: Number, min: 0, max: 100, default: null },
      topics: { type: [topicPerformanceSchema], default: [] },
    },
    recommendations: { type: [recommendationSchema], default: [] },
    overallGuidance: { type: String, default: '' },
    nextQuizDifficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Easy',
    },
    generatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const LearningRecommendation = mongoose.model(
  'LearningRecommendation',
  learningRecommendationSchema
);
export default LearningRecommendation;
