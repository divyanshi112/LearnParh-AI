import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addCalendarDays,
  dateKeyInTimeZone,
  localMidnightAsUtc,
} from '../controllers/studyPlan.controller.js';

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
