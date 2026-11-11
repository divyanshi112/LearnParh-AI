import mongoose from 'mongoose';
import { QuizResult, QuizSession, Subject } from '../models/index.js';
import { generateQuizResponse, GeminiServiceError } from '../services/gemini.service.js';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_COUNTS = [5, 10, 15];
const OPTION_KEYS = ['A', 'B', 'C', 'D'];

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export function parseGeneratedQuiz(content, questionCount, selectedTopics) {
  const json = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(json);
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length !== questionCount) {
    throw new Error('Gemini returned an unexpected question count.');
  }

  const topicById = new Map(selectedTopics.map((topic) => [String(topic.id), topic]));
  return parsed.questions.map((question, index) => {
    const options = question?.options;
    const topic = topicById.get(String(question?.topicId));
    if (
      !question
      || typeof question.question !== 'string'
      || !question.question.trim()
      || !topic
      || typeof question.explanation !== 'string'
      || !question.explanation.trim()
      || !Array.isArray(options)
      || options.length !== OPTION_KEYS.length
      || options.some((option) => typeof option !== 'string' || !option.trim())
      || new Set(options.map((option) => option.trim())).size !== OPTION_KEYS.length
      || !OPTION_KEYS.includes(question.correctAnswer)
    ) {
      throw new Error(`Gemini returned an invalid question at position ${index + 1}.`);
    }

    return {
      questionId: String(index + 1),
      question: question.question.trim(),
      topicId: topic.id,
      topicName: topic.name,
      options: Object.fromEntries(OPTION_KEYS.map((key, optionIndex) => [key, options[optionIndex].trim()])),
      correctAnswer: question.correctAnswer,
      explanation: question.explanation.trim(),
    };
  });
}

export async function generateQuiz(req, res) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Only student accounts can generate quizzes.' });
  }

  const { subjectId, topicIds, difficulty, questionCount } = req.body;
  if (!isValidObjectId(subjectId)) {
    return res.status(400).json({ success: false, message: 'A valid subject is required.' });
  }
  if (
    !Array.isArray(topicIds)
    || topicIds.length < 1
    || topicIds.length > 20
    || topicIds.some((id) => !isValidObjectId(id))
    || new Set(topicIds.map(String)).size !== topicIds.length
  ) {
    return res.status(400).json({ success: false, message: 'Select one or more valid topics.' });
  }
  if (!DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({ success: false, message: 'Difficulty must be Easy, Medium, or Hard.' });
  }
  if (!QUESTION_COUNTS.includes(questionCount)) {
    return res.status(400).json({ success: false, message: 'Question count must be 5, 10, or 15.' });
  }

  const subject = await Subject.findOne({ _id: subjectId, student: req.user.id });
  if (!subject) {
    return res.status(404).json({ success: false, message: 'Study-plan subject not found.' });
  }
  const selectedTopics = topicIds.map((id) => subject.topics.id(id));
  if (selectedTopics.some((topic) => !topic)) {
    return res.status(400).json({ success: false, message: 'One or more selected topics do not belong to this subject.' });
  }

  const selectedTopicData = selectedTopics.map((topic) => ({
    id: String(topic._id),
    name: topic.name,
  }));
  const topicNames = selectedTopics.map((topic) => topic.name);
  const prompt = [
    'Create a multiple-choice practice quiz for a student.',
    `Subject: ${subject.name}`,
    `Topics: ${selectedTopicData.map((topic) => `${topic.name} (topicId: ${topic.id})`).join('; ')}`,
    `Difficulty: ${difficulty}`,
    `Create exactly ${questionCount} distinct questions, evenly covering the selected topics where possible.`,
    'Questions must be factually accurate, relevant only to this subject and the selected topics, and match the requested difficulty.',
    'Each question must have exactly four distinct plausible option strings in an array ordered A, B, C, and D, one unambiguous correct answer labeled A, B, C, or D, and a concise explanation.',
    'For every question, include the topicId of the single selected topic it tests. Use only one of the supplied topic IDs.',
    'Return only valid JSON with this shape:',
    '{"questions":[{"question":"Question text","topicId":"selected topic ID","options":["Option A text","Option B text","Option C text","Option D text"],"correctAnswer":"A","explanation":"Explanation"}]}',
  ].join('\n');

  try {
    console.info('[Quiz] Generating quiz', JSON.stringify({
      studentId: req.user.id,
      subjectId: String(subject._id),
      subject: subject.name,
      difficulty,
      questionCount,
    }));
    const generatedContent = await generateQuizResponse(prompt, questionCount, selectedTopicData.map((topic) => topic.id));
    const questions = parseGeneratedQuiz(generatedContent, questionCount, selectedTopicData);
    const session = await QuizSession.create({
      student: req.user.id,
      subjectId: subject._id,
      subjectName: subject.name,
      topics: topicNames,
      difficulty,
      questions,
    });

    return res.status(201).json({
      success: true,
      quiz: {
        id: session._id,
        subject: session.subjectName,
        topics: session.topics,
        difficulty: session.difficulty,
        totalQuestions: questions.length,
        questions: questions.map(({ questionId, question, options }) => ({
          questionId,
          question,
          options: OPTION_KEYS.map((key) => options[key]),
        })),
      },
    });
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    if (error instanceof SyntaxError || error.message?.startsWith('Gemini returned')) {
      console.error('[Quiz] Gemini returned invalid quiz data', error.message);
      return res.status(502).json({
        success: false,
        message: 'Gemini did not return a valid quiz with the requested number of questions. Please try again.',
      });
    }
    throw error;
  }
}

export async function submitQuiz(req, res) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Only student accounts can submit quizzes.' });
  }

  const { quizId, answers } = req.body;
  if (!isValidObjectId(quizId)) {
    return res.status(400).json({ success: false, message: 'A valid quiz ID is required.' });
  }
  if (!Array.isArray(answers)) {
    return res.status(400).json({ success: false, message: 'Answers must be provided as a list.' });
  }

  const answerByQuestionId = new Map();
  for (const answer of answers) {
    if (
      !answer
      || typeof answer.questionId !== 'string'
      || !OPTION_KEYS.includes(answer.selectedOption)
      || answerByQuestionId.has(answer.questionId)
    ) {
      return res.status(400).json({ success: false, message: 'Each answer must contain a question ID and one option (A-D).' });
    }
    answerByQuestionId.set(answer.questionId, answer.selectedOption);
  }

  const session = await QuizSession.findOne({
    _id: quizId,
    student: req.user.id,
    expiresAt: { $gt: new Date() },
  });
  if (!session) {
    return res.status(404).json({ success: false, message: 'Quiz not found or expired. Generate a new quiz to continue.' });
  }

  const questionIds = new Set(session.questions.map((question) => question.questionId));
  if ([...answerByQuestionId.keys()].some((questionId) => !questionIds.has(questionId))) {
    return res.status(400).json({ success: false, message: 'Answers contain a question that is not part of this quiz.' });
  }

  const answersForResult = session.questions.map((question) => {
    const selectedOption = answerByQuestionId.get(question.questionId) || 'Unanswered';
    return {
      questionId: question.questionId,
      questionText: question.question,
      topicId: question.topicId,
      topicName: question.topicName,
      options: OPTION_KEYS.map((key) => question.options[key]),
      selectedOption,
      correctOption: question.correctAnswer,
      isCorrect: selectedOption === question.correctAnswer,
      explanation: question.explanation,
    };
  });
  const correctAnswers = answersForResult.filter((answer) => answer.isCorrect).length;
  const totalQuestions = answersForResult.length;

  try {
    const result = await QuizResult.create({
      student: req.user.id,
      quizSessionId: session._id,
      subjectId: session.subjectId,
      topics: session.topics,
      quizTitle: `${session.subjectName} Practice Quiz`,
      category: session.subjectName,
      difficulty: session.difficulty,
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
      scorePercentage: Math.round((correctAnswers / totalQuestions) * 100),
      answers: answersForResult,
      completedAt: new Date(),
    });
    await QuizSession.deleteOne({ _id: session._id, student: req.user.id });

    return res.json({
      success: true,
      attempt: result,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'This quiz has already been submitted.' });
    }
    throw error;
  }
}

export async function listQuizHistory(req, res) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Only student accounts can access quiz history.' });
  }

  const attempts = await QuizResult.find({ student: req.user.id })
    .select('-quizSessionId -__v')
    .sort({ completedAt: -1 })
    .limit(50)
    .lean();
  return res.json({ success: true, attempts });
}
