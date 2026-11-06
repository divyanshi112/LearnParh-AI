import { StudentProfile, User } from '../models/index.js';

const PROFILE_FIELDS = new Set([
  'fullName',
  'profilePicture',
  'phoneNumber',
  'gender',
  'dateOfBirth',
  'collegeName',
  'universityRollNumber',
  'degree',
  'specialization',
  'currentYear',
  'currentSemester',
  'cgpa',
  'technicalSkills',
  'programmingLanguages',
  'careerGoal',
  'linkedinUrl',
  'githubUrl',
  'bio',
  'academicTrack',
  'targetExamDate',
  'dailyStudyTarget',
  'subjects',
]);
const TOPIC_STATUSES = new Set(['pending', 'in-progress', 'completed']);
const REQUIRED_ON_CREATE = [
  'fullName',
  'phoneNumber',
  'collegeName',
  'universityRollNumber',
  'degree',
  'specialization',
  'currentYear',
  'currentSemester',
  'technicalSkills',
  'programmingLanguages',
  'careerGoal',
  'bio',
  'academicTrack',
  'dailyStudyTarget',
];
const STRING_LIMITS = {
  fullName: 100,
  phoneNumber: 20,
  collegeName: 150,
  universityRollNumber: 50,
  degree: 100,
  specialization: 100,
  careerGoal: 300,
  linkedinUrl: 300,
  githubUrl: 300,
  bio: 1000,
  academicTrack: 100,
};
const GENDERS = new Set(['female', 'male', 'non-binary', 'prefer-not-to-say', 'other']);
const IMAGE_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const URL_FIELDS = ['linkedinUrl', 'githubUrl'];
const STRING_ARRAY_FIELDS = ['technicalSkills', 'programmingLanguages'];

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isValidWebUrl = (value) => {
  if (value === '') return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
};

const validateProfileInput = (body, { isCreate = false } = {}) => {
  const errors = {};

  if (!isPlainObject(body)) {
    return { errors: { body: 'Request body must be a JSON object' } };
  }

  for (const key of Object.keys(body)) {
    if (!PROFILE_FIELDS.has(key)) {
      errors[key] = key === 'user'
        ? 'User ID is assigned from the authentication token'
        : 'Unknown profile field';
    }
  }

  if (isCreate && !Object.hasOwn(body, 'academicTrack')) {
    errors.academicTrack = 'Academic track or course is required';
  }
  if (isCreate && !Object.hasOwn(body, 'dailyStudyTarget')) {
    errors.dailyStudyTarget = 'Daily study target is required';
  }
  if (isCreate) {
    for (const field of REQUIRED_ON_CREATE) {
      if (!Object.hasOwn(body, field)) {
        errors[field] = `${field} is required`;
      }
    }
  }
  if (!isCreate && Object.keys(body).length === 0) {
    errors.body = 'Provide at least one profile field to update';
  }

  const profile = {};

  for (const [field, maxLength] of Object.entries(STRING_LIMITS)) {
    if (!Object.hasOwn(body, field)) continue;
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      errors[field] = `${field} must be a non-empty string`;
    } else if (body[field].trim().length > maxLength) {
      errors[field] = `${field} cannot exceed ${maxLength} characters`;
    } else {
      profile[field] = body[field].trim();
    }
  }

  if (
    Object.hasOwn(body, 'phoneNumber') &&
    (typeof body.phoneNumber !== 'string' ||
      !/^\+?[\d\s().-]{7,20}$/.test(body.phoneNumber.trim()) ||
      body.phoneNumber.replace(/\D/g, '').length < 7 ||
      body.phoneNumber.replace(/\D/g, '').length > 15)
  ) {
    errors.phoneNumber = 'Enter a valid phone number with 7 to 15 digits';
  }

  if (Object.hasOwn(body, 'profilePicture')) {
    if (
      typeof body.profilePicture !== 'string' ||
      (body.profilePicture !== '' &&
        (!IMAGE_DATA_URL.test(body.profilePicture) || body.profilePicture.length > 700000))
    ) {
      errors.profilePicture = 'Profile picture must be a JPEG, PNG, or WebP image smaller than 512 KB';
    } else {
      profile.profilePicture = body.profilePicture;
    }
  }

  if (Object.hasOwn(body, 'gender')) {
    if (body.gender !== '' && !GENDERS.has(body.gender)) {
      errors.gender = 'Select a valid gender option';
    } else {
      profile.gender = body.gender;
    }
  }

  if (Object.hasOwn(body, 'dateOfBirth')) {
    if (body.dateOfBirth === null || body.dateOfBirth === '') {
      profile.dateOfBirth = null;
    } else if (
      typeof body.dateOfBirth !== 'string' ||
      Number.isNaN(Date.parse(body.dateOfBirth)) ||
      new Date(body.dateOfBirth) > new Date()
    ) {
      errors.dateOfBirth = 'Date of birth must be a valid date in the past';
    } else {
      profile.dateOfBirth = new Date(body.dateOfBirth);
    }
  }

  for (const [field, { min, max, integer = true }] of Object.entries({
    currentYear: { min: 1, max: 8 },
    currentSemester: { min: 1, max: 16 },
    cgpa: { min: 0, max: 10, integer: false },
  })) {
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < min ||
      value > max ||
      (integer && !Number.isInteger(value))
    ) {
      errors[field] = `${field} must be a ${integer ? 'whole number' : 'number'} from ${min} to ${max}`;
    } else {
      profile[field] = value;
    }
  }

  for (const field of STRING_ARRAY_FIELDS) {
    if (!Object.hasOwn(body, field)) continue;
    if (
      !Array.isArray(body[field]) ||
      body[field].some((item) => typeof item !== 'string' || !item.trim() || item.trim().length > 60)
    ) {
      errors[field] = `${field} must be a list of non-empty strings (up to 60 characters each)`;
    } else {
      profile[field] = [...new Set(body[field].map((item) => item.trim()))];
      if (isCreate && profile[field].length === 0) {
        errors[field] = `${field} must contain at least one item`;
      }
    }
  }

  for (const field of URL_FIELDS) {
    if (!Object.hasOwn(body, field)) continue;
    if (typeof body[field] !== 'string' || !isValidWebUrl(body[field].trim())) {
      errors[field] = `${field} must be a valid HTTP or HTTPS URL`;
    } else {
      profile[field] = body[field].trim();
    }
  }

  if (Object.hasOwn(body, 'academicTrack')) {
    if (!profile.academicTrack && !errors.academicTrack) {
      errors.academicTrack = 'Academic track or course must be a non-empty string';
    }
  }

  if (Object.hasOwn(body, 'targetExamDate')) {
    if (body.targetExamDate === null) {
      profile.targetExamDate = null;
    } else if (typeof body.targetExamDate !== 'string' || Number.isNaN(Date.parse(body.targetExamDate))) {
      errors.targetExamDate = 'Target exam date must be a valid date string or null';
    } else {
      profile.targetExamDate = new Date(body.targetExamDate);
    }
  }

  if (Object.hasOwn(body, 'dailyStudyTarget')) {
    const target = body.dailyStudyTarget;
    if (typeof target !== 'number' || !Number.isFinite(target) || target < 0.25 || target > 24) {
      errors.dailyStudyTarget = 'Daily study target must be a number from 0.25 to 24 hours';
    } else {
      profile.dailyStudyTarget = target;
    }
  }

  if (Object.hasOwn(body, 'subjects')) {
    if (!Array.isArray(body.subjects)) {
      errors.subjects = 'Subjects must be an array';
    } else {
      profile.subjects = body.subjects.map((subject, subjectIndex) => {
        const subjectPath = `subjects[${subjectIndex}]`;
        if (!isPlainObject(subject)) {
          errors[subjectPath] = 'Subject must be an object';
          return subject;
        }

        for (const key of Object.keys(subject)) {
          if (!['name', 'topics'].includes(key)) {
            errors[`${subjectPath}.${key}`] = 'Unknown subject field';
          }
        }

        if (typeof subject.name !== 'string' || !subject.name.trim()) {
          errors[`${subjectPath}.name`] = 'Subject name must be a non-empty string';
        } else if (subject.name.trim().length > 100) {
          errors[`${subjectPath}.name`] = 'Subject name cannot exceed 100 characters';
        }

        const topics = subject.topics === undefined ? [] : subject.topics;
        if (!Array.isArray(topics)) {
          errors[`${subjectPath}.topics`] = 'Topics must be an array';
          return { name: subject.name, topics };
        }

        const validatedTopics = topics.map((topic, topicIndex) => {
          const topicPath = `${subjectPath}.topics[${topicIndex}]`;
          if (!isPlainObject(topic)) {
            errors[topicPath] = 'Topic must be an object';
            return topic;
          }

          for (const key of Object.keys(topic)) {
            if (!['name', 'status'].includes(key)) {
              errors[`${topicPath}.${key}`] = 'Unknown topic field';
            }
          }

          if (typeof topic.name !== 'string' || !topic.name.trim()) {
            errors[`${topicPath}.name`] = 'Topic name must be a non-empty string';
          } else if (topic.name.trim().length > 150) {
            errors[`${topicPath}.name`] = 'Topic name cannot exceed 150 characters';
          }

          const status = topic.status === undefined ? 'pending' : topic.status;
          if (typeof status !== 'string' || !TOPIC_STATUSES.has(status)) {
            errors[`${topicPath}.status`] = 'Status must be pending, in-progress, or completed';
          }

          return { name: topic.name, status };
        });

        return { name: subject.name, topics: validatedTopics };
      });

      if (Object.keys(errors).some((key) => key.startsWith('subjects['))) {
        delete profile.subjects;
      }
    }
  }

  return { errors, profile };
};

const sendInputErrors = (res, errors) =>
  res.status(400).json({ success: false, message: 'Invalid profile data', errors });

const handleProfileError = (error, res, next) => {
  if (error?.code === 11000) {
    return res.status(409).json({ success: false, message: 'A profile already exists for this user' });
  }
  if (error?.name === 'ValidationError' || error?.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid profile data', error: error.message });
  }
  return next(error);
};

const requireStudent = (req, res) => {
  if (req.user.role !== 'student') {
    res.status(403).json({ success: false, message: 'Only student accounts can access student profiles' });
    return false;
  }
  return true;
};

export const getProfile = async (req, res, next) => {
  if (!requireStudent(req, res)) return;

  try {
    const [profile, account] = await Promise.all([
      StudentProfile.findOne({ user: req.user.id }),
      User.findById(req.user.id).select('name email'),
    ]);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Student account not found' });
    }
    return res.json({
      success: true,
      profile,
      user: { name: account.name, email: account.email },
    });
  } catch (error) {
    return next(error);
  }
};

export const createProfile = async (req, res, next) => {
  if (!requireStudent(req, res)) return;

  const { errors, profile } = validateProfileInput(req.body, { isCreate: true });
  if (Object.keys(errors).length > 0) return sendInputErrors(res, errors);

  try {
    const createdProfile = await StudentProfile.create({
      ...profile,
      user: req.user.id,
    });
    return res.status(201).json({ success: true, profile: createdProfile });
  } catch (error) {
    return handleProfileError(error, res, next);
  }
};

export const updateProfile = async (req, res, next) => {
  if (!requireStudent(req, res)) return;

  const { errors, profile: updates } = validateProfileInput(req.body);
  if (Object.keys(errors).length > 0) return sendInputErrors(res, errors);

  try {
    const profile = await StudentProfile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    Object.assign(profile, updates);
    await profile.save();
    return res.json({ success: true, profile });
  } catch (error) {
    return handleProfileError(error, res, next);
  }
};
