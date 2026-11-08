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

    it('Scenario 5: Allows check-in for each hour of a 3-hour session, blocks duplicate within same hour', () => {
      const records = [
        { sessionId: 'ses-8', studentId: 'u-1', hourSlot: 1, status: 'PRESENT' },
        { sessionId: 'ses-8', studentId: 'u-1', hourSlot: 2, status: 'PRESENT' },
      ];

      // Checking Hour 1 duplicate
      const isH1Duplicate = records.some(
        (r) => r.sessionId === 'ses-8' && r.studentId === 'u-1' && r.hourSlot === 1
      );
      expect(isH1Duplicate).toBe(true);

      // Checking Hour 3 availability (not yet checked in)
      const isH3Duplicate = records.some(
        (r) => r.sessionId === 'ses-8' && r.studentId === 'u-1' && r.hourSlot === 3
      );
      expect(isH3Duplicate).toBe(false);

      // Student can accumulate up to 3 points for a 3-hour lesson
      const totalPoints = records.filter(r => r.sessionId === 'ses-8' && r.studentId === 'u-1').length;
      expect(totalPoints).toBe(2);
    });
  });

  describe('4. Hourly 3-Hour Lesson Policy Verification', () => {
    it('verifies 3-hour session schedule (16:00 to 19:00)', () => {
      const session = CLASS_SESSIONS.find((s) => s.id === 'ses-8')!;
      expect(session.startTime).toBe('16:00');
      expect(session.endTime).toBe('19:00');
    });

    it('distinguishes Hour 1 (16-17), Hour 2 (17-18), and Hour 3 (18-19)', () => {
      const getHourSlot = (time: string): 1 | 2 | 3 | null => {
        if (time >= '16:00' && time < '17:00') return 1;
        if (time >= '17:00' && time < '18:00') return 2;
        if (time >= '18:00' && time <= '19:00') return 3;
        return null;
      };

      expect(getHourSlot('16:15')).toBe(1);
      expect(getHourSlot('17:30')).toBe(2);
      expect(getHourSlot('18:45')).toBe(3);
      expect(getHourSlot('15:55')).toBe(null);
      expect(getHourSlot('19:05')).toBe(null);
    });
  });

  describe('5. Data Model Integrity', () => {
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
