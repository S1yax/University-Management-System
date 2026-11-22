// Unit tests for the accuracy rules (no database and no express needed):
//   node --test test/accuracy.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeAccuracy, WEAK_ACCURACY_THRESHOLD_M, SUSPICIOUS_ACCURACY_BELOW_M } from '../src/geo.js';

const RADIUS = 150;

test('U1 no accuracy sent is UNKNOWN', () => {
  assert.equal(judgeAccuracy(undefined, 5, RADIUS), 'UNKNOWN');
  assert.equal(judgeAccuracy(null, 5, RADIUS), 'UNKNOWN');
  assert.equal(judgeAccuracy(NaN, 5, RADIUS), 'UNKNOWN');
});

test('U2 0 m, under 1 m and negative accuracy are SUSPICIOUS', () => {
  assert.equal(judgeAccuracy(0, 5, RADIUS), 'SUSPICIOUS');
  assert.equal(judgeAccuracy(0.4, 5, RADIUS), 'SUSPICIOUS');
  assert.equal(judgeAccuracy(-3, 5, RADIUS), 'SUSPICIOUS');
});

test('U3 exactly 1 m is normal, not suspicious', () => {
  assert.equal(judgeAccuracy(SUSPICIOUS_ACCURACY_BELOW_M, 5, RADIUS), 'OK');
});

test('U4 good accuracy is OK', () => {
  assert.equal(judgeAccuracy(8, 5, RADIUS), 'OK');
});

test('U5 the threshold itself is OK, one meter above is WEAK_NEAR near the campus', () => {
  assert.equal(judgeAccuracy(WEAK_ACCURACY_THRESHOLD_M, 5, RADIUS), 'OK');
  assert.equal(judgeAccuracy(WEAK_ACCURACY_THRESHOLD_M + 1, 5, RADIUS), 'WEAK_NEAR');
});

test('U6 weak accuracy far away, with a circle that misses the campus, is OK (normal rejection)', () => {
  assert.equal(judgeAccuracy(500, 20000, RADIUS), 'OK');
});

test('U7 boundary: distance - accuracy = radius is WEAK_NEAR, one meter more is OK', () => {
  assert.equal(judgeAccuracy(200, 350, RADIUS), 'WEAK_NEAR');
  assert.equal(judgeAccuracy(200, 351, RADIUS), 'OK');
});
