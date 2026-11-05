import mongoose from 'mongoose';

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    academicTrack: {
      type: String,
      required: [true, 'Please specify academic track or major'],
      default: 'Computer Science & AI Track',
      trim: true,
    },
    targetExamDate: {
      type: Date,
      default: () => new Date('2026-11-15T00:00:00.000Z'),
    },
    dailyGoalTarget: {
      type: Number,
      default: 4,
      min: [1, 'Daily target must be at least 1 task'],
      max: [20, 'Daily target cannot exceed 20 tasks'],
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalStudyHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    preferredLearningStyle: {
      type: String,
      enum: ['visual', 'interactive', 'reading', 'practice'],
      default: 'interactive',
    },
    enrolledSubjects: {
      type: [String],
      default: ['Machine Learning', 'Data Structures', 'Algorithms', 'Applied Mathematics'],
    },
  },
  {
    timestamps: true,
  }
);

const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
export default StudentProfile;

