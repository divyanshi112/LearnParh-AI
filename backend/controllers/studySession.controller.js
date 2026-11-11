import mongoose from 'mongoose';
import { StudySession, Subject } from '../models/index.js';

const STALE_HEARTBEAT_MS = 45_000;
const MAX_SESSION_SECONDS = 24 * 60 * 60;

function isStudent(req, res) {
  if (req.user.role === 'student') return true;
  res.status(403).json({ success: false, message: 'Only students can manage study sessions.' });
  return false;
}

function isValidId(value) {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
}

function sessionResponse(session, now = new Date()) {
  const result = session.toObject ? session.toObject() : { ...session };
  const elapsedSeconds = result.durationSeconds
    + (result.status === 'running' && result.segmentStartedAt
      ? Math.max(0, Math.floor((now.getTime() - new Date(result.segmentStartedAt).getTime()) / 1000))
      : 0);
  delete result.activeSlot;
  delete result.segmentStartedAt;
  delete result.heartbeatAt;
  delete result.entryKey;
  return { ...result, elapsedSeconds };
}

async function findOwnedSubjectTopic(subjectId, topicId, studentId) {
  if (!isValidId(subjectId) || !isValidId(topicId)) return null;
  const subject = await Subject.findOne({
    _id: subjectId,
    student: studentId,
    'topics._id': topicId,
  }).select('name topics');
  if (!subject) return null;
  const topic = subject.topics.id(topicId);
  if (!topic) return null;
  return { subject, topic };
}

async function pauseExpiredSession(session, now) {
  if (
    session.status !== 'running' ||
    !session.heartbeatAt ||
    now.getTime() - session.heartbeatAt.getTime() <= STALE_HEARTBEAT_MS
  ) return session;

  const lastActiveAt = Math.min(
    session.heartbeatAt.getTime(),
    now.getTime(),
    session.segmentStartedAt?.getTime() ?? now.getTime()
  );
  const segmentSeconds = session.segmentStartedAt
    ? Math.max(0, Math.floor((lastActiveAt - session.segmentStartedAt.getTime()) / 1000))
    : 0;
  const updated = await StudySession.findOneAndUpdate(
    { _id: session._id, userId: session.userId, status: 'running' },
    {
      $set: {
        status: 'paused',
        durationSeconds: Math.min(MAX_SESSION_SECONDS, session.durationSeconds + segmentSeconds),
        segmentStartedAt: null,
        heartbeatAt: null,
      },
    },
    { returnDocument: 'after' }
  );
  return updated || StudySession.findById(session._id);
}

async function getActiveSession(userId) {
  const session = await StudySession.findOne({ userId, activeSlot: userId });
  if (!session) return null;
  return pauseExpiredSession(session, new Date());
}

export async function getCurrentStudySession(req, res) {
  if (!isStudent(req, res)) return;
  const session = await getActiveSession(req.user.id);
  return res.json({
    success: true,
    session: session ? sessionResponse(session) : null,
  });
}

export async function startStudySession(req, res) {
  if (!isStudent(req, res)) return;
  const existing = await getActiveSession(req.user.id);
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'Finish or resume your current study session before starting another.',
      session: sessionResponse(existing),
    });
  }
  const selected = await findOwnedSubjectTopic(req.body.subjectId, req.body.topicId, req.user.id);
  if (!selected) {
    return res.status(400).json({ success: false, message: 'Choose a subject and topic from your study plan.' });
  }

  const now = new Date();
  try {
    const session = await StudySession.create({
      userId: req.user.id,
      subject: selected.subject._id,
      topic: selected.topic._id,
      subjectName: selected.subject.name,
      topicName: selected.topic.name,
      startTime: now,
      date: now,
      status: 'running',
      activeSlot: req.user.id,
      segmentStartedAt: now,
      heartbeatAt: now,
    });
    return res.status(201).json({ success: true, session: sessionResponse(session, now) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A study session is already active. Refresh your session and continue it.',
      });
    }
    throw error;
  }
}

export async function updateStudySessionState(req, res) {
  if (!isStudent(req, res)) return;
  const { sessionId } = req.params;
  if (!isValidId(sessionId)) {
    return res.status(400).json({ success: false, message: 'Invalid study session ID.' });
  }
  const { action } = req.params;
  if (!['pause', 'resume', 'finish', 'heartbeat'].includes(action)) {
    return res.status(404).json({ success: false, message: 'Study session action not found.' });
  }

  let session = await StudySession.findOne({
    _id: sessionId,
    userId: req.user.id,
    activeSlot: req.user.id,
  });
  if (!session) {
    const completed = action === 'finish'
      ? await StudySession.findOne({ _id: sessionId, userId: req.user.id, status: 'completed' })
      : null;
    if (completed) return res.json({ success: true, session: sessionResponse(completed) });
    return res.status(404).json({ success: false, message: 'Active study session not found.' });
  }

  const now = new Date();
  session = await pauseExpiredSession(session, now);
  if (action === 'heartbeat') {
    if (session.status !== 'running') {
      return res.json({ success: true, session: sessionResponse(session, now) });
    }
    const updated = await StudySession.findOneAndUpdate(
      { _id: sessionId, userId: req.user.id, status: 'running' },
      { $set: { heartbeatAt: now } },
      { returnDocument: 'after' }
    );
    return res.json({ success: true, session: sessionResponse(updated || session, now) });
  }

  if (action === 'pause') {
    if (session.status === 'paused') {
      return res.json({ success: true, session: sessionResponse(session, now) });
    }
    const activeSeconds = Math.max(
      0,
      Math.floor((now.getTime() - session.segmentStartedAt.getTime()) / 1000)
    );
    const updated = await StudySession.findOneAndUpdate(
      { _id: sessionId, userId: req.user.id, status: 'running' },
      {
        $set: {
          status: 'paused',
          durationSeconds: Math.min(MAX_SESSION_SECONDS, session.durationSeconds + activeSeconds),
          segmentStartedAt: null,
          heartbeatAt: null,
        },
      },
      { returnDocument: 'after' }
    );
    if (updated) return res.json({ success: true, session: sessionResponse(updated, now) });
    const latest = await getActiveSession(req.user.id);
    if (latest?.status === 'paused') {
      return res.json({ success: true, session: sessionResponse(latest, now) });
    }
    return res.status(409).json({ success: false, message: 'This study session changed before it could be paused.' });
  }

  if (action === 'resume') {
    if (session.status === 'running') {
      return res.json({ success: true, session: sessionResponse(session, now) });
    }
    const updated = await StudySession.findOneAndUpdate(
      { _id: sessionId, userId: req.user.id, status: 'paused' },
      { $set: { status: 'running', segmentStartedAt: now, heartbeatAt: now } },
      { returnDocument: 'after' }
    );
    if (updated) return res.json({ success: true, session: sessionResponse(updated, now) });
    const latest = await getActiveSession(req.user.id);
    if (latest?.status === 'running') {
      return res.json({ success: true, session: sessionResponse(latest, now) });
    }
    return res.status(409).json({ success: false, message: 'This study session changed before it could resume.' });
  }

  let durationSeconds = session.durationSeconds;
  if (session.status === 'running') {
    durationSeconds += Math.max(
      0,
      Math.floor((now.getTime() - session.segmentStartedAt.getTime()) / 1000)
    );
  }
  if (durationSeconds < 60 || durationSeconds > MAX_SESSION_SECONDS) {
    return res.status(400).json({
      success: false,
      message: durationSeconds < 60
        ? 'Study sessions must last at least one active minute before they can be saved.'
        : 'A study session cannot exceed 24 active hours. Pause and finish the session, or add a valid manual entry.',
    });
  }

  const updated = await StudySession.findOneAndUpdate(
    { _id: sessionId, userId: req.user.id, status: session.status },
    {
      $set: {
        status: 'completed',
        endTime: now,
        durationSeconds,
        durationMinutes: Math.round((durationSeconds / 60) * 100) / 100,
        segmentStartedAt: null,
        heartbeatAt: null,
      },
      $unset: { activeSlot: '' },
    },
    { returnDocument: 'after', runValidators: true }
  );
  if (updated) return res.json({ success: true, session: sessionResponse(updated, now) });
  const completed = await StudySession.findOne({ _id: sessionId, userId: req.user.id, status: 'completed' });
  if (completed) return res.json({ success: true, session: sessionResponse(completed, now) });
  return res.status(409).json({ success: false, message: 'This study session changed before it could finish.' });
}

export async function createManualStudySession(req, res) {
  if (!isStudent(req, res)) return;
  const { subjectId, topicId, startTime, durationMinutes, entryKey } = req.body;
  const duration = Number(durationMinutes);
  const start = new Date(startTime);
  const now = new Date();
  if (
    !isValidId(subjectId) ||
    !isValidId(topicId) ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(duration) ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 1440 ||
    start.getTime() + duration * 60_000 > now.getTime() ||
    typeof entryKey !== 'string' ||
    !entryKey.trim() ||
    entryKey.length > 100
  ) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid subject, topic, past start time, and duration between 1 minute and 24 hours.',
    });
  }
  const selected = await findOwnedSubjectTopic(subjectId, topicId, req.user.id);
  if (!selected) {
    return res.status(400).json({ success: false, message: 'Choose a subject and topic from your study plan.' });
  }

  const existing = await StudySession.findOne({ userId: req.user.id, entryKey });
  if (existing) return res.json({ success: true, session: sessionResponse(existing), duplicate: true });

  const active = await getActiveSession(req.user.id);
  if (active) {
    return res.status(409).json({
      success: false,
      message: 'Finish or pause your active study session before adding a manual entry.',
    });
  }

  const endTime = new Date(start.getTime() + duration * 60_000);
  const overlappingSession = await StudySession.findOne({
    userId: req.user.id,
    status: 'completed',
    startTime: { $lt: endTime },
    endTime: { $gt: start },
  }).select('_id');
  if (overlappingSession) {
    return res.status(409).json({
      success: false,
      message: 'This manual entry overlaps another saved study session. Check the date, start time, and duration.',
    });
  }

  try {
    const session = await StudySession.create({
      userId: req.user.id,
      subject: selected.subject._id,
      topic: selected.topic._id,
      subjectName: selected.subject.name,
      topicName: selected.topic.name,
      startTime: start,
      endTime,
      durationMinutes: duration,
      durationSeconds: Math.round(duration * 60),
      date: start,
      status: 'completed',
      entryKey,
    });
    return res.status(201).json({ success: true, session: sessionResponse(session), duplicate: false });
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = await StudySession.findOne({ userId: req.user.id, entryKey });
      if (duplicate) {
        return res.json({ success: true, session: sessionResponse(duplicate), duplicate: true });
      }
    }
    throw error;
  }
}
