import { LearningRecommendation, QuizResult, Subject } from '../models/index.js';
import {
  analyzeQuizPerformance,
  createSourceFingerprint,
  getRecommendationCandidates,
  parseRecommendations,
} from '../services/recommendation.service.js';
import {
  generateRecommendationResponse,
  GeminiServiceError,
} from '../services/gemini.service.js';

function recommendationResponse(record) {
  return {
    analytics: record.analytics,
    recommendations: record.recommendations,
    overallGuidance: record.overallGuidance,
    nextQuizDifficulty: record.nextQuizDifficulty,
    generatedAt: record.generatedAt,
  };
}

const recommendationsInFlight = new Map();

export async function getLearningRecommendations(req, res) {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only student accounts can access learning recommendations.',
    });
  }

  const studentId = req.user.id;
  let pending = recommendationsInFlight.get(studentId);
  if (!pending) {
    pending = computeLearningRecommendations(studentId);
    recommendationsInFlight.set(studentId, pending);
  }

  try {
    const result = await pending;
    return res.status(result.status).json(result.body);
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    if (error instanceof SyntaxError || error.message?.startsWith('Gemini returned')) {
      console.error('[Recommendations] Gemini returned invalid data', error.message);
      return res.status(502).json({
        success: false,
        message: 'The recommendation service returned an invalid response. Please try again.',
      });
    }
    throw error;
  } finally {
    if (recommendationsInFlight.get(studentId) === pending) {
      recommendationsInFlight.delete(studentId);
    }
  }
}

async function computeLearningRecommendations(studentId) {
  const [subjects, quizResults, cachedRecord] = await Promise.all([
    Subject.find({ student: studentId })
      .select('name topics._id topics.name topics.status updatedAt')
      .sort({ name: 1 })
      .lean(),
    QuizResult.find({ student: studentId })
      .select('subjectId topics totalQuestions correctAnswers incorrectAnswers score scorePercentage maxScore maximumScore answers.topicId answers.isCorrect completedAt')
      .sort({ completedAt: -1 })
      .lean(),
    LearningRecommendation.findOne({ student: studentId }).lean(),
  ]);
  const sourceFingerprint = createSourceFingerprint(subjects, quizResults);
  const performance = analyzeQuizPerformance(subjects, quizResults);
  const analytics = {
    totalAttempts: performance.totalAttempts,
    totalQuestions: performance.totalQuestions,
    correctAnswers: performance.correctAnswers,
    incorrectAnswers: performance.incorrectAnswers,
    averageScore: performance.averageScore,
    overallAccuracy: performance.overallAccuracy,
    topics: performance.topics,
  };

  if (
    cachedRecord?.sourceFingerprint === sourceFingerprint
    && cachedRecord.analytics?.averageScore === performance.averageScore
    && (!performance.assessedTopics.length || cachedRecord.recommendations.length > 0)
  ) {
    return {
      status: 200,
      body: { success: true, data: recommendationResponse(cachedRecord) },
    };
  }

  const savedAnalytics = await LearningRecommendation.findOneAndUpdate(
    { student: studentId },
    {
      $set: {
        sourceFingerprint,
        analytics,
        recommendations: [],
        overallGuidance: '',
        nextQuizDifficulty: performance.nextQuizDifficulty,
        generatedAt: null,
      },
    },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  if (!performance.assessedTopics.length) {
    return {
      status: 200,
      body: { success: true, data: recommendationResponse(savedAnalytics) },
    };
  }

  const prompt = [
    'You are an adaptive learning coach. Give concise, practical study recommendations based only on the supplied quiz performance.',
    'Recommend one to three assessed topics. Prioritize weak topics, then moderate topics; recommend challenging practice for strong topics only if there are no weak or moderate topics.',
    'Do not invent performance data or recommend topic IDs that are not supplied.',
    `Overall results: ${performance.correctAnswers} correct, ${performance.incorrectAnswers} incorrect, ${performance.totalQuestions} questions across ${performance.totalAttempts} attempts; average quiz score ${performance.averageScore}%, overall accuracy ${performance.overallAccuracy}%.`,
    `Topic results: ${JSON.stringify(performance.assessedTopics.map((topic) => ({
      topicId: topic.topicId,
      subject: topic.subjectName,
      topic: topic.topicName,
      totalQuestions: topic.totalQuestions,
      correctAnswers: topic.correctAnswers,
      incorrectAnswers: topic.incorrectAnswers,
      accuracy: topic.accuracy,
      level: topic.level,
    })))}`,
    'For each recommendation include topicId, priority (high/medium/low), a reason citing the measured performance, a concrete revision action, and recommendedDifficulty (Easy/Medium/Hard).',
    'Return only valid JSON with an overallGuidance string and a recommendations array.',
  ].join('\n');

  const response = await generateRecommendationResponse(
    prompt,
    getRecommendationCandidates(performance.assessedTopics).map((topic) => topic.topicId)
  );
  const generated = parseRecommendations(response, performance.assessedTopics);
  const record = await LearningRecommendation.findOneAndUpdate(
    { student: studentId },
    {
      $set: {
        recommendations: generated.recommendations,
        overallGuidance: generated.overallGuidance,
        nextQuizDifficulty: performance.nextQuizDifficulty,
        generatedAt: new Date(),
      },
    },
    { returnDocument: 'after', runValidators: true }
  );

  return {
    status: 200,
    body: { success: true, data: recommendationResponse(record) },
  };
}
