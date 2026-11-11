import assert from 'node:assert/strict';
import test from 'node:test';
import { createManualStudySession, getCurrentStudySession, startStudySession } from '../controllers/studySession.controller.js';
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

test('study sessions have a unique active-slot constraint', () => {
  const uniqueActiveSlot = StudySession.schema.indexes().some(([fields, options]) => (
    fields.activeSlot === 1 && options.unique && options.sparse
  ));
  assert.equal(uniqueActiveSlot, true);
});
