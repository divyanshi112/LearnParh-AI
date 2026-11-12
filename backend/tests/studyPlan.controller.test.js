import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addCalendarDays,
  dateKeyInTimeZone,
  getDashboardSummary,
  localMidnightAsUtc,
} from '../controllers/studyPlan.controller.js';
import { QuizResult, StudentProfile, StudySession, StudyTarget, Subject, User } from '../models/index.js';

const queryFor = (value) => ({
  select() { return this; },
  sort() { return this; },
  populate() { return this; },
  lean() { return Promise.resolve(value); },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
});

test('builds current-week calendar dates across month boundaries', () => {
  assert.equal(addCalendarDays('2026-11-01', 1), '2026-11-02');
  assert.equal(addCalendarDays('2026-11-01', -1), '2026-10-31');
});

test('calculates local midnight and DST week boundaries in the requested timezone', () => {
  const start = localMidnightAsUtc('2026-03-08', 'America/Los_Angeles');
  const next = localMidnightAsUtc('2026-03-09', 'America/Los_Angeles');

  assert.equal(dateKeyInTimeZone(start, 'America/Los_Angeles'), '2026-03-08');
  assert.equal(dateKeyInTimeZone(next, 'America/Los_Angeles'), '2026-03-09');
  assert.equal((next.getTime() - start.getTime()) / 3_600_000, 23);
});

test('resolves a UTC offset with a non-whole-hour timezone', () => {
  const midnight = localMidnightAsUtc('2026-11-11', 'Asia/Kolkata');
  assert.equal(midnight.toISOString(), '2026-11-10T18:30:00.000Z');
  assert.equal(dateKeyInTimeZone(midnight, 'Asia/Kolkata'), '2026-11-11');
});

test('builds weekly activity for the authenticated student by local calendar day', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const timeZone = 'Asia/Kolkata';
  const todayKey = dateKeyInTimeZone(new Date(), timeZone);
  const weekday = new Date(`${todayKey}T00:00:00.000Z`).getUTCDay();
  const weekStartKey = addCalendarDays(todayKey, -((weekday + 6) % 7));
  const originals = {
    userFindById: User.findById,
    profileFindOne: StudentProfile.findOne,
    subjectFind: Subject.find,
    targetFind: StudyTarget.find,
    sessionAggregate: StudySession.aggregate,
    quizAggregate: QuizResult.aggregate,
  };
  let sessionPipeline;

  User.findById = () => queryFor({ name: 'Student', email: 'student@example.test' });
  StudentProfile.findOne = () => queryFor({ dailyStudyTarget: 2 });
  Subject.find = () => queryFor([]);
  StudyTarget.find = () => queryFor([]);
  StudySession.aggregate = async (pipeline) => {
    sessionPipeline = pipeline;
    return [
      { _id: weekStartKey, durationSeconds: 12_600, sessions: 2 },
      { _id: addCalendarDays(weekStartKey, 1), durationSeconds: 900, sessions: 1 },
    ];
  };
  QuizResult.aggregate = async (pipeline) => (
    pipeline[0].$match.completedAt
      ? []
      : [{ _id: null, attempts: 0, correctAnswers: 0, totalQuestions: 0 }]
  );

  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  try {
    await getDashboardSummary({
      user: { id: userId, role: 'student' },
      query: { timeZone },
    }, response);

    const activity = response.body.data.weeklyActivity;
    assert.equal(activity.length, 7);
    assert.deepEqual(
      activity.map((entry) => entry.date),
      Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStartKey, index))
    );
    assert.equal(activity[0].day, 'Mon');
    assert.equal(activity[0].hours, 3.5);
    assert.equal(activity[0].sessions, 2);
    assert.equal(activity[0].target, 2);
    assert.equal(activity[1].hours, 0.25);
    assert.equal(String(sessionPipeline[0].$match.userId), userId);
    assert.deepEqual(sessionPipeline[0].$match.status, {
      $in: ['completed', 'paused', 'running'],
    });
    assert.equal(
      sessionPipeline[0].$match.startTime.$gte.getTime(),
      localMidnightAsUtc(weekStartKey, timeZone).getTime()
    );
    assert.equal(sessionPipeline[1].$group._id.$dateToString.timezone, timeZone);
  } finally {
    User.findById = originals.userFindById;
    StudentProfile.findOne = originals.profileFindOne;
    Subject.find = originals.subjectFind;
    StudyTarget.find = originals.targetFind;
    StudySession.aggregate = originals.sessionAggregate;
    QuizResult.aggregate = originals.quizAggregate;
  }
});
