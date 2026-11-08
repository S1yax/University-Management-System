import { describe, it, expect } from 'vitest';
import { CLASS_SESSIONS } from '../../data/mockData';
import { calculateHaversineDistance } from '../geo';

/**
 * Simulation of 300 students checking in during 3 minutes (virtual time, no waiting).
 *
 * NOTE: this is NOT a server load test. checkInGPS lives inside the React context,
 * so the decision rules are repeated here in decideCheckIn(). It shows that the rules
 * and the Haversine formula stay correct and fast at 300 check-ins. The real check of
 * duplicates and speed on the database is database/05_load_300.sql.
 */

type Result = 'SUCCESS_PRESENT' | 'REJECTED_RADIUS' | 'REJECTED_NOT_ENROLLED' | 'REJECTED_CLOSED' | 'ALREADY_CHECKED_IN';

interface Attempt {
  studentId: string;
  lat: number;
  lng: number;
  atSecond: number;
}

const STUDENTS = 300;
const WINDOW_SECONDS = 180;

const session = CLASS_SESSIONS.find((s) => s.id === 'ses-8')!;

function decideCheckIn(
  attempt: Attempt,
  enrolled: Set<string>,
  checkedIn: Set<string>,
  sessionStatus: 'OPEN' | 'CLOSED' = session.status
): Result {
  if (sessionStatus !== 'OPEN') return 'REJECTED_CLOSED';
  if (!enrolled.has(attempt.studentId)) return 'REJECTED_NOT_ENROLLED';
  if (checkedIn.has(attempt.studentId)) return 'ALREADY_CHECKED_IN';
  const distance = calculateHaversineDistance(attempt.lat, attempt.lng, session.centerLat, session.centerLng);
  if (distance <= session.allowedCampusRadiusM) {
    checkedIn.add(attempt.studentId);
    return 'SUCCESS_PRESENT';
  }
  checkedIn.add(attempt.studentId);
  return 'REJECTED_RADIUS';
}

// Every 10th student is about 1.1 km away, the others stand a few meters from the center.
function buildAttempts(): Attempt[] {
  return Array.from({ length: STUDENTS }, (_, k) => {
    const i = k + 1;
    return {
      studentId: `LT${String(i).padStart(4, '0')}`,
      lat: session.centerLat + (i % 10 === 0 ? 0.01 : (i % 7) * 0.0001),
      lng: session.centerLng + (i % 5) * 0.0001,
      atSecond: (i * WINDOW_SECONDS) / STUDENTS,
    };
  });
}

describe('Simulation: 300 students check in within 3 minutes', () => {
  const attempts = buildAttempts();
  const enrolled = new Set(attempts.map((a) => a.studentId));

  it('spreads all arrivals inside the 3-minute window', () => {
    expect(attempts).toHaveLength(STUDENTS);
    expect(Math.max(...attempts.map((a) => a.atSecond))).toBeLessThanOrEqual(WINDOW_SECONDS);
  });

  it('accepts 270 students inside the radius and rejects 30 outside', () => {
    const checkedIn = new Set<string>();
    const results = attempts.map((a) => decideCheckIn(a, enrolled, checkedIn));

    expect(results.filter((r) => r === 'SUCCESS_PRESENT')).toHaveLength(270);
    expect(results.filter((r) => r === 'REJECTED_RADIUS')).toHaveLength(30);
    expect(checkedIn.size).toBe(STUDENTS);
  });

  it('blocks all 300 repeated check-ins', () => {
    const checkedIn = new Set<string>();
    attempts.forEach((a) => decideCheckIn(a, enrolled, checkedIn));
    const second = attempts.map((a) => decideCheckIn(a, enrolled, checkedIn));

    expect(second.every((r) => r === 'ALREADY_CHECKED_IN')).toBe(true);
    expect(checkedIn.size).toBe(STUDENTS);
  });

  it('rejects students who are not enrolled', () => {
    const outsider: Attempt = { studentId: 'NOT-ENROLLED', lat: session.centerLat, lng: session.centerLng, atSecond: 1 };
    expect(decideCheckIn(outsider, enrolled, new Set())).toBe('REJECTED_NOT_ENROLLED');
  });

  it('rejects everyone when the session is closed', () => {
    const results = attempts.map((a) => decideCheckIn(a, enrolled, new Set(), 'CLOSED'));
    expect(results.every((r) => r === 'REJECTED_CLOSED')).toBe(true);
  });

  it('processes 300 check-ins in under one second', () => {
    const checkedIn = new Set<string>();
    const start = performance.now();
    attempts.forEach((a) => decideCheckIn(a, enrolled, checkedIn));
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
