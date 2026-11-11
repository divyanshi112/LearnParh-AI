import mongoose from 'mongoose';

const questionAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
    },
    questionText: {
      type: String,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    topicName: {
      type: String,
      trim: true,
    },
    selectedOption: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      default: [],
    },
    correctOption: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      default: '',
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false }
);

const quizResultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quizSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizSession',
      unique: true,
      sparse: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
    topics: {
      type: [String],
      default: [],
    },
    quizTitle: {
      type: String,
      required: [true, 'Please provide quiz title'],
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    correctAnswers: {
      type: Number,
      required: true,
      min: 0,
    },
    incorrectAnswers: {
      type: Number,
      min: 0,
      default: function () {
        return this.totalQuestions - this.correctAnswers;
      },
    },
    scorePercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
    passed: {
      type: Boolean,
      default: function () {
        return this.scorePercentage >= 70;
      },
    },
    answers: [questionAnswerSchema],
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly query results by student and date
quizResultSchema.index({ student: 1, completedAt: -1 });

const QuizResult = mongoose.model('QuizResult', quizResultSchema);
export default QuizResult;
