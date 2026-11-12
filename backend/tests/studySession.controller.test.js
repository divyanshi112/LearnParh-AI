import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createManualStudySession,
  getCurrentStudySession,
  startStudySession,
  updateStudySessionState,
} from '../controllers/studySession.controller.js';
import { StudySession, Subject } from '../models/index.js';

function createResponse() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('active-session lookup is constrained to the authenticated student', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const originalFindOne = StudySession.findOne;
  let filter;
  StudySession.findOne = async (query) => {
    filter = query;
    return null;
  };
  const response = createResponse();
  try {
    await getCurrentStudySession({ user: { id: userId, role: 'student' } }, response);
    assert.deepEqual(filter, { userId, activeSlot: userId });
    assert.equal(response.body.session, null);
  } finally {
    StudySession.findOne = originalFindOne;
  }
});

test('active sessions are not auto-paused when their heartbeat is stale', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const originalFindOne = StudySession.findOne;
  const originalFindOneAndUpdate = StudySession.findOneAndUpdate;
  const session = {
    _id: '507f1f77bcf86cd799439016',
    userId,
    status: 'running',
    durationSeconds: 30,
    segmentStartedAt: new Date(Date.now() - 120_000),
    heartbeatAt: new Date(Date.now() - 120_000),
    toObject() {
      return { ...this };
    },
  };
  StudySession.findOne = async () => session;
  StudySession.findOneAndUpdate = async () => {
    throw new Error('Reading the current session must not pause it.');
  };
  const response = createResponse();
  try {
    await getCurrentStudySession({ user: { id: userId, role: 'student' } }, response);
    assert.equal(response.body.session.status, 'running');
    assert.ok(response.body.session.elapsedSeconds >= 150);
    assert.equal(response.body.session.runningSince, session.segmentStartedAt.toISOString());
  } finally {
    StudySession.findOne = originalFindOne;
    StudySession.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('manual entries reject invalid durations before writing', async () => {
  const originalSubjectFindOne = Subject.findOne;
  let subjectLookupCalled = false;
  Subject.findOne = () => {
    subjectLookupCalled = true;
    throw new Error('Invalid manual duration reached subject lookup.');
  };
  const response = createResponse();
  try {
    await createManualStudySession({
      user: { id: '507f1f77bcf86cd799439011', role: 'student' },
      body: {
        subjectId: '507f1f77bcf86cd799439012',
        topicId: '507f1f77bcf86cd799439013',
        startTime: new Date(Date.now() - 60_000).toISOString(),
        durationMinutes: 0.5,
        entryKey: 'entry-test',
      },
    }, response);
    assert.equal(response.statusCode, 400);
    assert.match(response.body.message, /duration between 1 minute and 24 hours/i);
    assert.equal(subjectLookupCalled, false);
  } finally {
    Subject.findOne = originalSubjectFindOne;
  }
});

test('starting a session verifies subject and topic ownership', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const originalSessionFindOne = StudySession.findOne;
  const originalSubjectFindOne = Subject.findOne;
  let subjectFilter;
  StudySession.findOne = async () => null;
  Subject.findOne = (filter) => {
    subjectFilter = filter;
    return { select: async () => null };
  };
  const response = createResponse();
  try {
    await startStudySession({
      user: { id: userId, role: 'student' },
      body: {
        subjectId: '507f1f77bcf86cd799439012',
        topicId: '507f1f77bcf86cd799439013',
      },
    }, response);
    assert.equal(subjectFilter.student, userId);
    assert.equal(subjectFilter['topics._id'], '507f1f77bcf86cd799439013');
    assert.equal(response.statusCode, 400);
  } finally {
    StudySession.findOne = originalSessionFindOne;
    Subject.findOne = originalSubjectFindOne;
  }
});

test('starts sessions with the selected subject and topic IDs across multiple subjects', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const selections = [
    {
      subjectId: '507f1f77bcf86cd799439012',
      topicId: '507f1f77bcf86cd799439013',
      subjectName: 'algo',
      topicName: 'time complexity analysis',
    },
    {
      subjectId: '507f1f77bcf86cd799439014',
      topicId: '507f1f77bcf86cd799439015',
      subjectName: 'DBMS',
      topicName: 'transactions',
    },
  ];
  const originalSessionFindOne = StudySession.findOne;
  const originalSessionCreate = StudySession.create;
  const originalSubjectFindOne = Subject.findOne;
  let created;
  StudySession.findOne = async () => null;
  StudySession.create = async (input) => {
    created = input;
    return { ...input, _id: '507f1f77bcf86cd799439016', toObject() { return { ...this }; } };
  };
  Subject.findOne = (filter) => ({
    select: async () => {
      const selected = selections.find((item) => item.subjectId === String(filter._id));
      if (!selected || String(filter.student) !== userId
        || String(filter['topics._id']) !== selected.topicId) return null;
      const topics = [{ _id: selected.topicId, name: selected.topicName }];
      return {
        _id: selected.subjectId,
        name: selected.subjectName,
        topics: { id: (topicId) => topics.find((topic) => String(topic._id) === String(topicId)) },
      };
    },
  });

  try {
    for (const selection of selections) {
      const response = createResponse();
      await startStudySession({
        user: { id: userId, role: 'student' },
        body: { subjectId: selection.subjectId, topicId: selection.topicId },
      }, response);
      assert.equal(response.statusCode, 201);
      assert.equal(created.subject, selection.subjectId);
      assert.equal(created.topic, selection.topicId);
      assert.equal(created.subjectName, selection.subjectName);
      assert.equal(created.topicName, selection.topicName);
    }
  } finally {
    StudySession.findOne = originalSessionFindOne;
    StudySession.create = originalSessionCreate;
    Subject.findOne = originalSubjectFindOne;
  }
});

test('pause, resume, and finish save only the active segments', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const sessionId = '507f1f77bcf86cd799439016';
  const originalFindOne = StudySession.findOne;
  const originalFindOneAndUpdate = StudySession.findOneAndUpdate;
  const session = {
    _id: sessionId,
    userId,
    subject: '507f1f77bcf86cd799439012',
    topic: '507f1f77bcf86cd799439013',
    subjectName: 'Math',
    topicName: 'Algebra',
    startTime: new Date(Date.now() - 180_000),
    status: 'running',
    activeSlot: userId,
    durationSeconds: 40,
    durationMinutes: 0,
    segmentStartedAt: new Date(Date.now() - 75_000),
    heartbeatAt: new Date(Date.now() - 75_000),
    toObject() {
      const { toObject, ...plainSession } = this;
      return plainSession;
    },
  };
  StudySession.findOne = async () => session;
  StudySession.findOneAndUpdate = async (_filter, update) => {
    Object.assign(session, update.$set);
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) delete session[key];
    }
    return session;
  };

  const makeRequest = (action) => ({
    user: { id: userId, role: 'student' },
    params: { sessionId, action },
  });
  const originalSegmentStart = session.segmentStartedAt;
  const activeBeforePause = Math.floor((Date.now() - originalSegmentStart.getTime()) / 1000);
  const pauseResponse = createResponse();
  try {
    await updateStudySessionState(makeRequest('pause'), pauseResponse);
    const pausedSeconds = session.durationSeconds;
    assert.equal(session.status, 'paused');
    assert.ok(pausedSeconds >= 40 + activeBeforePause);
    assert.ok(pausedSeconds <= 41 + activeBeforePause);
    assert.equal(pauseResponse.body.session.elapsedSeconds, pausedSeconds);

    session.segmentStartedAt = new Date(Date.now() - 60_000);
    const resumeResponse = createResponse();
    await updateStudySessionState(makeRequest('resume'), resumeResponse);
    assert.equal(session.status, 'running');
    assert.equal(session.durationSeconds, pausedSeconds);
    assert.equal(resumeResponse.body.session.elapsedSeconds, pausedSeconds);

    session.segmentStartedAt = new Date(Date.now() - 65_000);
    const finalActiveSeconds = Math.floor((Date.now() - session.segmentStartedAt.getTime()) / 1000);
    const finishResponse = createResponse();
    await updateStudySessionState(makeRequest('finish'), finishResponse);
    const expectedSeconds = pausedSeconds + finalActiveSeconds;
    assert.equal(session.status, 'completed');
    assert.equal(session.durationSeconds, expectedSeconds);
    assert.equal(session.durationMinutes, Math.round((expectedSeconds / 60) * 100) / 100);
    assert.equal(finishResponse.body.session.elapsedSeconds, expectedSeconds);
    assert.equal(session.activeSlot, undefined);
  } finally {
    StudySession.findOne = originalFindOne;
    StudySession.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('study sessions have a unique active-slot constraint', () => {
  const uniqueActiveSlot = StudySession.schema.indexes().some(([fields, options]) => (
    fields.activeSlot === 1 && options.unique && options.sparse
  ));
  assert.equal(uniqueActiveSlot, true);
});
