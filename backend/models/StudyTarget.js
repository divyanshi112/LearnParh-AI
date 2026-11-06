import mongoose from 'mongoose';

const studyTargetSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Target title is required'],
      trim: true,
      maxlength: [160, 'Target title cannot exceed 160 characters'],
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

studyTargetSchema.index({ student: 1, targetDate: 1 });

const StudyTarget = mongoose.model('StudyTarget', studyTargetSchema);
export default StudyTarget;
