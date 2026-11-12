import assert from 'node:assert/strict';
import test from 'node:test';
import { getLearningRecommendations } from '../controllers/recommendation.controller.js';
import { createSourceFingerprint } from '../services/recommendation.service.js';
import { LearningRecommendation, QuizResult, Subject } from '../models/index.js';

const queryFor = (value) => ({
  select() { return this; },
  sort() { return this; },
  lean() { return Promise.resolve(value); },
});

test('repairs cached analytics without averageScore and refreshes after a new completed attempt', async () => {
  const firstAttempt = {
    _id: '507f1f77bcf86cd799439021',
    totalQuestions: 2,
    correctAnswers: 1,
    incorrectAnswers: 1,
    scorePercentage: 50,
    completedAt: new Date('2026-11-10T00:00:00Z'),
    answers: [],
  };
  let quizResults = [firstAttempt];
  const originalSubjectFind = Subject.find;
  const originalQuizFind = QuizResult.find;
  const originalRecommendationFindOne = LearningRecommendation.findOne;
  const originalRecommendationFindOneAndUpdate = LearningRecommendation.findOneAndUpdate;
  let cachedRecord = {
    sourceFingerprint: createSourceFingerprint([], quizResults),
    analytics: {
      totalAttempts: 1,
      totalQuestions: 2,
      correctAnswers: 1,
      incorrectAnswers: 1,
      overallAccuracy: 50,
      topics: [],
    },
    recommendations: [],
    overallGuidance: '',
    nextQuizDifficulty: 'Easy',
  };

  Subject.find = () => queryFor([]);
  QuizResult.find = () => queryFor(quizResults);
  LearningRecommendation.findOne = () => queryFor(cachedRecord);
  LearningRecommendation.findOneAndUpdate = async (_filter, update) => {
    cachedRecord = {
      ...cachedRecord,
      sourceFingerprint: update.$set.sourceFingerprint || cachedRecord.sourceFingerprint,
      analytics: update.$set.analytics || cachedRecord.analytics,
      recommendations: update.$set.recommendations || cachedRecord.recommendations,
      overallGuidance: update.$set.overallGuidance ?? cachedRecord.overallGuidance,
      nextQuizDifficulty: update.$set.nextQuizDifficulty || cachedRecord.nextQuizDifficulty,
    };
    return cachedRecord;
  };

  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  try {
    await getLearningRecommendations({ user: { id: 'student-1', role: 'student' } }, response);
    assert.equal(response.body.data.analytics.averageScore, 50);

    quizResults = [
      firstAttempt,
      {
        _id: '507f1f77bcf86cd799439022',
        totalQuestions: 5,
        correctAnswers: 3,
        incorrectAnswers: 2,
        scorePercentage: 60,
        completedAt: new Date('2026-11-11T00:00:00Z'),
        answers: [],
      },
    ];
    await getLearningRecommendations({ user: { id: 'student-1', role: 'student' } }, response);

    assert.equal(response.body.data.analytics.totalAttempts, 2);
    assert.equal(response.body.data.analytics.averageScore, 55);
    assert.equal(response.body.data.analytics.overallAccuracy, 57);
    assert.equal(
      cachedRecord.sourceFingerprint,
      createSourceFingerprint([], quizResults)
    );
  } finally {
    Subject.find = originalSubjectFind;
    QuizResult.find = originalQuizFind;
    LearningRecommendation.findOne = originalRecommendationFindOne;
    LearningRecommendation.findOneAndUpdate = originalRecommendationFindOneAndUpdate;
  }
});
