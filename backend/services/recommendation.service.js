import { createHash } from 'node:crypto';

const nextDifficultyByLevel = {
  weak: 'Easy',
  moderate: 'Medium',
  strong: 'Hard',
};

function classifyTopic(accuracy) {
  if (accuracy < 60) return 'weak';
  if (accuracy < 80) return 'moderate';
  return 'strong';
}

export function getRecommendationCandidates(assessedTopics) {
  const topicsNeedingRevision = assessedTopics.filter((topic) => topic.level !== 'strong');
  return topicsNeedingRevision.length ? topicsNeedingRevision : assessedTopics;
}

export function createSourceFingerprint(subjects, quizResults) {
  const source = {
    subjects: subjects.map((subject) => ({
      id: String(subject._id),
      updatedAt: subject.updatedAt?.toISOString?.() || null,
      topics: (subject.topics || []).map((topic) => ({
        id: String(topic._id),
        name: topic.name,
        status: topic.status,
      })),
    })),
    quizResults: quizResults.map((result) => ({
      id: String(result._id),
      completedAt: result.completedAt?.toISOString?.() || null,
      totalQuestions: result.totalQuestions || 0,
      correctAnswers: result.correctAnswers || 0,
      incorrectAnswers: result.incorrectAnswers ?? null,
      scorePercentage: result.scorePercentage ?? null,
      answers: (result.answers || []).map((answer) => ({
        topicId: answer.topicId ? String(answer.topicId) : null,
        isCorrect: answer.isCorrect,
      })),
    })),
  };
  return createHash('sha256').update(JSON.stringify(source)).digest('hex');
}

export function analyzeQuizPerformance(subjects, quizResults) {
  const subjectById = new Map(subjects.map((subject) => [String(subject._id), subject]));
  const topicStats = new Map();
  let totalQuestions = 0;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let scoreTotal = 0;

  for (const result of quizResults) {
    totalQuestions += result.totalQuestions || 0;
    correctAnswers += result.correctAnswers || 0;
    incorrectAnswers += result.incorrectAnswers ?? Math.max(
      0,
      (result.totalQuestions || 0) - (result.correctAnswers || 0)
    );
    scoreTotal += Number.isFinite(result.scorePercentage)
      ? result.scorePercentage
      : result.totalQuestions
        ? Math.round((result.correctAnswers / result.totalQuestions) * 100)
        : 0;

    const subject = subjectById.get(String(result.subjectId));
    if (!subject) continue;

    for (const answer of result.answers || []) {
      let topicId = answer.topicId ? String(answer.topicId) : '';
      const subjectTopics = subject.topics || [];
      let topic = topicId
        ? subjectTopics.find((item) => String(item._id) === topicId)
        : null;

      if (!topic && result.topics?.length === 1) {
        const matchingTopics = subjectTopics.filter((item) => item.name === result.topics[0]);
        topic = matchingTopics.length === 1 ? matchingTopics[0] : null;
        topicId = topic ? String(topic._id) : '';
      }
      if (!topic || !topicId || typeof answer.isCorrect !== 'boolean') continue;

      const key = `${String(subject._id)}:${topicId}`;
      const stats = topicStats.get(key) || {
        topicId,
        subjectId: String(subject._id),
        subjectName: subject.name,
        topicName: topic.name,
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
      };
      stats.totalQuestions += 1;
      if (answer.isCorrect) stats.correctAnswers += 1;
      else stats.incorrectAnswers += 1;
      topicStats.set(key, stats);
    }
  }

  const topics = subjects.flatMap((subject) => (subject.topics || []).map((topic) => {
    const stats = topicStats.get(`${String(subject._id)}:${String(topic._id)}`);
    if (!stats) {
      return {
        topicId: String(topic._id),
        subjectId: String(subject._id),
        subjectName: subject.name,
        topicName: topic.name,
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracy: null,
        level: 'unassessed',
      };
    }

    const accuracy = Math.round((stats.correctAnswers / stats.totalQuestions) * 100);
    return { ...stats, accuracy, level: classifyTopic(accuracy) };
  }));
  const assessedTopics = topics.filter((topic) => topic.totalQuestions > 0);

  return {
    totalAttempts: quizResults.length,
    totalQuestions,
    correctAnswers,
    incorrectAnswers,
    averageScore: quizResults.length ? Math.round(scoreTotal / quizResults.length) : null,
    overallAccuracy: totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : null,
    topics,
    assessedTopics,
    nextQuizDifficulty: assessedTopics.length
      ? nextDifficultyByLevel[
          assessedTopics.reduce((weakest, topic) => (
            ['weak', 'moderate', 'strong'].indexOf(topic.level)
              < ['weak', 'moderate', 'strong'].indexOf(weakest)
              ? topic.level
              : weakest
          ), 'strong')
        ]
      : 'Easy',
  };
}

export function parseRecommendations(content, assessedTopics) {
  const json = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(json);
  const candidates = getRecommendationCandidates(assessedTopics);
  const topicById = new Map(candidates.map((topic) => [topic.topicId, topic]));
  if (
    !parsed
    || typeof parsed.overallGuidance !== 'string'
    || !parsed.overallGuidance.trim()
    || !Array.isArray(parsed.recommendations)
    || parsed.recommendations.length < 1
    || parsed.recommendations.length > 3
  ) {
    throw new Error('Gemini returned an invalid recommendation response.');
  }

  const seenTopicIds = new Set();
  const recommendations = parsed.recommendations.map((item) => {
    const topic = topicById.get(String(item?.topicId));
    if (
      !topic
      || seenTopicIds.has(topic.topicId)
      || !['high', 'medium', 'low'].includes(item.priority)
      || typeof item.reason !== 'string'
      || !item.reason.trim()
      || typeof item.action !== 'string'
      || !item.action.trim()
      || !['Easy', 'Medium', 'Hard'].includes(item.recommendedDifficulty)
    ) {
      throw new Error('Gemini returned an invalid topic recommendation.');
    }
    seenTopicIds.add(topic.topicId);

    return {
      topicId: topic.topicId,
      subjectId: topic.subjectId,
      subjectName: topic.subjectName,
      topicName: topic.topicName,
      priority: topic.level === 'weak' ? 'high' : topic.level === 'moderate' ? 'medium' : 'low',
      reason: item.reason.trim(),
      action: item.action.trim(),
      recommendedDifficulty: nextDifficultyByLevel[topic.level],
    };
  });

  return {
    overallGuidance: parsed.overallGuidance.trim(),
    recommendations,
  };
}
