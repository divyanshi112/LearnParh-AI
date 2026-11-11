import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, required: true },
    topicName: { type: String, required: true },
    options: {
      A: { type: String, required: true },
      B: { type: String, required: true },
      C: { type: String, required: true },
      D: { type: String, required: true },
    },
    correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    explanation: { type: String, required: true },
  },
  { _id: false }
);

const quizSessionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    subjectName: { type: String, required: true },
    topics: [{ type: String, required: true }],
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
    },
    questions: {
      type: [quizQuestionSchema],
      required: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      expires: 0,
    },
  },
  { timestamps: true }
);

quizSessionSchema.index({ student: 1, createdAt: -1 });

const QuizSession = mongoose.model('QuizSession', quizSessionSchema);
export default QuizSession;
