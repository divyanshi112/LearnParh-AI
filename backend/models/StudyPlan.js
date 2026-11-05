import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
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

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      required: true,
    },
    estimatedWeeks: {
      type: String,
      default: '2 Weeks',
    },
    status: {
      type: String,
      enum: ['Locked', 'Up Next', 'In Progress', 'Completed'],
      default: 'Up Next',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    topics: [topicSchema],
  },
  { _id: true }
);

const studyPlanSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a study plan title'],
      default: 'Personalized AI Curriculum Roadmap',
      trim: true,
    },
    description: {
      type: String,
      default: 'AI-curated learning schedule calibrated to syllabus deadlines.',
    },
    targetExamDate: {
      type: Date,
      default: () => new Date('2026-11-15T00:00:00.000Z'),
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'archived'],
      default: 'active',
    },
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    modules: [moduleSchema],
  },
  {
    timestamps: true,
  }
);

const StudyPlan = mongoose.model('StudyPlan', studyPlanSchema);
export default StudyPlan;

