import { createHash } from 'node:crypto';

const nextDifficultyByLevel = {
  weak: 'Easy',
  moderate: 'Medium',
  strong: 'Hard',
};

function nonNegativeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function getAttemptStatistics(result) {
  const answers = Array.isArray(result.answers) ? result.answers : [];
  const validAnswers = answers.filter((answer) => typeof answer?.isCorrect === 'boolean');
  let totalQuestions = nonNegativeNumber(result.totalQuestions);
  let correctAnswers = nonNegativeNumber(result.correctAnswers);

  if (totalQuestions === null || totalQuestions === 0) {
    totalQuestions = validAnswers.length || null;
  }
  if (correctAnswers === null && validAnswers.length) {
    correctAnswers = validAnswers.filter((answer) => answer.isCorrect).length;
  }
  if (correctAnswers === null && totalQuestions !== null) {
    const incorrectAnswers = nonNegativeNumber(result.incorrectAnswers);
    if (incorrectAnswers !== null && incorrectAnswers <= totalQuestions) {
      correctAnswers = totalQuestions - incorrectAnswers;
    }
  }
  if (
    totalQuestions === null ||
    totalQuestions === 0 ||
    correctAnswers === null ||
    correctAnswers > totalQuestions
  ) {
    return null;
  }

  return {
    totalQuestions,
    correctAnswers,
    incorrectAnswers: totalQuestions - correctAnswers,
  };
}

function getAttemptPercentage(result, statistics) {
  const score = nonNegativeNumber(result.score);
  const maximumScore = nonNegativeNumber(result.maxScore ?? result.maximumScore);
  if (score !== null && maximumScore > 0 && score <= maximumScore) {
    return (score / maximumScore) * 100;
  }

  if (statistics) {
    return (statistics.correctAnswers / statistics.totalQuestions) * 100;
  }

  const scorePercentage = nonNegativeNumber(result.scorePercentage);
  if (scorePercentage !== null && scorePercentage <= 100) {
    return scorePercentage > 0 && scorePercentage < 1
      ? scorePercentage * 100
      : scorePercentage;
  }
  return null;
}

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
      score: result.score ?? null,
      maxScore: result.maxScore ?? result.maximumScore ?? null,
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
  const completedResults = quizResults.filter((result) => (
    result &&
    result.completed !== false &&
    !['incomplete', 'in-progress', 'paused', 'running'].includes(result.status)
  ));
  let totalQuestions = 0;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let scoreTotal = 0;
  let scoredAttempts = 0;

  for (const result of completedResults) {
    const statistics = getAttemptStatistics(result);
    if (statistics) {
      totalQuestions += statistics.totalQuestions;
      correctAnswers += statistics.correctAnswers;
      incorrectAnswers += statistics.incorrectAnswers;
    }
    const attemptPercentage = getAttemptPercentage(result, statistics);
    if (attemptPercentage !== null) {
      scoreTotal += attemptPercentage;
      scoredAttempts += 1;
    }

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
    totalAttempts: completedResults.length,
    totalQuestions,
    correctAnswers,
    incorrectAnswers,
    averageScore: scoredAttempts ? Math.round(scoreTotal / scoredAttempts) : null,
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
