import mongoose from 'mongoose';
import {
  QuizResult,
  StudentProfile,
  StudySession,
  StudyTarget,
  Subject,
  User,
} from '../models/index.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const sendValidationError = (res, error) =>
  res.status(400).json({ success: false, message: error.message });

const getOwnedSubject = (subjectId, studentId) =>
  Subject.findOne({ _id: subjectId, student: studentId });

export function dateKeyInTimeZone(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addCalendarDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function localMidnightAsUtc(dateKey, timeZone) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const desiredWallClock = Date.UTC(year, month - 1, day);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(desiredWallClock));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
  const representedWallClock = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );
  return new Date(desiredWallClock - (representedWallClock - desiredWallClock));
}

export const getDashboardSummary = async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Only student accounts can access the dashboard' });
  }

  const studentId = new mongoose.Types.ObjectId(req.user.id);
  const timeZone = typeof req.query.timeZone === 'string'
    ? req.query.timeZone
    : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch {
    return res.status(400).json({ success: false, message: 'A valid local time zone is required.' });
  }
  const todayKey = dateKeyInTimeZone(new Date(), timeZone);
  const weekday = new Date(`${todayKey}T00:00:00.000Z`).getUTCDay();
  const weekStartKey = addCalendarDays(todayKey, -((weekday + 6) % 7));
  const weekEndKey = addCalendarDays(weekStartKey, 7);
  const startOfToday = localMidnightAsUtc(todayKey, timeZone);
  const endOfToday = localMidnightAsUtc(addCalendarDays(todayKey, 1), timeZone);
  const startOfWeek = localMidnightAsUtc(weekStartKey, timeZone);
  const endOfWeek = localMidnightAsUtc(weekEndKey, timeZone);

  const [account, profile, subjects, todayTargets, sessionTimeByDay, quizSummary, weeklyQuizCounts] =
    await Promise.all([
      User.findById(studentId).select('name email').lean(),
      StudentProfile.findOne({ user: studentId })
        .select('fullName profilePicture academicTrack targetExamDate dailyStudyTarget')
        .lean(),
      Subject.find({ student: studentId })
        .select('name topics._id topics.name topics.status')
        .sort({ name: 1 })
        .lean(),
      StudyTarget.find({
        student: studentId,
        targetDate: { $gte: startOfToday, $lt: endOfToday },
      })
        .populate({ path: 'subject', select: 'name', match: { student: studentId } })
        .sort({ targetDate: 1, createdAt: 1 })
        .lean(),
      StudySession.aggregate([
        {
          $match: {
            userId: studentId,
            status: { $in: ['completed', 'paused', 'running'] },
            startTime: { $gte: startOfWeek, $lt: endOfWeek },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$startTime',
                timezone: timeZone,
              },
            },
            durationSeconds: { $sum: '$durationSeconds' },
            sessions: { $sum: 1 },
          },
        },
      ]),
      QuizResult.aggregate([
        { $match: { student: studentId } },
        {
          $group: {
            _id: null,
            attempts: { $sum: 1 },
            correctAnswers: { $sum: '$correctAnswers' },
            totalQuestions: { $sum: '$totalQuestions' },
          },
        },
      ]),
      QuizResult.aggregate([
        {
          $match: {
            student: studentId,
            completedAt: { $gte: startOfWeek, $lt: endOfWeek },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$completedAt',
                timezone: timeZone,
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  if (!account) {
    return res.status(404).json({ success: false, message: 'Student account not found' });
  }

  const subjectsWithProgress = subjects.map((subject) => {
    const topics = subject.topics || [];
    const completedTopics = topics.filter((topic) => topic.status === 'Completed').length;
    const pendingTopics = topics.filter(
      (topic) => topic.status !== 'Completed' && topic.status !== 'In Progress'
    ).length;
    const inProgressTopics = topics.filter((topic) => topic.status === 'In Progress').length;

    return {
      id: subject._id,
      name: subject.name,
      totalTopics: topics.length,
      completedTopics,
      pendingTopics,
      inProgressTopics,
      completionPercentage: topics.length
        ? Math.round((completedTopics / topics.length) * 100)
        : 0,
      topics: topics.map((topic) => ({
        id: topic._id,
        name: topic.name,
        status: topic.status,
      })),
    };
  });

  const allTopics = subjectsWithProgress.flatMap((subject) =>
    subject.topics.map((topic) => ({ ...topic, subject: subject.name }))
  );
  const totalTopics = allTopics.length;
  const completedTopics = allTopics.filter((topic) => topic.status === 'Completed').length;
  const pendingTopics = allTopics.filter(
    (topic) => topic.status !== 'Completed' && topic.status !== 'In Progress'
  ).length;
  const inProgressTopics = allTopics.filter((topic) => topic.status === 'In Progress').length;
  const dailyTargets = todayTargets.map((target) => ({
    id: target._id,
    title: target.title,
    targetDate: target.targetDate,
    completed: target.completed,
    subject: target.subject?.name || null,
  }));
  const completedTargets = dailyTargets.filter((target) => target.completed).length;
  const quizTotals = quizSummary[0] || { attempts: 0, correctAnswers: 0, totalQuestions: 0 };
  const studyByDate = new Map(
    sessionTimeByDay.map((record) => [record._id, {
      durationSeconds: record.durationSeconds || 0,
      sessions: record.sessions || 0,
    }])
  );
  const quizzesByDate = new Map(weeklyQuizCounts.map((record) => [record._id, record.count]));
  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const dateKey = addCalendarDays(weekStartKey, index);
    const date = new Date(localMidnightAsUtc(dateKey, timeZone).getTime() + 12 * 60 * 60 * 1000);
    const study = studyByDate.get(dateKey);
    return {
      date: dateKey,
      day: new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date),
      hours: (study?.durationSeconds || 0) / 3600,
      sessions: study?.sessions || 0,
      target: profile?.dailyStudyTarget ?? null,
      quizzes: quizzesByDate.get(dateKey) || 0,
    };
  });

  return res.json({
    success: true,
    data: {
      student: {
        name: profile?.fullName || account.name,
        email: account.email,
        profilePicture: profile?.profilePicture || '',
        academicTrack: profile?.academicTrack || '',
        targetExamDate: profile?.targetExamDate || null,
        dailyStudyTarget: profile?.dailyStudyTarget ?? null,
      },
      studyPlan: {
        totalSubjects: subjectsWithProgress.length,
        totalTopics,
        completedTopics,
        pendingTopics,
        inProgressTopics,
        completionPercentage: totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0,
        subjects: subjectsWithProgress,
        nextTopics: allTopics
          .filter((topic) => topic.status !== 'Completed')
          .sort((left, right) => {
            if (left.status === right.status) return left.name.localeCompare(right.name);
            return left.status === 'In Progress' ? -1 : 1;
          })
          .slice(0, 3),
      },
      today: {
        date: startOfToday.toISOString(),
        studyHoursLogged: (studyByDate.get(todayKey)?.durationSeconds || 0) / 3600,
        targets: dailyTargets,
        completedTargets,
        totalTargets: dailyTargets.length,
        completionPercentage: dailyTargets.length
          ? Math.round((completedTargets / dailyTargets.length) * 100)
          : 0,
      },
      quizSummary: {
        attempts: quizTotals.attempts,
        correctAnswers: quizTotals.correctAnswers,
        totalQuestions: quizTotals.totalQuestions,
        accuracyPercentage: quizTotals.totalQuestions
          ? Math.round((quizTotals.correctAnswers / quizTotals.totalQuestions) * 100)
          : null,
      },
      weeklyActivity,
    },
  });
};

const validateSubjectInput = ({ name, description }, partial = false) => {
  const errors = {};
  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
      errors.name = 'Subject name is required and must be 100 characters or fewer';
    }
  }
  if (description !== undefined && (
    typeof description !== 'string' || description.length > 1000
  )) {
    errors.description = 'Description must be 1000 characters or fewer';
  }
  return errors;
};

const getValidatedTargetFields = async (input, studentId, existing = {}) => {
  const allowedFields = ['title', 'subjectId', 'topicId', 'targetDate', 'completed'];
  const unknownFields = Object.keys(input).filter((key) => !allowedFields.includes(key));
  if (unknownFields.length) {
    return { error: 'Target contains unsupported fields' };
  }

  const title = Object.hasOwn(input, 'title') ? input.title : existing.title;
  const subjectId = Object.hasOwn(input, 'subjectId')
    ? input.subjectId
    : existing.subject?.toString();
  const providedTopicId = Object.hasOwn(input, 'topicId')
    ? input.topicId
    : existing.topic?.toString();
  const topicId = providedTopicId == null ? '' : providedTopicId;
  const targetDate = Object.hasOwn(input, 'targetDate') ? input.targetDate : existing.targetDate;
  const completed = Object.hasOwn(input, 'completed')
    ? input.completed
    : existing.completed ?? false;

  if (typeof title !== 'string' || !title.trim() || title.trim().length > 160) {
    return { error: 'Target title is required and must be 160 characters or fewer' };
  }
  if (!isValidObjectId(subjectId)) {
    return { error: 'A valid subject is required' };
  }
  if (topicId && !isValidObjectId(topicId)) {
    return { error: 'A valid topic is required' };
  }
  if (typeof completed !== 'boolean') {
    return { error: 'Completion status must be a boolean' };
  }
  const parsedDate = new Date(targetDate);
  if (!targetDate || Number.isNaN(parsedDate.getTime())) {
    return { error: 'A valid target date is required' };
  }

  const subject = await getOwnedSubject(subjectId, studentId);
  if (!subject) return { error: 'Subject not found' };

  if (topicId && !subject.topics.id(topicId)) {
    return { error: 'Topic not found for this subject' };
  }

  return {
    fields: {
      title: title.trim(),
      subject: subject._id,
      topic: topicId || null,
      targetDate: parsedDate,
      completed,
    },
  };
};

export const listSubjects = async (req, res) => {
  const subjects = await Subject.find({ student: req.user.id }).sort({ name: 1 });
  return res.json({ success: true, subjects });
};

export const createSubject = async (req, res) => {
  const errors = validateSubjectInput(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, errors });
  }

  try {
    const subject = await Subject.create({
      student: req.user.id,
      name: req.body.name.trim(),
      description: req.body.description?.trim() || '',
    });
    return res.status(201).json({ success: true, subject });
  } catch (error) {
    if (error.name === 'ValidationError') return sendValidationError(res, error);
    throw error;
  }
};

export const updateSubject = async (req, res) => {
  if (!isValidObjectId(req.params.subjectId)) {
    return res.status(400).json({ success: false, message: 'Invalid subject ID' });
  }
  const errors = validateSubjectInput(req.body, true);
  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, errors });
  }
  if (!Object.hasOwn(req.body, 'name') && !Object.hasOwn(req.body, 'description')) {
    return res.status(400).json({ success: false, message: 'No subject fields provided' });
  }

  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name.trim();
  if (req.body.description !== undefined) updates.description = req.body.description.trim();

  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.subjectId, student: req.user.id },
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    return res.json({ success: true, subject });
  } catch (error) {
    if (error.name === 'ValidationError') return sendValidationError(res, error);
    throw error;
  }
};

export const deleteSubject = async (req, res) => {
  if (!isValidObjectId(req.params.subjectId)) {
    return res.status(400).json({ success: false, message: 'Invalid subject ID' });
  }
  const subject = await Subject.findOneAndDelete({
    _id: req.params.subjectId,
    student: req.user.id,
  });
  if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
  await StudyTarget.deleteMany({ student: req.user.id, subject: subject._id });
  return res.json({ success: true, message: 'Subject deleted' });
};

export const createTopic = async (req, res) => {
  if (!isValidObjectId(req.params.subjectId)) {
    return res.status(400).json({ success: false, message: 'Invalid subject ID' });
  }
  if (typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.trim().length > 120) {
    return res.status(400).json({
      success: false,
      message: 'Topic name is required and must be 120 characters or fewer',
    });
  }
  const subject = await getOwnedSubject(req.params.subjectId, req.user.id);
  if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

  const topic = subject.topics.create({ name: req.body.name.trim() });
  subject.topics.push(topic);
  try {
    await subject.save();
    return res.status(201).json({ success: true, topic });
  } catch (error) {
    if (error.name === 'ValidationError') return sendValidationError(res, error);
    throw error;
  }
};

export const updateTopic = async (req, res) => {
  const { subjectId, topicId } = req.params;
  if (!isValidObjectId(subjectId) || !isValidObjectId(topicId)) {
    return res.status(400).json({ success: false, message: 'Invalid subject or topic ID' });
  }
  const updates = {};
  if (req.body.name !== undefined) {
    if (typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.trim().length > 120) {
      return res.status(400).json({
        success: false,
        message: 'Topic name is required and must be 120 characters or fewer',
      });
    }
    updates.name = req.body.name.trim();
  }
  if (req.body.status !== undefined) {
    if (!['Not Started', 'In Progress', 'Completed'].includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Invalid topic status' });
    }
    updates.status = req.body.status;
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ success: false, message: 'No topic fields provided' });
  }

  const subject = await getOwnedSubject(subjectId, req.user.id);
  if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
  const topic = subject.topics.id(topicId);
  if (!topic) return res.status(404).json({ success: false, message: 'Topic not found' });
  Object.assign(topic, updates);
  try {
    await subject.save();
    return res.json({ success: true, topic });
  } catch (error) {
    if (error.name === 'ValidationError') return sendValidationError(res, error);
    throw error;
  }
};

export const deleteTopic = async (req, res) => {
  const { subjectId, topicId } = req.params;
  if (!isValidObjectId(subjectId) || !isValidObjectId(topicId)) {
    return res.status(400).json({ success: false, message: 'Invalid subject or topic ID' });
  }
  const subject = await getOwnedSubject(subjectId, req.user.id);
  if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
  const topic = subject.topics.id(topicId);
  if (!topic) return res.status(404).json({ success: false, message: 'Topic not found' });

  subject.topics.pull(topicId);
  await subject.save();
  await StudyTarget.deleteMany({ student: req.user.id, subject: subject._id, topic: topicId });
  return res.json({ success: true, message: 'Topic deleted' });
};

export const listTargets = async (req, res) => {
  const targets = await StudyTarget.find({ student: req.user.id })
    .populate({ path: 'subject', select: 'name', match: { student: req.user.id } })
    .sort({ targetDate: 1, createdAt: -1 });
  return res.json({ success: true, targets });
};

export const createTarget = async (req, res) => {
  const result = await getValidatedTargetFields(req.body, req.user.id);
  if (result.error) {
    const status = result.error === 'Subject not found' || result.error.startsWith('Topic not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: result.error });
  }
  const target = await StudyTarget.create({
    ...result.fields,
    student: req.user.id,
  });
  await target.populate('subject', 'name');
  return res.status(201).json({ success: true, target });
};

export const updateTarget = async (req, res) => {
  if (!isValidObjectId(req.params.targetId)) {
    return res.status(400).json({ success: false, message: 'Invalid target ID' });
  }
  const target = await StudyTarget.findOne({ _id: req.params.targetId, student: req.user.id });
  if (!target) return res.status(404).json({ success: false, message: 'Target not found' });

  const result = await getValidatedTargetFields(req.body, req.user.id, target);
  if (result.error) {
    const status = result.error === 'Subject not found' || result.error.startsWith('Topic not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: result.error });
  }
  Object.assign(target, result.fields);
  try {
    await target.save();
    await target.populate('subject', 'name');
    return res.json({ success: true, target });
  } catch (error) {
    if (error.name === 'ValidationError') return sendValidationError(res, error);
    throw error;
  }
};

export const deleteTarget = async (req, res) => {
  if (!isValidObjectId(req.params.targetId)) {
    return res.status(400).json({ success: false, message: 'Invalid target ID' });
  }
  const target = await StudyTarget.findOneAndDelete({
    _id: req.params.targetId,
    student: req.user.id,
  });
  if (!target) return res.status(404).json({ success: false, message: 'Target not found' });
  return res.json({ success: true, message: 'Target deleted' });
};
