import mongoose from 'mongoose';
import { StudyTarget, Subject } from '../models/index.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const sendValidationError = (res, error) =>
  res.status(400).json({ success: false, message: error.message });

const getOwnedSubject = (subjectId, studentId) =>
  Subject.findOne({ _id: subjectId, student: studentId });

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
      { new: true, runValidators: true }
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
