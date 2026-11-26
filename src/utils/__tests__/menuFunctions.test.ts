import { describe, it, expect } from 'vitest';
import {
  studentGpsCheckIn,
  calculateStudentGpa,
  validateScheduleConflict,
  processCourseRegistration,
  calculateAttestationStatus,
  submitStudentRequest,
  evaluateEntryDiagnosticTest,
  generateSessionMultiHourRoster,
  teacherManualAttendanceOverride,
  setSessionGeofenceAndStatus,
  evaluateAtRiskAttendance,
  dispatchEarlyWarningNotice,
  calculateGradebookCourseTotal,
  generateAttendanceCsvReport,
  ScheduleSlot,
  CourseGrade,
} from '../menuFunctions';
import { KBTU_HALL_301_COORDS } from '../geo';

describe('KBTU UMS Menu Functions: 10 Tests for Each of the 7 Student & 7 Teacher Functions (140 Tests Total)', () => {

  // ==========================================================================
  // PART A: STUDENT MENU FUNCTIONS (7 Functions x 10 Tests = 70 Tests)
  // ==========================================================================

  describe('STUDENT MENU FUNCTION 1: GPS Attendance Check-in (studentGpsCheckIn)', () => {
    const baseSession = {
      id: 'ses-8',
      courseCode: 'BIS201',
      isOpen: true,
      allowedRadiusM: 150,
      centerLat: KBTU_HALL_301_COORDS.lat,
      centerLng: KBTU_HALL_301_COORDS.lng,
    };
    const enrollments = [{ studentId: 's_niyazkhan', courseCode: 'BIS201' }];

    it('1.1: Accepts check-in inside Hall 301 (~3.5m from centroid) for Hour Slot 1', () => {
      const res = studentGpsCheckIn({
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        coords: { lat: 43.255345, lng: 76.943110 },
        hourSlot: 1,
        session: baseSession,
        enrollments,
        existingRecords: [],
      });
      expect(res.success).toBe(true);
      expect(res.status).toBe('PRESENT');
      expect(res.distanceM).toBeLessThanOrEqual(150);
    });

    it('1.2: Accepts check-in inside Hall 301 for Hour Slot 2', () => {
      const res = studentGpsCheckIn({
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        coords: { lat: 43.255345, lng: 76.943110 },
        hourSlot: 2,
        session: baseSession,
        enrollments,
        existingRecords: [{ sessionId: 'ses-8', studentId: 's_niyazkhan', hourSlot: 1, status: 'PRESENT' }],
      });
      expect(res.success).toBe(true);
      expect(res.status).toBe('PRESENT');
      expect(res.hourSlot).toBe(2);
    });

    it('1.3: Accepts check-in inside Hall 301 for Hour Slot 3', () => {
      const res = studentGpsCheckIn({
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        coords: { lat: 43.255345, lng: 76.943110 },
        hourSlot: 3,
        session: baseSession,
        enrollments,
        existingRecords: [
          { sessionId: 'ses-8', studentId: 's_niyazkhan', hourSlot: 1, status: 'PRESENT' },
          { sessionId: 'ses-8', studentId: 's_niyazkhan', hourSlot: 2, status: 'PRESENT' },
        ],
      });
      expect(res.success).toBe(true);
      expect(res.status).toBe('PRESENT');
      expect(res.hourSlot).toBe(3);
    });

    it('1.4: Rejects check-in when student is outside campus radius (> 150m, e.g. 1.2km away)', () => {
      const res = studentGpsCheckIn({
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        coords: { lat: 43.264200, lng: 76.953500 },
        hourSlot: 1,
        session: baseSession,
        enrollments,
        existingRecords: [],
      });
      expect(res.success).toBe(false);
      expect(res.status).toBe('REJECTED');
      expect(res.distanceM).toBeGreaterThan(150);
    });

    it('1.5: Rejects check-in immediately past the 150m boundary (151m)', () => {
      // Offset latitude slightly north (~151 meters)
      const res = studentGpsCheckIn({
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        coords: { lat: KBTU_HALL_301_COORDS.lat + 0.00137, lng: KBTU_HALL_301_COORDS.lng },
        hourSlot: 1,
        session: baseSession,
        enrollments,
        existingRecords: [],
      });
      expect(res.success).toBe(false);
      expect(res.status).toBe('REJECTED');
      expect(res.distanceM).toBeGreaterThan(150);
    });

    it('1.6: Accepts check-in near the inside boundary (e.g. 120m near KBTU South Entrance)', () => {
      const res = studentGpsCheckIn({
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        coords: { lat: KBTU_HALL_301_COORDS.lat + 0.0009, lng: KBTU_HALL_301_COORDS.lng },
        hourSlot: 1,
        session: baseSession,
        enrollments,
        existingRecords: [],
      });
      expect(res.success).toBe(true);
      expect(res.status).toBe('PRESENT');
      expect(res.distanceM).toBeLessThanOrEqual(150);
    });

    it('1.7: Rejects duplicate check-in within the same hour slot (Hour 1 already marked)', () => {
      const res = studentGpsCheckIn({
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        coords: { lat: 43.255345, lng: 76.943110 },
        hourSlot: 1,
        session: baseSession,
        enrollments,
        existingRecords: [{ sessionId: 'ses-8', studentId: 's_niyazkhan', hourSlot: 1, status: 'PRESENT' }],
      });
      expect(res.success).toBe(false);
      expect(res.status).toBe('ALREADY_CHECKED_IN');
    });

    it('1.8: Allows check-in for Hour 2 even if Hour 1 is already checked in', () => {
      const res = studentGpsCheckIn({
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        coords: { lat: 43.255345, lng: 76.943110 },
        hourSlot: 2,
        session: baseSession,
        enrollments,
        existingRecords: [{ sessionId: 'ses-8', studentId: 's_niyazkhan', hourSlot: 1, status: 'PRESENT' }],
      });
      expect(res.success).toBe(true);
      expect(res.status).toBe('PRESENT');
      expect(res.hourSlot).toBe(2);
    });

    it('1.9: Rejects check-in when student is not enrolled in the course', () => {
      const res = studentGpsCheckIn({
        studentId: 's_random_student',
        sessionId: 'ses-8',
        coords: { lat: 43.255345, lng: 76.943110 },
        hourSlot: 1,
        session: baseSession,
        enrollments,
        existingRecords: [],
      });
      expect(res.success).toBe(false);
      expect(res.status).toBe('REJECTED');
      expect(res.reason).toContain('not enrolled');
    });

    it('1.10: Routes to MANUAL_REVIEW when indoor GPS drift flag is active', () => {
      const res = studentGpsCheckIn({
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        coords: { lat: 43.258200, lng: 76.946800 },
        isDrift: true,
        hourSlot: 1,
        session: baseSession,
        enrollments,
        existingRecords: [],
      });
      expect(res.success).toBe(true);
      expect(res.status).toBe('MANUAL_REVIEW');
      expect(res.reason).toContain('manual review');
    });
  });

  describe('STUDENT MENU FUNCTION 2: Academic Transcript & GPA Calculation (calculateStudentGpa)', () => {
    it('2.1: Calculates perfect 4.00 GPA for all 95+ scores', () => {
      const grades: CourseGrade[] = [
        { courseCode: 'BIS201', credits: 5, score: 96 },
        { courseCode: 'CS101', credits: 6, score: 98 },
        { courseCode: 'MATH101', credits: 5, score: 95 },
      ];
      const res = calculateStudentGpa(grades);
      expect(res.gpa).toBe(4.0);
      expect(res.standing).toBe('Honors');
    });

    it('2.2: Calculates 3.85 GPA for mixed A and A- grades', () => {
      const grades: CourseGrade[] = [
        { courseCode: 'BIS201', credits: 5, score: 92 }, // 3.67 * 5 = 18.35
        { courseCode: 'DB202', credits: 5, score: 96 },  // 4.0 * 5 = 20.0
        { courseCode: 'CS101', credits: 6, score: 94 },  // 3.67 * 6 = 22.02
        { courseCode: 'NET203', credits: 5, score: 97 }, // 4.0 * 5 = 20.0
      ];
      const res = calculateStudentGpa(grades);
      expect(res.gpa).toBeCloseTo(3.83, 1);
      expect(res.standing).toBe('Honors');
    });

    it('2.3: Assigns "Honors" standing when GPA >= 3.67', () => {
      const grades: CourseGrade[] = [
        { courseCode: 'BIS201', credits: 5, score: 91 }, // 3.67
        { courseCode: 'DB202', credits: 5, score: 92 },  // 3.67
      ];
      const res = calculateStudentGpa(grades);
      expect(res.gpa).toBe(3.67);
      expect(res.standing).toBe('Honors');
    });

    it('2.4: Calculates B+ average (~3.33) with "Good Standing"', () => {
      const grades: CourseGrade[] = [
        { courseCode: 'MATH101', credits: 5, score: 86 }, // 3.33
        { courseCode: 'NET203', credits: 5, score: 87 },  // 3.33
      ];
      const res = calculateStudentGpa(grades);
      expect(res.gpa).toBe(3.33);
      expect(res.standing).toBe('Good Standing');
    });

    it('2.5: Calculates C average (2.00) on threshold of Good Standing', () => {
      const grades: CourseGrade[] = [
        { courseCode: 'CS101', credits: 5, score: 68 }, // 2.0
        { courseCode: 'DB202', credits: 5, score: 66 }, // 2.0
      ];
      const res = calculateStudentGpa(grades);
      expect(res.gpa).toBe(2.0);
      expect(res.standing).toBe('Good Standing');
    });

    it('2.6: Assigns "Academic Probation" when GPA < 2.00', () => {
      const grades: CourseGrade[] = [
        { courseCode: 'CS101', credits: 5, score: 58 }, // 1.33
        { courseCode: 'MATH101', credits: 5, score: 62 }, // 1.67
      ];
      const res = calculateStudentGpa(grades);
      expect(res.gpa).toBeLessThan(2.0);
      expect(res.standing).toBe('Academic Probation');
    });

    it('2.7: Correctly weights by ECTS course credits', () => {
      const grades: CourseGrade[] = [
        { courseCode: 'HEAVY_COURSE', credits: 10, score: 95 }, // 4.0 * 10 = 40
        { courseCode: 'LIGHT_COURSE', credits: 2, score: 70 },  // 2.33 * 2 = 4.66
      ];
      const res = calculateStudentGpa(grades);
      expect(res.gpa).toBeCloseTo(3.72, 2);
    });

    it('2.8: Evaluates failed course (score < 50) as 0.0 points in GPA', () => {
      const grades: CourseGrade[] = [
        { courseCode: 'PASSED', credits: 5, score: 95 }, // 4.0 * 5 = 20
        { courseCode: 'FAILED', credits: 5, score: 42 }, // 0.0 * 5 = 0
      ];
      const res = calculateStudentGpa(grades);
      expect(res.gpa).toBe(2.0);
      expect(res.breakdown.find((b) => b.courseCode === 'FAILED')?.letter).toBe('F');
    });

    it('2.9: Handles empty grade record gracefully', () => {
      const res = calculateStudentGpa([]);
      expect(res.gpa).toBe(0);
      expect(res.totalCredits).toBe(0);
      expect(res.standing).toBe('Academic Probation');
    });

    it('2.10: Accurately produces complete per-course letter and credit breakdown', () => {
      const grades: CourseGrade[] = [
        { courseCode: 'BIS201', credits: 5, score: 96 },
        { courseCode: 'DB202', credits: 5, score: 82 },
      ];
      const res = calculateStudentGpa(grades);
      expect(res.breakdown.length).toBe(2);
      expect(res.breakdown[0].letter).toBe('A');
      expect(res.breakdown[1].letter).toBe('B');
    });
  });

  describe('STUDENT MENU FUNCTION 3: Schedule Slot Conflict Detector (validateScheduleConflict)', () => {
    const existingSlots: ScheduleSlot[] = [
      { courseCode: 'BIS201', day: 'Monday', startMinutes: 960, endMinutes: 1140, room: 'Hall 301' }, // 16:00 - 19:00
      { courseCode: 'DB202', day: 'Tuesday', startMinutes: 840, endMinutes: 1020, room: 'Lab 204' },   // 14:00 - 17:00
    ];

    it('3.1: Approves slot on a completely different day', () => {
      const candidate: ScheduleSlot = { courseCode: 'CS101', day: 'Wednesday', startMinutes: 960, endMinutes: 1140, room: 'Aud 442' };
      const res = validateScheduleConflict(existingSlots, candidate);
      expect(res.hasConflict).toBe(false);
    });

    it('3.2: Approves slot on same day with no time overlap (10:00 - 13:00 vs 16:00 - 19:00)', () => {
      const candidate: ScheduleSlot = { courseCode: 'MATH101', day: 'Monday', startMinutes: 600, endMinutes: 780, room: 'Hall 301' };
      const res = validateScheduleConflict(existingSlots, candidate);
      expect(res.hasConflict).toBe(false);
    });

    it('3.3: Detects exact same time collision on same day (16:00 - 19:00 on Monday)', () => {
      const candidate: ScheduleSlot = { courseCode: 'CONFLICT', day: 'Monday', startMinutes: 960, endMinutes: 1140, room: 'Hall 302' };
      const res = validateScheduleConflict(existingSlots, candidate);
      expect(res.hasConflict).toBe(true);
      expect(res.conflictingCourse).toBe('BIS201');
    });

    it('3.4: Detects candidate starting during existing class (17:00 - 20:00 vs 16:00 - 19:00)', () => {
      const candidate: ScheduleSlot = { courseCode: 'LATE_START', day: 'Monday', startMinutes: 1020, endMinutes: 1200, room: 'Aud 118' };
      const res = validateScheduleConflict(existingSlots, candidate);
      expect(res.hasConflict).toBe(true);
      expect(res.conflictingCourse).toBe('BIS201');
    });

    it('3.5: Detects candidate ending during existing class (15:00 - 17:00 vs 16:00 - 19:00)', () => {
      const candidate: ScheduleSlot = { courseCode: 'EARLY_END', day: 'Monday', startMinutes: 900, endMinutes: 1020, room: 'Aud 118' };
      const res = validateScheduleConflict(existingSlots, candidate);
      expect(res.hasConflict).toBe(true);
      expect(res.conflictingCourse).toBe('BIS201');
    });

    it('3.6: Detects candidate completely enclosing existing class (15:00 - 20:00 vs 16:00 - 19:00)', () => {
      const candidate: ScheduleSlot = { courseCode: 'ENCLOSING', day: 'Monday', startMinutes: 900, endMinutes: 1200, room: 'Aud 118' };
      const res = validateScheduleConflict(existingSlots, candidate);
      expect(res.hasConflict).toBe(true);
      expect(res.conflictingCourse).toBe('BIS201');
    });

    it('3.7: Detects existing class completely enclosing candidate (17:00 - 18:00 inside 16:00 - 19:00)', () => {
      const candidate: ScheduleSlot = { courseCode: 'ENCLOSED', day: 'Monday', startMinutes: 1020, endMinutes: 1080, room: 'Aud 118' };
      const res = validateScheduleConflict(existingSlots, candidate);
      expect(res.hasConflict).toBe(true);
    });

    it('3.8: Approves back-to-back classes with zero gap (13:00 - 16:00 and 16:00 - 19:00)', () => {
      const candidate: ScheduleSlot = { courseCode: 'BACK_TO_BACK', day: 'Monday', startMinutes: 780, endMinutes: 960, room: 'Aud 118' };
      const res = validateScheduleConflict(existingSlots, candidate);
      expect(res.hasConflict).toBe(false);
    });

    it('3.9: Rejects malformed candidate slot where start time >= end time', () => {
      const candidate: ScheduleSlot = { courseCode: 'INVALID', day: 'Monday', startMinutes: 1000, endMinutes: 900, room: 'Aud 118' };
      const res = validateScheduleConflict(existingSlots, candidate);
      expect(res.hasConflict).toBe(true);
      expect(res.reason).toContain('start time must precede end time');
    });

    it('3.10: Identifies exact room in conflict description', () => {
      const candidate: ScheduleSlot = { courseCode: 'TEST', day: 'Tuesday', startMinutes: 900, endMinutes: 960, room: 'Lab 204' };
      const res = validateScheduleConflict(existingSlots, candidate);
      expect(res.hasConflict).toBe(true);
      expect(res.reason).toContain('Lab 204');
    });
  });

  describe('STUDENT MENU FUNCTION 4: Course Registration Portal (processCourseRegistration)', () => {
    it('4.1: Successfully registers valid course within standard 21 ECTS limit', () => {
      const res = processCourseRegistration({
        studentId: '21B030482',
        courseToRegister: { code: 'BIS201', credits: 5, prerequisites: [], capacity: 30, enrolledCount: 20 },
        currentlyRegisteredCourses: [{ code: 'CS101', credits: 6 }, { code: 'MATH101', credits: 5 }],
        passedCourses: [],
        maxEctsLimit: 21,
      });
      expect(res.allowed).toBe(true);
      expect(res.newTotalEcts).toBe(16);
    });

    it('4.2: Blocks registration when semester credit limit is exceeded (> 21 ECTS)', () => {
      const res = processCourseRegistration({
        studentId: '21B030482',
        courseToRegister: { code: 'OVERLOAD_COURSE', credits: 6, prerequisites: [], capacity: 30, enrolledCount: 10 },
        currentlyRegisteredCourses: [{ code: 'C1', credits: 6 }, { code: 'C2', credits: 6 }, { code: 'C3', credits: 5 }], // 17 credits
        passedCourses: [],
        maxEctsLimit: 21,
      });
      expect(res.allowed).toBe(false);
      expect(res.error).toContain('ECTS credit overload');
    });

    it('4.3: Blocks duplicate registration in already registered course', () => {
      const res = processCourseRegistration({
        studentId: '21B030482',
        courseToRegister: { code: 'BIS201', credits: 5, prerequisites: [], capacity: 30, enrolledCount: 10 },
        currentlyRegisteredCourses: [{ code: 'BIS201', credits: 5 }],
        passedCourses: [],
      });
      expect(res.allowed).toBe(false);
      expect(res.error).toContain('Already registered');
    });

    it('4.4: Blocks registration when course section capacity is full (30/30)', () => {
      const res = processCourseRegistration({
        studentId: '21B030482',
        courseToRegister: { code: 'FULL_COURSE', credits: 5, prerequisites: [], capacity: 30, enrolledCount: 30 },
        currentlyRegisteredCourses: [],
        passedCourses: [],
      });
      expect(res.allowed).toBe(false);
      expect(res.error).toContain('section is full');
    });

    it('4.5: Allows registration when exactly 1 seat remains in section (29/30)', () => {
      const res = processCourseRegistration({
        studentId: '21B030482',
        courseToRegister: { code: 'ONE_SEAT_LEFT', credits: 5, prerequisites: [], capacity: 30, enrolledCount: 29 },
        currentlyRegisteredCourses: [],
        passedCourses: [],
      });
      expect(res.allowed).toBe(true);
    });

    it('4.6: Blocks registration when required prerequisite course is missing', () => {
      const res = processCourseRegistration({
        studentId: '21B030482',
        courseToRegister: { code: 'DB202', credits: 5, prerequisites: ['CS101', 'MATH101'], capacity: 30, enrolledCount: 10 },
        currentlyRegisteredCourses: [],
        passedCourses: ['CS101'], // Missing MATH101
      });
      expect(res.allowed).toBe(false);
      expect(res.error).toContain('Missing prerequisite: MATH101');
    });

    it('4.7: Allows registration when all required prerequisites are satisfied', () => {
      const res = processCourseRegistration({
        studentId: '21B030482',
        courseToRegister: { code: 'DB202', credits: 5, prerequisites: ['CS101', 'MATH101'], capacity: 30, enrolledCount: 10 },
        currentlyRegisteredCourses: [],
        passedCourses: ['CS101', 'MATH101'],
      });
      expect(res.allowed).toBe(true);
    });

    it('4.8: Supports extended credit overload limit (up to 30 ECTS with Dean approval)', () => {
      const res = processCourseRegistration({
        studentId: '21B030482',
        courseToRegister: { code: 'EXTRA_ELECTIVE', credits: 5, prerequisites: [], capacity: 30, enrolledCount: 10 },
        currentlyRegisteredCourses: [{ code: 'C1', credits: 20 }],
        passedCourses: [],
        maxEctsLimit: 30,
      });
      expect(res.allowed).toBe(true);
      expect(res.newTotalEcts).toBe(25);
    });

    it('4.9: Correctly accumulates new total ECTS upon successful registration', () => {
      const res = processCourseRegistration({
        studentId: '21B030482',
        courseToRegister: { code: 'NET203', credits: 5, prerequisites: [], capacity: 30, enrolledCount: 10 },
        currentlyRegisteredCourses: [{ code: 'C1', credits: 10 }],
        passedCourses: [],
      });
      expect(res.newTotalEcts).toBe(15);
    });

    it('4.10: Preserves existing total ECTS when registration is rejected', () => {
      const res = processCourseRegistration({
        studentId: '21B030482',
        courseToRegister: { code: 'TOO_HEAVY', credits: 15, prerequisites: [], capacity: 30, enrolledCount: 10 },
        currentlyRegisteredCourses: [{ code: 'C1', credits: 15 }],
        passedCourses: [],
        maxEctsLimit: 21,
      });
      expect(res.allowed).toBe(false);
      expect(res.newTotalEcts).toBe(15);
    });
  });

  describe('STUDENT MENU FUNCTION 5: Attestation & Grade Points (calculateAttestationStatus)', () => {
    it('5.1: Admits student with high attestation marks (28.5 + 27.0 = 55.5 / 60.0)', () => {
      const res = calculateAttestationStatus({ attestation1: 28.5, attestation2: 27.0 });
      expect(res.admittedToExam).toBe(true);
      expect(res.preExamTotal).toBe(55.5);
    });

    it('5.2: Admits student on exact threshold (15.0 + 15.0 = 30.0 / 60.0)', () => {
      const res = calculateAttestationStatus({ attestation1: 15.0, attestation2: 15.0 });
      expect(res.admittedToExam).toBe(true);
      expect(res.preExamTotal).toBe(30.0);
    });

    it('5.3: Bars student from exam when pre-exam total is under 30.0 points', () => {
      const res = calculateAttestationStatus({ attestation1: 14.5, attestation2: 15.0 });
      expect(res.admittedToExam).toBe(false);
      expect(res.preExamTotal).toBe(29.5);
      expect(res.status).toContain('Barred from Exam');
    });

    it('5.4: Clamps attestation inputs to permissible max of 30.0 points per attestation', () => {
      const res = calculateAttestationStatus({ attestation1: 35.0, attestation2: 40.0 });
      expect(res.preExamTotal).toBe(60.0);
    });

    it('5.5: Clamps negative inputs to 0.0 points', () => {
      const res = calculateAttestationStatus({ attestation1: -5.0, attestation2: 20.0 });
      expect(res.preExamTotal).toBe(20.0);
      expect(res.admittedToExam).toBe(false);
    });

    it('5.6: Calculates final course score and "A" grade with strong final exam', () => {
      const res = calculateAttestationStatus({ attestation1: 28.5, attestation2: 27.0, finalExam: 39.5 });
      expect(res.finalScore).toBe(95.0);
      expect(res.letterGrade).toBe('A');
    });

    it('5.7: Calculates "B+" grade with intermediate final exam score', () => {
      const res = calculateAttestationStatus({ attestation1: 26.0, attestation2: 26.0, finalExam: 34.0 });
      expect(res.finalScore).toBe(86.0);
      expect(res.letterGrade).toBe('B+');
    });

    it('5.8: Fails course if final exam score < 20 / 40 despite high pre-exam points', () => {
      const res = calculateAttestationStatus({ attestation1: 30.0, attestation2: 30.0, finalExam: 18.0 });
      expect(res.letterGrade).toBe('F');
      expect(res.status).toContain('Failed Exam (< 20.0 pts on Final)');
    });

    it('5.9: Passes course on exact minimum exam passing threshold (20.0 / 40)', () => {
      const res = calculateAttestationStatus({ attestation1: 25.0, attestation2: 25.0, finalExam: 20.0 });
      expect(res.finalScore).toBe(70.0);
      expect(res.letterGrade).toBe('C+');
      expect(res.status).toContain('Course Passed');
    });

    it('5.10: Formats clear informative message for Summer retake when disqualified', () => {
      const res = calculateAttestationStatus({ attestation1: 10.0, attestation2: 12.0 });
      expect(res.status).toContain('Summer semester');
    });
  });

  describe('STUDENT MENU FUNCTION 6: Student Requests & Certificates (submitStudentRequest)', () => {
    it('6.1: Successfully generates Transcript request', () => {
      const res = submitStudentRequest('21B030482', 'TRANSCRIPT', 3);
      expect(res.success).toBe(true);
      expect(res.request?.type).toBe('TRANSCRIPT');
    });

    it('6.2: Successfully generates Official Enrollment Certificate with verification hash', () => {
      const res = submitStudentRequest('21B030482', 'ENROLLMENT_CERTIFICATE', 3);
      expect(res.success).toBe(true);
      expect(res.request?.verificationHash).toContain('KBTU-VERIFY-');
    });

    it('6.3: Successfully generates Military Exemption (App 4) certificate', () => {
      const res = submitStudentRequest('21B030482', 'MILITARY_APP4', 3);
      expect(res.success).toBe(true);
      expect(res.request?.type).toBe('MILITARY_APP4');
    });

    it('6.4: Successfully generates Academic Leave petition', () => {
      const res = submitStudentRequest('21B030482', 'ACADEMIC_LEAVE', 2);
      expect(res.success).toBe(true);
    });

    it('6.5: Rejects request with missing or empty student ID', () => {
      const res = submitStudentRequest('', 'TRANSCRIPT', 3);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Student ID is required');
    });

    it('6.6: Rejects request with invalid study year (0 or >5)', () => {
      const res = submitStudentRequest('21B030482', 'TRANSCRIPT', 6);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid year of study');
    });

    it('6.7: Formats unique tracking ID according to standard REQ-2026-XXXX', () => {
      const res = submitStudentRequest('21B030482', 'TRANSCRIPT', 3);
      expect(res.request?.id).toMatch(/^REQ-2026-\d{4}$/);
    });

    it('6.8: Generates unique cryptographic verification hash', () => {
      const res = submitStudentRequest('21B030482', 'TRANSCRIPT', 3);
      expect(res.request?.verificationHash.length).toBeGreaterThan(10);
    });

    it('6.9: Sets initial status to APPROVED for instant electronic documents', () => {
      const res = submitStudentRequest('21B030482', 'ENROLLMENT_CERTIFICATE', 3);
      expect(res.request?.status).toBe('APPROVED');
    });

    it('6.10: Attaches valid ISO submission timestamp', () => {
      const res = submitStudentRequest('21B030482', 'TRANSCRIPT', 3);
      expect(res.request?.submittedAt).toBeDefined();
      expect(new Date(res.request!.submittedAt).getFullYear()).toBeGreaterThanOrEqual(2026);
    });
  });

  describe('STUDENT MENU FUNCTION 7: Entry Diagnostic & Prerequisite Tests (evaluateEntryDiagnosticTest)', () => {
    it('7.1: Assigns C1 level for English score >= 85', () => {
      const res = evaluateEntryDiagnosticTest({ studentId: '21B030482', englishScore: 92, calculusScore: 80, integrityQuizScore: 100 });
      expect(res.cefrLevel).toBe('C1');
    });

    it('7.2: Assigns B2 level for English score between 70 and 84', () => {
      const res = evaluateEntryDiagnosticTest({ studentId: '21B030482', englishScore: 78, calculusScore: 80, integrityQuizScore: 100 });
      expect(res.cefrLevel).toBe('B2');
    });

    it('7.3: Assigns B1 level for English score between 55 and 69', () => {
      const res = evaluateEntryDiagnosticTest({ studentId: '21B030482', englishScore: 60, calculusScore: 80, integrityQuizScore: 100 });
      expect(res.cefrLevel).toBe('B1');
    });

    it('7.4: Assigns A2 level for English score between 40 and 54', () => {
      const res = evaluateEntryDiagnosticTest({ studentId: '21B030482', englishScore: 45, calculusScore: 80, integrityQuizScore: 100 });
      expect(res.cefrLevel).toBe('A2');
    });

    it('7.5: Assigns A1 level for English score < 40', () => {
      const res = evaluateEntryDiagnosticTest({ studentId: '21B030482', englishScore: 30, calculusScore: 80, integrityQuizScore: 100 });
      expect(res.cefrLevel).toBe('A1');
    });

    it('7.6: Clears Calculus diagnostic on score >= 60', () => {
      const res = evaluateEntryDiagnosticTest({ studentId: '21B030482', englishScore: 80, calculusScore: 65, integrityQuizScore: 100 });
      expect(res.calculusCleared).toBe(true);
    });

    it('7.7: Fails Calculus diagnostic on score < 60', () => {
      const res = evaluateEntryDiagnosticTest({ studentId: '21B030482', englishScore: 80, calculusScore: 55, integrityQuizScore: 100 });
      expect(res.calculusCleared).toBe(false);
    });

    it('7.8: Clears Academic Integrity Quiz on score >= 80', () => {
      const res = evaluateEntryDiagnosticTest({ studentId: '21B030482', englishScore: 80, calculusScore: 70, integrityQuizScore: 85 });
      expect(res.integrityCleared).toBe(true);
    });

    it('7.9: Fails Academic Integrity Quiz on score < 80', () => {
      const res = evaluateEntryDiagnosticTest({ studentId: '21B030482', englishScore: 80, calculusScore: 70, integrityQuizScore: 75 });
      expect(res.integrityCleared).toBe(false);
    });

    it('7.10: Approves overall eligibility only when all 3 criteria are satisfied (B2+ & Calculus & Integrity)', () => {
      const passing = evaluateEntryDiagnosticTest({ studentId: '21B030482', englishScore: 75, calculusScore: 85, integrityQuizScore: 90 });
      expect(passing.overallEligible).toBe(true);

      const failingLang = evaluateEntryDiagnosticTest({ studentId: '21B030482', englishScore: 50, calculusScore: 85, integrityQuizScore: 90 });
      expect(failingLang.overallEligible).toBe(false);
    });
  });

  // ==========================================================================
  // PART B: TEACHER MENU FUNCTIONS (7 Functions x 10 Tests = 70 Tests)
  // ==========================================================================

  describe('TEACHER MENU FUNCTION 1: Live Multi-Hour Attendance Roster (generateSessionMultiHourRoster)', () => {
    const students = [
      { id: 's1', fullName: 'Saniya Niyazkhan' },
      { id: 's2', fullName: 'Alua Bagdat' },
    ];

    it('8.1: Correctly tallies 3 / 3 points when student is present for all 3 hours', () => {
      const records = [
        { sessionId: 'ses-8', studentId: 's1', hourSlot: 1 as const, verificationStatus: 'PRESENT' as const },
        { sessionId: 'ses-8', studentId: 's1', hourSlot: 2 as const, verificationStatus: 'PRESENT' as const },
        { sessionId: 'ses-8', studentId: 's1', hourSlot: 3 as const, verificationStatus: 'PRESENT' as const },
      ];
      const { roster } = generateSessionMultiHourRoster(students, records, 'ses-8');
      const s1 = roster.find((r) => r.studentId === 's1');
      expect(s1?.totalPoints).toBe(3);
      expect(s1?.hour1).toBe('PRESENT');
      expect(s1?.hour2).toBe('PRESENT');
      expect(s1?.hour3).toBe('PRESENT');
    });

    it('8.2: Correctly tallies 0 / 3 points when student is absent for all 3 hours', () => {
      const { roster } = generateSessionMultiHourRoster(students, [], 'ses-8');
      const s1 = roster.find((r) => r.studentId === 's1');
      expect(s1?.totalPoints).toBe(0);
      expect(s1?.hour1).toBe('ABSENT');
    });

    it('8.3: Correctly tallies 1 / 3 points (present only in Hour 1)', () => {
      const records = [
        { sessionId: 'ses-8', studentId: 's1', hourSlot: 1 as const, verificationStatus: 'PRESENT' as const },
      ];
      const { roster } = generateSessionMultiHourRoster(students, records, 'ses-8');
      const s1 = roster.find((r) => r.studentId === 's1');
      expect(s1?.totalPoints).toBe(1);
      expect(s1?.hour1).toBe('PRESENT');
      expect(s1?.hour2).toBe('ABSENT');
    });

    it('8.4: Correctly tallies 2 / 3 points (present in Hours 2 & 3)', () => {
      const records = [
        { sessionId: 'ses-8', studentId: 's1', hourSlot: 2 as const, verificationStatus: 'PRESENT' as const },
        { sessionId: 'ses-8', studentId: 's1', hourSlot: 3 as const, verificationStatus: 'PRESENT' as const },
      ];
      const { roster } = generateSessionMultiHourRoster(students, records, 'ses-8');
      const s1 = roster.find((r) => r.studentId === 's1');
      expect(s1?.totalPoints).toBe(2);
    });

    it('8.5: Aggregates total possible points for enrolled students (2 students x 3 hours = 6 points)', () => {
      const { totalPossiblePoints } = generateSessionMultiHourRoster(students, [], 'ses-8');
      expect(totalPossiblePoints).toBe(6);
    });

    it('8.6: Computes exact session presence percentage (3 / 6 earned points = 50%)', () => {
      const records = [
        { sessionId: 'ses-8', studentId: 's1', hourSlot: 1 as const, verificationStatus: 'PRESENT' as const },
        { sessionId: 'ses-8', studentId: 's1', hourSlot: 2 as const, verificationStatus: 'PRESENT' as const },
        { sessionId: 'ses-8', studentId: 's2', hourSlot: 1 as const, verificationStatus: 'PRESENT' as const },
      ];
      const { presenceRate, totalEarnedPoints } = generateSessionMultiHourRoster(students, records, 'ses-8');
      expect(totalEarnedPoints).toBe(3);
      expect(presenceRate).toBe(50);
    });

    it('8.7: Computes 100% presence rate when all students attend all 3 hours', () => {
      const records = [
        { sessionId: 'ses-8', studentId: 's1', hourSlot: 1 as const, verificationStatus: 'PRESENT' as const },
        { sessionId: 'ses-8', studentId: 's1', hourSlot: 2 as const, verificationStatus: 'PRESENT' as const },
        { sessionId: 'ses-8', studentId: 's1', hourSlot: 3 as const, verificationStatus: 'PRESENT' as const },
        { sessionId: 'ses-8', studentId: 's2', hourSlot: 1 as const, verificationStatus: 'PRESENT' as const },
        { sessionId: 'ses-8', studentId: 's2', hourSlot: 2 as const, verificationStatus: 'PRESENT' as const },
        { sessionId: 'ses-8', studentId: 's2', hourSlot: 3 as const, verificationStatus: 'PRESENT' as const },
      ];
      const { presenceRate } = generateSessionMultiHourRoster(students, records, 'ses-8');
      expect(presenceRate).toBe(100);
    });

    it('8.8: Computes 0% presence rate when no attendance records exist', () => {
      const { presenceRate } = generateSessionMultiHourRoster(students, [], 'ses-8');
      expect(presenceRate).toBe(0);
    });

    it('8.9: Correctly filters out attendance records belonging to other sessions', () => {
      const records = [
        { sessionId: 'ses-7', studentId: 's1', hourSlot: 1 as const, verificationStatus: 'PRESENT' as const },
      ];
      const { roster } = generateSessionMultiHourRoster(students, records, 'ses-8');
      expect(roster[0].totalPoints).toBe(0);
    });

    it('8.10: Preserves student names and IDs in output roster mapping', () => {
      const { roster } = generateSessionMultiHourRoster(students, [], 'ses-8');
      expect(roster[0].studentName).toBe('Saniya Niyazkhan');
      expect(roster[1].studentName).toBe('Alua Bagdat');
    });
  });

  describe('TEACHER MENU FUNCTION 2: Manual Attendance Override (teacherManualAttendanceOverride)', () => {
    it('9.1: Successfully overrides Hour 1 to PRESENT with written reason', () => {
      const res = teacherManualAttendanceOverride({
        teacherUsername: 't_issabek',
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        hourSlot: 1,
        newStatus: 'PRESENT',
        reason: 'Student arrived on time in Hall 301; mobile GPS failed to lock.',
      });
      expect(res.success).toBe(true);
      expect(res.auditEntry?.newStatus).toBe('PRESENT');
    });

    it('9.2: Successfully overrides Hour 2 to ABSENT with written reason', () => {
      const res = teacherManualAttendanceOverride({
        teacherUsername: 't_issabek',
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        hourSlot: 2,
        newStatus: 'ABSENT',
        reason: 'Student left classroom during 2nd hour.',
      });
      expect(res.success).toBe(true);
      expect(res.auditEntry?.newStatus).toBe('ABSENT');
    });

    it('9.3: Successfully overrides Hour 3 to EXCUSED with medical certificate justification', () => {
      const res = teacherManualAttendanceOverride({
        teacherUsername: 't_issabek',
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        hourSlot: 3,
        newStatus: 'EXCUSED',
        reason: 'Valid medical excuse document submitted to Dean office.',
      });
      expect(res.success).toBe(true);
      expect(res.auditEntry?.newStatus).toBe('EXCUSED');
    });

    it('9.4: Rejects override attempt if reason is missing or empty', () => {
      const res = teacherManualAttendanceOverride({
        teacherUsername: 't_issabek',
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        hourSlot: 1,
        newStatus: 'PRESENT',
        reason: '',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('written justification');
    });

    it('9.5: Rejects override attempt if reason is too short (< 5 characters)', () => {
      const res = teacherManualAttendanceOverride({
        teacherUsername: 't_issabek',
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        hourSlot: 1,
        newStatus: 'PRESENT',
        reason: 'ok',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('at least 5 characters');
    });

    it('9.6: Rejects override attempt if teacher authentication is missing', () => {
      const res = teacherManualAttendanceOverride({
        teacherUsername: '',
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        hourSlot: 1,
        newStatus: 'PRESENT',
        reason: 'Legitimate manual check',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('authentication required');
    });

    it('9.7: Generates complete audit log payload with actor username', () => {
      const res = teacherManualAttendanceOverride({
        teacherUsername: 't_issabek',
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        hourSlot: 1,
        newStatus: 'PRESENT',
        reason: 'Visual verification in Hall 301 row 3.',
      });
      expect(res.auditEntry?.actor).toBe('t_issabek');
      expect(res.auditEntry?.action).toBe('MANUAL_OVERRIDE');
    });

    it('9.8: Records target student ID, session ID, and specific hour slot in audit log', () => {
      const res = teacherManualAttendanceOverride({
        teacherUsername: 't_issabek',
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        hourSlot: 2,
        newStatus: 'PRESENT',
        reason: 'Visual verification in Hall 301.',
      });
      expect(res.auditEntry?.studentId).toBe('s_niyazkhan');
      expect(res.auditEntry?.sessionId).toBe('ses-8');
      expect(res.auditEntry?.hourSlot).toBe(2);
    });

    it('9.9: Records exact timestamp in ISO format', () => {
      const res = teacherManualAttendanceOverride({
        teacherUsername: 't_issabek',
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        hourSlot: 1,
        newStatus: 'PRESENT',
        reason: 'Visual verification in Hall 301.',
      });
      expect(new Date(res.auditEntry!.timestamp).getFullYear()).toBeGreaterThanOrEqual(2026);
    });

    it('9.10: Trims excess whitespace in justification reason', () => {
      const res = teacherManualAttendanceOverride({
        teacherUsername: 't_issabek',
        studentId: 's_niyazkhan',
        sessionId: 'ses-8',
        hourSlot: 1,
        newStatus: 'PRESENT',
        reason: '   Proper justification text   ',
      });
      expect(res.auditEntry?.reason).toBe('Proper justification text');
    });
  });

  describe('TEACHER MENU FUNCTION 3: Session Geofence & Status Control (setSessionGeofenceAndStatus)', () => {
    it('10.1: Toggles session status from CLOSED to OPEN', () => {
      const res = setSessionGeofenceAndStatus('CLOSED', 150, 'TOGGLE');
      expect(res.isOpen).toBe(true);
    });

    it('10.2: Toggles session status from OPEN to CLOSED', () => {
      const res = setSessionGeofenceAndStatus('OPEN', 150, 'TOGGLE');
      expect(res.isOpen).toBe(false);
    });

    it('10.3: Sets valid campus radius to standard 150m', () => {
      const res = setSessionGeofenceAndStatus('OPEN', 150, 'SET_RADIUS');
      expect(res.allowedRadiusM).toBe(150);
    });

    it('10.4: Sets strict classroom mode radius to 50m', () => {
      const res = setSessionGeofenceAndStatus('OPEN', 50, 'SET_RADIUS');
      expect(res.allowedRadiusM).toBe(50);
    });

    it('10.5: Sets campus quad wide radius to 300m', () => {
      const res = setSessionGeofenceAndStatus('OPEN', 300, 'SET_RADIUS');
      expect(res.allowedRadiusM).toBe(300);
    });

    it('10.6: Rejects radius below minimum bound (< 20m)', () => {
      const res = setSessionGeofenceAndStatus('OPEN', 10, 'SET_RADIUS');
      expect(res.error).toContain('between 20 and 1000 meters');
    });

    it('10.7: Rejects radius above maximum bound (> 1000m)', () => {
      const res = setSessionGeofenceAndStatus('OPEN', 1200, 'SET_RADIUS');
      expect(res.error).toContain('between 20 and 1000 meters');
    });

    it('10.8: Accepts minimum boundary radius (20m)', () => {
      const res = setSessionGeofenceAndStatus('OPEN', 20, 'SET_RADIUS');
      expect(res.allowedRadiusM).toBe(20);
    });

    it('10.9: Accepts maximum boundary radius (1000m)', () => {
      const res = setSessionGeofenceAndStatus('OPEN', 1000, 'SET_RADIUS');
      expect(res.allowedRadiusM).toBe(1000);
    });

    it('10.10: Preserves open/closed state when changing radius', () => {
      const res = setSessionGeofenceAndStatus('CLOSED', 200, 'SET_RADIUS');
      expect(res.isOpen).toBe(false);
      expect(res.allowedRadiusM).toBe(200);
    });
  });

  describe('TEACHER MENU FUNCTION 4: Evaluate At-Risk Attendance (evaluateAtRiskAttendance)', () => {
    it('11.1: Identifies non-at-risk student with 90% attendance', () => {
      const res = evaluateAtRiskAttendance(10, 9);
      expect(res.rate).toBe(90);
      expect(res.isAtRisk).toBe(false);
      expect(res.hoursNeededToReach80Percent).toBe(0);
    });

    it('11.2: Identifies non-at-risk student exactly on 80% boundary', () => {
      const res = evaluateAtRiskAttendance(10, 8);
      expect(res.rate).toBe(80);
      expect(res.isAtRisk).toBe(false);
    });

    it('11.3: Flags student at risk when rate drops below 80% (79%)', () => {
      const res = evaluateAtRiskAttendance(100, 79);
      expect(res.rate).toBe(79);
      expect(res.isAtRisk).toBe(true);
    });

    it('11.4: Flags student at risk with 50% attendance', () => {
      const res = evaluateAtRiskAttendance(10, 5);
      expect(res.rate).toBe(50);
      expect(res.isAtRisk).toBe(true);
    });

    it('11.5: Flags student at risk with 0% attendance', () => {
      const res = evaluateAtRiskAttendance(10, 0);
      expect(res.rate).toBe(0);
      expect(res.isAtRisk).toBe(true);
    });

    it('11.6: Calculates exact hours needed to recover from 75% to 80%', () => {
      // 12 attended out of 16 = 75%. Formula: 4*16 - 5*12 = 64 - 60 = 4 hours
      const res = evaluateAtRiskAttendance(16, 12);
      expect(res.rate).toBe(75);
      expect(res.hoursNeededToReach80Percent).toBe(4);
    });

    it('11.7: Calculates exact hours needed to recover from 60% to 80%', () => {
      // 6 attended out of 10 = 60%. Formula: 4*10 - 5*6 = 40 - 30 = 10 hours
      const res = evaluateAtRiskAttendance(10, 6);
      expect(res.hoursNeededToReach80Percent).toBe(10);
    });

    it('11.8: Returns 0 hours needed when student is already above 80%', () => {
      const res = evaluateAtRiskAttendance(10, 9);
      expect(res.hoursNeededToReach80Percent).toBe(0);
    });

    it('11.9: Handles 0 total possible points gracefully without division by zero', () => {
      const res = evaluateAtRiskAttendance(0, 0);
      expect(res.rate).toBe(100);
      expect(res.isAtRisk).toBe(false);
    });

    it('11.10: Rounds rate to nearest whole percentage', () => {
      const res = evaluateAtRiskAttendance(15, 11); // 11/15 = 73.33% => 73%
      expect(res.rate).toBe(73);
    });
  });

  describe('TEACHER MENU FUNCTION 5: Early Warning Notice Dispatcher (dispatchEarlyWarningNotice)', () => {
    const student = { id: 's1', fullName: 'Saniya Niyazkhan', email: 's_niyazkhan@kbtu.kz' };

    it('12.1: Dispatches notice when attendance is 75% (< 80%)', () => {
      const res = dispatchEarlyWarningNotice(student, 'BIS201', 75);
      expect(res.dispatched).toBe(true);
      expect(res.message).toContain('75%');
    });

    it('12.2: Dispatches notice when attendance is 60%', () => {
      const res = dispatchEarlyWarningNotice(student, 'BIS201', 60);
      expect(res.dispatched).toBe(true);
    });

    it('12.3: Dispatches notice when attendance is 20%', () => {
      const res = dispatchEarlyWarningNotice(student, 'BIS201', 20);
      expect(res.dispatched).toBe(true);
    });

    it('12.4: Does NOT dispatch notice when attendance is 80% (compliant)', () => {
      const res = dispatchEarlyWarningNotice(student, 'BIS201', 80);
      expect(res.dispatched).toBe(false);
      expect(res.message).toContain('above 80%');
    });

    it('12.5: Does NOT dispatch notice when attendance is 95%', () => {
      const res = dispatchEarlyWarningNotice(student, 'BIS201', 95);
      expect(res.dispatched).toBe(false);
    });

    it('12.6: Formats warning message with student full name', () => {
      const res = dispatchEarlyWarningNotice(student, 'BIS201', 70);
      expect(res.message).toContain('Saniya Niyazkhan');
    });

    it('12.7: Formats warning message with target course code', () => {
      const res = dispatchEarlyWarningNotice(student, 'BIS201', 70);
      expect(res.message).toContain('BIS201');
    });

    it('12.8: Formats warning message with exact attendance percentage', () => {
      const res = dispatchEarlyWarningNotice(student, 'BIS201', 73);
      expect(res.message).toContain('73%');
    });

    it('12.9: Routes notice to student institutional email address', () => {
      const res = dispatchEarlyWarningNotice(student, 'BIS201', 70);
      expect(res.emailSentTo).toBe('s_niyazkhan@kbtu.kz');
    });

    it('12.10: References KBTU academic policy and instructor consultation', () => {
      const res = dispatchEarlyWarningNotice(student, 'BIS201', 70);
      expect(res.message).toContain('KBTU academic policy');
      expect(res.message).toContain('consult your instructor');
    });
  });

  describe('TEACHER MENU FUNCTION 6: Gradebook Course Total Scoring (calculateGradebookCourseTotal)', () => {
    it('13.1: Calculates 100% total (20 labs + 10 quiz + 30 proj + 40 exam) -> Grade "A"', () => {
      const res = calculateGradebookCourseTotal({ labs: 20, quizzes: 10, project: 30, finalExam: 40 });
      expect(res.valid).toBe(true);
      expect(res.total).toBe(100);
      expect(res.letterGrade).toBe('A');
    });

    it('13.2: Calculates 92% total -> Grade "A-"', () => {
      const res = calculateGradebookCourseTotal({ labs: 18, quizzes: 9, project: 28, finalExam: 37 });
      expect(res.valid).toBe(true);
      expect(res.total).toBe(92);
      expect(res.letterGrade).toBe('A-');
    });

    it('13.3: Calculates 86% total -> Grade "B+"', () => {
      const res = calculateGradebookCourseTotal({ labs: 17, quizzes: 9, project: 25, finalExam: 35 });
      expect(res.valid).toBe(true);
      expect(res.total).toBe(86);
      expect(res.letterGrade).toBe('B+');
    });

    it('13.4: Calculates 76% total -> Grade "B-"', () => {
      const res = calculateGradebookCourseTotal({ labs: 15, quizzes: 8, project: 23, finalExam: 30 });
      expect(res.valid).toBe(true);
      expect(res.total).toBe(76);
      expect(res.letterGrade).toBe('B-');
    });

    it('13.5: Calculates 66% total -> Grade "C"', () => {
      const res = calculateGradebookCourseTotal({ labs: 14, quizzes: 7, project: 20, finalExam: 25 });
      expect(res.valid).toBe(true);
      expect(res.total).toBe(66);
      expect(res.letterGrade).toBe('C');
    });

    it('13.6: Calculates 52% total -> Grade "D"', () => {
      const res = calculateGradebookCourseTotal({ labs: 10, quizzes: 5, project: 17, finalExam: 20 });
      expect(res.valid).toBe(true);
      expect(res.total).toBe(52);
      expect(res.letterGrade).toBe('D');
    });

    it('13.7: Calculates failing total 45% -> Grade "F"', () => {
      const res = calculateGradebookCourseTotal({ labs: 10, quizzes: 5, project: 15, finalExam: 15 });
      expect(res.valid).toBe(true);
      expect(res.total).toBe(45);
      expect(res.letterGrade).toBe('F');
    });

    it('13.8: Rejects score when labs exceed max permissible weight (> 20)', () => {
      const res = calculateGradebookCourseTotal({ labs: 25, quizzes: 10, project: 30, finalExam: 40 });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('permissible bounds');
    });

    it('13.9: Rejects score when project exceeds max permissible weight (> 30)', () => {
      const res = calculateGradebookCourseTotal({ labs: 20, quizzes: 10, project: 35, finalExam: 40 });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('permissible bounds');
    });

    it('13.10: Rejects score when any component contains negative value', () => {
      const res = calculateGradebookCourseTotal({ labs: -5, quizzes: 10, project: 30, finalExam: 40 });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('permissible bounds');
    });
  });

  describe('TEACHER MENU FUNCTION 7: Attendance CSV Report Generator (generateAttendanceCsvReport)', () => {
    const roster = [
      { studentId: 's1', studentName: 'Saniya Niyazkhan', hour1: 'PRESENT' as const, hour2: 'PRESENT' as const, hour3: 'PRESENT' as const, totalPoints: 3 },
      { studentId: 's2', studentName: 'Alua Bagdat', hour1: 'PRESENT' as const, hour2: 'ABSENT' as const, hour3: 'ABSENT' as const, totalPoints: 1 },
    ];

    it('14.1: Generates standard CSV header line', () => {
      const res = generateAttendanceCsvReport('BIS201', '2026-11-09', roster);
      expect(res.header).toBe('StudentID,StudentName,CourseCode,SessionDate,Hour1,Hour2,Hour3,TotalPoints');
    });

    it('14.2: Generates correct row count matching student count', () => {
      const res = generateAttendanceCsvReport('BIS201', '2026-11-09', roster);
      expect(res.rowCount).toBe(2);
    });

    it('14.3: Correctly formats Hour 1, Hour 2, and Hour 3 columns in rows', () => {
      const res = generateAttendanceCsvReport('BIS201', '2026-11-09', roster);
      expect(res.csvContent).toContain('s1,"Saniya Niyazkhan",BIS201,2026-11-09,PRESENT,PRESENT,PRESENT,3');
      expect(res.csvContent).toContain('s2,"Alua Bagdat",BIS201,2026-11-09,PRESENT,ABSENT,ABSENT,1');
    });

    it('14.4: Correctly formats TotalPoints column', () => {
      const res = generateAttendanceCsvReport('BIS201', '2026-11-09', roster);
      const lines = res.csvContent.split('\n');
      expect(lines[1].endsWith(',3')).toBe(true);
      expect(lines[2].endsWith(',1')).toBe(true);
    });

    it('14.5: Escapes student names with quotes to protect against commas', () => {
      const customRoster = [
        { studentId: 's3', studentName: 'Issabek, Ainur', hour1: 'PRESENT' as const, hour2: 'PRESENT' as const, hour3: 'PRESENT' as const, totalPoints: 3 },
      ];
      const res = generateAttendanceCsvReport('BIS201', '2026-11-09', customRoster);
      expect(res.csvContent).toContain('"Issabek, Ainur"');
    });

    it('14.6: Includes specified course code in data rows', () => {
      const res = generateAttendanceCsvReport('BIS201', '2026-11-09', roster);
      expect(res.csvContent).toContain('BIS201');
    });

    it('14.7: Includes session date in data rows', () => {
      const res = generateAttendanceCsvReport('BIS201', '2026-11-09', roster);
      expect(res.csvContent).toContain('2026-11-09');
    });

    it('14.8: Handles empty roster without throwing errors', () => {
      const res = generateAttendanceCsvReport('BIS201', '2026-11-09', []);
      expect(res.rowCount).toBe(0);
      expect(res.csvContent).toBe('StudentID,StudentName,CourseCode,SessionDate,Hour1,Hour2,Hour3,TotalPoints');
    });

    it('14.9: Handles single student roster', () => {
      const res = generateAttendanceCsvReport('BIS201', '2026-11-09', [roster[0]]);
      expect(res.rowCount).toBe(1);
    });

    it('14.10: Produces valid multi-line string joined by newlines', () => {
      const res = generateAttendanceCsvReport('BIS201', '2026-11-09', roster);
      const lines = res.csvContent.split('\n');
      expect(lines.length).toBe(3); // 1 header + 2 student rows
    });
  });

});
