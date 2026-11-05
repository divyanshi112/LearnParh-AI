import mongoose from 'mongoose';

const skillMasterySchema = new mongoose.Schema(
  {
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    masteryPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  { _id: false }
);

const dailyTaskSchema = new mongoose.Schema(
  {
    taskTitle: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
    },
    estimatedMinutes: {
      type: Number,
      default: 30,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
  },
  { _id: true }
);

const learningProgressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
      },
    },
    studyHoursLogged: {
      type: Number,
      default: 0,
      min: 0,
    },
    topicsCompletedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    quizzesCompletedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    skillsMastery: [skillMasterySchema],
    dailyTasks: [dailyTaskSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee one progress document per student per calendar day
learningProgressSchema.index({ student: 1, date: 1 }, { unique: true });

const LearningProgress = mongoose.model('LearningProgress', learningProgressSchema);
export default LearningProgress;

