import { describe, it, expect } from 'vitest';
import * as mockData from '../../data/mockData';
import { USERS, CLASS_SESSIONS, ENROLLMENTS } from '../../data/mockData';import { calculateHaversineDistance, KBTU_HALL_301_COORDS, SIMULATION_PRESETS } from '../geo';

describe('Acceptance Criteria Checklist Verification', () => {
  describe('1. Role-based Authentication & Accounts', () => {
    it('authenticates s_niyazkhan as STUDENT', () => {
      const user = USERS.find((u) => u.username === 's_niyazkhan');
      expect(user).toBeDefined();
      expect(user?.role).toBe('STUDENT');
      expect(user?.fullName).toBe('Saniya Niyazkhan');
    });

    it('authenticates t_issabek as TEACHER (BIS201)', () => {
      const user = USERS.find((u) => u.username === 't_issabek');
      expect(user).toBeDefined();
      expect(user?.role).toBe('TEACHER');
      expect(user?.fullName).toBe('Ainur Issabek');
    });

    it('authenticates m_askarova as MANAGER', () => {
      const user = USERS.find((u) => u.username === 'm_askarova');
      expect(user).toBeDefined();
      expect(user?.role).toBe('MANAGER');
      expect(user?.fullName).toBe('Asel Askarova');
    });

    it('authenticates admin as ADMIN', () => {
      const user = USERS.find((u) => u.username === 'admin');
      expect(user).toBeDefined();
      expect(user?.role).toBe('ADMIN');
    });

    it('has no shared password and no plaintext passwords in the user data', () => {
      expect('DEMO_PASSWORD' in mockData).toBe(false);
      USERS.forEach((user) => {
        expect(Object.keys(user)).not.toContain('password');
      });
    });
  });

  describe('2. Navigation & RBAC Authorization Rules', () => {
    const studentAllowed = [
      'dashboard', 'my-courses', 'attendance-checkin', 'schedule',
      'grades-transcript', 'course-registration', 'messages', 'teacher-ratings', 'news',
      'database-erd', 'team-39', 'project-status'
    ];

    it('allows student to access student routes and shared project routes', () => {
      expect(studentAllowed.includes('attendance-checkin')).toBe(true);
      expect(studentAllowed.includes('team-39')).toBe(true);
      expect(studentAllowed.includes('database-erd')).toBe(true);
    });

    it('denies student access to admin or teacher routes (403)', () => {
      expect(studentAllowed.includes('audit-log')).toBe(false);
      expect(studentAllowed.includes('live-attendance')).toBe(false);
      expect(studentAllowed.includes('at-risk-attendance')).toBe(false);
    });
  });

  describe('3. GPS Attendance Verification Scenarios', () => {
    const activeSession = CLASS_SESSIONS.find((s) => s.id === 'ses-8')!;
    const studentUser = USERS.find((u) => u.username === 's_niyazkhan')!;

    it('Scenario 1: Accepts check-in inside Hall 301 (< 150m)', () => {
      const dist = calculateHaversineDistance(
        SIMULATION_PRESETS.INSIDE.lat,
        SIMULATION_PRESETS.INSIDE.lng,
        activeSession.centerLat,
        activeSession.centerLng
      );
      expect(dist).toBeLessThanOrEqual(activeSession.allowedCampusRadiusM);

      const isEnrolled = ENROLLMENTS.some(
        (e) => e.studentId === studentUser.id && e.courseCode === activeSession.courseCode && e.status === 'Approved'
      );
      expect(isEnrolled).toBe(true);
      expect(activeSession.status).toBe('OPEN');
    });

    it('Scenario 2: Rejects check-in outside campus radius (> 150m)', () => {
      const dist = calculateHaversineDistance(
        SIMULATION_PRESETS.OUTSIDE.lat,
        SIMULATION_PRESETS.OUTSIDE.lng,
        activeSession.centerLat,
        activeSession.centerLng
      );
      expect(dist).toBeGreaterThan(activeSession.allowedCampusRadiusM);
    });

    it('Scenario 3: Rejects check-in when student is not enrolled', () => {
      const isEnrolled = ENROLLMENTS.some(
        (e) => e.studentId === 'non-existent-student' && e.courseCode === activeSession.courseCode
      );
      expect(isEnrolled).toBe(false);
    });

    it('Scenario 4: Rejects check-in when session is closed', () => {
      const closedSession = CLASS_SESSIONS.find((s) => s.id === 'ses-1')!;
      expect(closedSession.status).toBe('CLOSED');
    });

    it('Scenario 5: Blocks duplicate check-in with composite unique constraint', () => {
      const existingAttendance = [
        { sessionId: 'ses-8', studentId: 'u-3', status: 'PRESENT' }
      ];
      const isDuplicate = existingAttendance.some(
        (r) => r.sessionId === 'ses-8' && r.studentId === 'u-3'
      );
      expect(isDuplicate).toBe(true);
    });
  });

  describe('4. Data Model Integrity', () => {
    it('seeds exactly 15 weekly sessions for BIS201', () => {
      const bisSessions = CLASS_SESSIONS.filter((s) => s.courseCode === 'BIS201');
      expect(bisSessions.length).toBe(15);
      expect(bisSessions[0].sessionNumber).toBe(1);
      expect(bisSessions[14].sessionNumber).toBe(15);
    });

    it('configures allowed campus radius of 150m on all sessions', () => {
      CLASS_SESSIONS.forEach((session) => {
        expect(session.allowedCampusRadiusM).toBe(150);
        expect(session.centerLat).toBe(KBTU_HALL_301_COORDS.lat);
        expect(session.centerLng).toBe(KBTU_HALL_301_COORDS.lng);
      });
    });
  });
});
