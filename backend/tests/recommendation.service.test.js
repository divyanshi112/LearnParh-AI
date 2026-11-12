import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeQuizPerformance,
  createSourceFingerprint,
  parseRecommendations,
} from '../services/recommendation.service.js';
import { parseGeneratedQuiz } from '../controllers/quiz.controller.js';
import LearningRecommendation from '../models/LearningRecommendation.js';

const subjectId = '507f1f77bcf86cd799439011';
const weakTopicId = '507f1f77bcf86cd799439012';
const moderateTopicId = '507f1f77bcf86cd799439013';
const unassessedTopicId = '507f1f77bcf86cd799439014';
const strongTopicId = '507f1f77bcf86cd799439015';

function createSubjects() {
  return [{
    _id: subjectId,
    name: 'Operating Systems',
    updatedAt: new Date('2026-11-10T00:00:00Z'),
    topics: [
      { _id: weakTopicId, name: 'Processes', status: 'In Progress' },
      { _id: moderateTopicId, name: 'Memory Management', status: 'Not Started' },
      { _id: strongTopicId, name: 'Concurrency', status: 'Not Started' },
      { _id: unassessedTopicId, name: 'File Systems', status: 'Not Started' },
    ],
  }];
}

function createResults() {
  return [{
    _id: '507f1f77bcf86cd799439021',
    subjectId,
    topics: ['Processes', 'Memory Management'],
    totalQuestions: 15,
    correctAnswers: 8,
    incorrectAnswers: 7,
    scorePercentage: 53,
    completedAt: new Date('2026-11-10T01:00:00Z'),
    answers: [
      ...Array.from({ length: 5 }, (_, index) => ({
        topicId: weakTopicId,
        isCorrect: index === 0,
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        topicId: moderateTopicId,
        isCorrect: index < 3,
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        topicId: strongTopicId,
        isCorrect: index < 4,
      })),
    ],
  }];
}

test('aggregates real quiz outcomes and classifies study-plan topics', () => {
  const performance = analyzeQuizPerformance(createSubjects(), createResults());

  assert.deepEqual(
    {
      attempts: performance.totalAttempts,
      questions: performance.totalQuestions,
      correct: performance.correctAnswers,
      incorrect: performance.incorrectAnswers,
      averageScore: performance.averageScore,
      accuracy: performance.overallAccuracy,
      nextDifficulty: performance.nextQuizDifficulty,
    },
    {
      attempts: 1,
      questions: 15,
      correct: 8,
      incorrect: 7,
      averageScore: 53,
      accuracy: 53,
      nextDifficulty: 'Easy',
    }
  );
  assert.deepEqual(
    performance.topics.map(({ topicName, accuracy, level }) => ({ topicName, accuracy, level })),
    [
      { topicName: 'Processes', accuracy: 20, level: 'weak' },
      { topicName: 'Memory Management', accuracy: 60, level: 'moderate' },
      { topicName: 'Concurrency', accuracy: 80, level: 'strong' },
      { topicName: 'File Systems', accuracy: null, level: 'unassessed' },
    ]
  );
});

test('averages completed attempt percentages separately from overall accuracy', () => {
  const performance = analyzeQuizPerformance([], [
    {
      _id: 'attempt-1',
      totalQuestions: 5,
      correctAnswers: 2,
      incorrectAnswers: 3,
      score: 0.4,
      maxScore: 1,
    },
    {
      _id: 'attempt-2',
      totalQuestions: 10,
      correctAnswers: 5,
      incorrectAnswers: 5,
      scorePercentage: 50,
    },
    {
      _id: 'attempt-3',
      totalQuestions: 5,
      answers: [true, true, false, false, false].map((isCorrect) => ({ isCorrect })),
    },
    {
      _id: 'incomplete-attempt',
      status: 'in-progress',
      totalQuestions: 100,
      correctAnswers: 100,
      scorePercentage: 100,
    },
  ]);

  assert.equal(performance.totalAttempts, 3);
  assert.equal(performance.totalQuestions, 20);
  assert.equal(performance.correctAnswers, 9);
  assert.equal(performance.incorrectAnswers, 11);
  assert.equal(performance.averageScore, 43);
  assert.equal(performance.overallAccuracy, 45);
});

test('normalizes fractional score percentages and handles missing or zero score data', () => {
  const fractional = analyzeQuizPerformance([], [{
    _id: 'fractional-score',
    scorePercentage: 0.45,
  }]);
  const noAttempts = analyzeQuizPerformance([], []);
  const zeroMaximum = analyzeQuizPerformance([], [{
    _id: 'zero-maximum',
    score: 1,
    maxScore: 0,
    scorePercentage: null,
  }]);

  assert.equal(fractional.averageScore, 45);
  assert.equal(noAttempts.averageScore, null);
  assert.equal(noAttempts.overallAccuracy, null);
  assert.equal(zeroMaximum.averageScore, null);
});

test('stores average score in recommendation analytics', () => {
  assert.ok(LearningRecommendation.schema.path('analytics.averageScore'));
});

test('attributes legacy single-topic answers but does not guess multi-topic attribution', () => {
  const results = [
    {
      _id: '507f1f77bcf86cd799439022',
      subjectId,
      totalQuestions: 2,
      correctAnswers: 1,
      incorrectAnswers: 1,
      topics: ['Processes'],
      answers: [{ isCorrect: true }, { isCorrect: false }],
    },
    {
      _id: '507f1f77bcf86cd799439023',
      subjectId,
      totalQuestions: 1,
      correctAnswers: 1,
      incorrectAnswers: 0,
      topics: ['Processes', 'Memory Management'],
      answers: [{ isCorrect: true }],
    },
  ];
  const performance = analyzeQuizPerformance(createSubjects(), results);
  const process = performance.topics.find((topic) => topic.topicId === weakTopicId);
  const memory = performance.topics.find((topic) => topic.topicId === moderateTopicId);

  assert.equal(process.totalQuestions, 2);
  assert.equal(process.correctAnswers, 1);
  assert.equal(memory.totalQuestions, 0);
});

test('does not guess legacy attribution when a topic name is ambiguous', () => {
  const subjects = [{
    ...createSubjects()[0],
    topics: [
      ...createSubjects()[0].topics,
      { _id: '507f1f77bcf86cd799439016', name: 'Processes', status: 'Not Started' },
    ],
  }];
  const result = {
    _id: '507f1f77bcf86cd799439022',
    subjectId,
    topics: ['Processes'],
    totalQuestions: 1,
    correctAnswers: 1,
    incorrectAnswers: 0,
    answers: [{ isCorrect: true }],
  };
  const performance = analyzeQuizPerformance(subjects, [result]);

  assert.equal(performance.topics.find((topic) => topic.topicId === weakTopicId).totalQuestions, 0);
  assert.equal(performance.topics.find((topic) => topic.topicId === '507f1f77bcf86cd799439016').totalQuestions, 0);
});

test('recommendation response is validated and difficulty follows measured level', () => {
  const performance = analyzeQuizPerformance(createSubjects(), createResults());
  const weak = performance.assessedTopics[0];
  const response = parseRecommendations(
    `\`\`\`json\n${JSON.stringify({
      overallGuidance: 'Review process states before taking another quiz.',
      recommendations: [{
        topicId: weak.topicId,
        priority: 'high',
        reason: 'Processes accuracy is 20%.',
        action: 'Review process lifecycle and answer practice questions.',
        recommendedDifficulty: 'Hard',
      }],
    })}\n\`\`\``,
    performance.assessedTopics
  );

  assert.equal(response.recommendations[0].recommendedDifficulty, 'Easy');
  assert.equal(response.recommendations[0].priority, 'high');
  assert.throws(
    () => parseRecommendations('not json', performance.assessedTopics),
    SyntaxError
  );
  assert.throws(
    () => parseRecommendations(JSON.stringify({
      overallGuidance: 'Review.',
      recommendations: [{
        topicId: unassessedTopicId,
        priority: 'high',
        reason: 'No measured performance.',
        action: 'Take a quiz.',
        recommendedDifficulty: 'Easy',
      }],
    }), performance.assessedTopics),
    /invalid topic recommendation/
  );
  assert.throws(
    () => parseRecommendations(JSON.stringify({
      overallGuidance: 'Try a harder topic.',
      recommendations: [{
        topicId: strongTopicId,
        priority: 'low',
        reason: 'Strong topic.',
        action: 'Try a challenge.',
        recommendedDifficulty: 'Hard',
      }],
    }), performance.assessedTopics),
    /invalid topic recommendation/
  );
});

test('recommends strong topics only when no weak or moderate topics remain', () => {
  const performance = analyzeQuizPerformance(createSubjects(), createResults());
  const strongOnly = performance.assessedTopics.filter((topic) => topic.level === 'strong');
  const response = parseRecommendations(JSON.stringify({
    overallGuidance: 'Keep challenging yourself.',
    recommendations: [{
      topicId: strongOnly[0].topicId,
      priority: 'high',
      reason: 'Current accuracy is 80%.',
      action: 'Try a more complex concurrency problem.',
      recommendedDifficulty: 'Easy',
    }],
  }), strongOnly);

  assert.equal(response.recommendations[0].priority, 'low');
  assert.equal(response.recommendations[0].recommendedDifficulty, 'Hard');
});

test('source fingerprint changes with quiz or study-plan updates', () => {
  const subjects = createSubjects();
  const results = createResults();
  const fingerprint = createSourceFingerprint(subjects, results);
  assert.equal(createSourceFingerprint(subjects, results), fingerprint);
  assert.notEqual(
    createSourceFingerprint(subjects, [{ ...results[0], scorePercentage: 50 }]),
    fingerprint
  );
  assert.notEqual(
    createSourceFingerprint([{ ...subjects[0], updatedAt: new Date('2026-11-11T00:00:00Z') }], results),
    fingerprint
  );
  assert.notEqual(
    createSourceFingerprint(subjects, [{ ...results[0], score: 50, maxScore: 100 }]),
    fingerprint
  );
});

test('new quiz questions require a valid selected topic attribution', () => {
  const topics = [{ id: weakTopicId, name: 'Processes' }];
  const question = {
    question: 'What is a process?',
    topicId: weakTopicId,
    options: ['A program in execution', 'A storage device', 'A protocol', 'A compiler'],
    correctAnswer: 'A',
    explanation: 'A process is a program in execution.',
  };
  const parsed = parseGeneratedQuiz(JSON.stringify({ questions: [question] }), 1, topics);

  assert.equal(parsed[0].topicId, weakTopicId);
  assert.equal(parsed[0].topicName, 'Processes');
  assert.throws(
    () => parseGeneratedQuiz(JSON.stringify({
      questions: [{ ...question, topicId: unassessedTopicId }],
    }), 1, topics),
    /invalid question/
  );
});
