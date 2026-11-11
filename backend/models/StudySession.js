import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    topicName: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 1440,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
      max: 86400,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['running', 'paused', 'completed'],
      required: true,
      index: true,
    },
    activeSlot: {
      type: mongoose.Schema.Types.ObjectId,
      default: undefined,
    },
    segmentStartedAt: {
      type: Date,
      default: null,
    },
    heartbeatAt: {
      type: Date,
      default: null,
    },
    entryKey: {
      type: String,
      default: undefined,
      maxlength: 100,
    },
  },
  { timestamps: true }
);

studySessionSchema.index({ activeSlot: 1 }, { unique: true, sparse: true });
studySessionSchema.index({ userId: 1, startTime: -1 });
studySessionSchema.index(
  { userId: 1, entryKey: 1 },
  {
    unique: true,
    partialFilterExpression: { entryKey: { $exists: true } },
  }
);

const StudySession = mongoose.model('StudySession', studySessionSchema);
export default StudySession;
