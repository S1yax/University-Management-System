/**
 * Core business logic functions for Student and Teacher Menu capabilities
 * Grounded on KBTU Academic Policy, NIST SP 800-63B, and GPS Geofencing (Hall 301, Tole Bi 59)
 */

import { calculateHaversineDistance, KBTU_HALL_301_COORDS } from './geo';

// ============================================================================
// STUDENT MENU FUNCTIONS & TYPES
// ============================================================================

export interface StudentGpsCheckInInput {
  studentId: string;
  sessionId: string;
  coords: { lat: number; lng: number };
  isDrift?: boolean;
  hourSlot: 1 | 2 | 3;
  session: {
    id: string;
    courseCode: string;
    isOpen: boolean;
    allowedRadiusM: number;
    centerLat: number;
    centerLng: number;
  };
  enrollments: { studentId: string; courseCode: string }[];
  existingRecords: {
    sessionId: string;
    studentId: string;
    hourSlot: 1 | 2 | 3;
    status: 'PRESENT' | 'REJECTED' | 'MANUAL_REVIEW';
  }[];
}

export interface StudentGpsCheckInResult {
  success: boolean;
  status: 'PRESENT' | 'REJECTED' | 'MANUAL_REVIEW' | 'ALREADY_CHECKED_IN';
  distanceM: number;
  hourSlot: 1 | 2 | 3;
  reason?: string;
}

/**
 * 1. Student Menu: GPS Attendance Check-in with 3-hour lesson slot tracking
 */
export function studentGpsCheckIn(input: StudentGpsCheckInInput): StudentGpsCheckInResult {
  const { studentId, sessionId, coords, isDrift, hourSlot, session, enrollments, existingRecords } = input;

  // 1. Session open check
  if (!session.isOpen) {
    return {
      success: false,
      status: 'REJECTED',
      distanceM: -1,
      hourSlot,
      reason: 'Session is currently closed for check-in.',
    };
  }

  // 2. Enrollment check
  const isEnrolled = enrollments.some(
    (e) => e.studentId === studentId && e.courseCode === session.courseCode
  );
  if (!isEnrolled) {
    return {
      success: false,
      status: 'REJECTED',
      distanceM: -1,
      hourSlot,
      reason: `Student ${studentId} is not enrolled in course ${session.courseCode}.`,
    };
  }

  // 3. Duplicate check for the specific hour slot
  const alreadyCheckedIn = existingRecords.some(
    (r) => r.sessionId === sessionId && r.studentId === studentId && r.hourSlot === hourSlot && r.status === 'PRESENT'
  );
  if (alreadyCheckedIn) {
    return {
      success: false,
      status: 'ALREADY_CHECKED_IN',
      distanceM: -1,
      hourSlot,
      reason: `Already checked in for Hour Slot ${hourSlot}.`,
    };
  }

  // 4. Calculate Distance
  const distanceM = Math.round(
    calculateHaversineDistance(coords.lat, coords.lng, session.centerLat, session.centerLng)
  );

  // 5. Indoor GPS Drift / Weak signal check
  if (isDrift) {
    return {
      success: true,
      status: 'MANUAL_REVIEW',
      distanceM,
      hourSlot,
      reason: 'Weak indoor GPS signal detected. Submitted for teacher manual review.',
    };
  }

  // 6. Geofence radius check
  if (distanceM <= session.allowedRadiusM) {
    return {
      success: true,
      status: 'PRESENT',
      distanceM,
      hourSlot,
      reason: `Verified within campus radius (${distanceM}m <= ${session.allowedRadiusM}m).`,
    };
  }

  return {
    success: false,
    status: 'REJECTED',
    distanceM,
    hourSlot,
    reason: `Outside campus radius: distance ${distanceM}m exceeds allowed limit of ${session.allowedRadiusM}m.`,
  };
}

/**
 * 2. Student Menu: Transcript & GPA Calculation
 */
export interface CourseGrade {
  courseCode: string;
  credits: number;
  score: number; // 0-100
}

export function scoreToGradePoint(score: number): { gpaPoint: number; letter: string } {
  if (score >= 95) return { gpaPoint: 4.0, letter: 'A' };
  if (score >= 90) return { gpaPoint: 3.67, letter: 'A-' };
  if (score >= 85) return { gpaPoint: 3.33, letter: 'B+' };
  if (score >= 80) return { gpaPoint: 3.0, letter: 'B' };
  if (score >= 75) return { gpaPoint: 2.67, letter: 'B-' };
  if (score >= 70) return { gpaPoint: 2.33, letter: 'C+' };
  if (score >= 65) return { gpaPoint: 2.0, letter: 'C' };
  if (score >= 60) return { gpaPoint: 1.67, letter: 'C-' };
  if (score >= 55) return { gpaPoint: 1.33, letter: 'D+' };
  if (score >= 50) return { gpaPoint: 1.0, letter: 'D' };
  return { gpaPoint: 0.0, letter: 'F' };
}

export interface GpaResult {
  gpa: number;
  totalCredits: number;
  standing: 'Honors' | 'Good Standing' | 'Academic Probation';
  breakdown: { courseCode: string; credits: number; letter: string; points: number }[];
}

export function calculateStudentGpa(grades: CourseGrade[]): GpaResult {
  if (!grades || grades.length === 0) {
    return { gpa: 0, totalCredits: 0, standing: 'Academic Probation', breakdown: [] };
  }

  let totalWeightedPoints = 0;
  let totalCredits = 0;
  const breakdown = grades.map((g) => {
    const { gpaPoint, letter } = scoreToGradePoint(g.score);
    totalWeightedPoints += gpaPoint * g.credits;
    totalCredits += g.credits;
    return {
      courseCode: g.courseCode,
      credits: g.credits,
      letter,
      points: gpaPoint,
    };
  });

  const rawGpa = totalCredits > 0 ? totalWeightedPoints / totalCredits : 0;
  const gpa = Math.round(rawGpa * 100) / 100;

  let standing: 'Honors' | 'Good Standing' | 'Academic Probation' = 'Good Standing';
  if (gpa >= 3.67) standing = 'Honors';
  else if (gpa < 2.0) standing = 'Academic Probation';

  return { gpa, totalCredits, standing, breakdown };
}

/**
 * 3. Student Menu: Schedule Slot Conflict Detector
 */
export interface ScheduleSlot {
  courseCode: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startMinutes: number; // e.g. 16:00 = 16 * 60 = 960
  endMinutes: number;   // e.g. 19:00 = 19 * 60 = 1140
  room: string;
}

export function parseTimeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function validateScheduleConflict(
  existingSlots: ScheduleSlot[],
  candidate: ScheduleSlot
): { hasConflict: boolean; conflictingCourse?: string; reason?: string } {
  if (candidate.startMinutes >= candidate.endMinutes) {
    return { hasConflict: true, reason: 'Invalid slot time: start time must precede end time.' };
  }

  for (const slot of existingSlots) {
    if (slot.day === candidate.day) {
      // Overlap condition: max(start1, start2) < min(end1, end2)
      const overlapStart = Math.max(slot.startMinutes, candidate.startMinutes);
      const overlapEnd = Math.min(slot.endMinutes, candidate.endMinutes);
      if (overlapStart < overlapEnd) {
        return {
          hasConflict: true,
          conflictingCourse: slot.courseCode,
          reason: `Schedule conflict on ${candidate.day}: overlaps with ${slot.courseCode} (${slot.startMinutes / 60}:00 - ${slot.endMinutes / 60}:00) in ${slot.room}.`,
        };
      }
    }
  }

  return { hasConflict: false };
}

/**
 * 4. Student Menu: Course Registration Rules
 */
export interface CourseRegistrationInput {
  studentId: string;
  courseToRegister: {
    code: string;
    credits: number;
    prerequisites: string[];
    capacity: number;
    enrolledCount: number;
  };
  currentlyRegisteredCourses: { code: string; credits: number }[];
  passedCourses: string[];
  maxEctsLimit?: number; // default 21, upper limit 30
}

export function processCourseRegistration(
  input: CourseRegistrationInput
): { allowed: boolean; newTotalEcts: number; error?: string } {
  const {
    courseToRegister,
    currentlyRegisteredCourses,
    passedCourses,
    maxEctsLimit = 21,
  } = input;

  // 1. Duplicate check
  if (currentlyRegisteredCourses.some((c) => c.code === courseToRegister.code)) {
    return {
      allowed: false,
      newTotalEcts: currentlyRegisteredCourses.reduce((sum, c) => sum + c.credits, 0),
      error: `Already registered in ${courseToRegister.code}.`,
    };
  }

  // 2. Capacity check
  if (courseToRegister.enrolledCount >= courseToRegister.capacity) {
    return {
      allowed: false,
      newTotalEcts: currentlyRegisteredCourses.reduce((sum, c) => sum + c.credits, 0),
      error: `Course ${courseToRegister.code} section is full (${courseToRegister.enrolledCount}/${courseToRegister.capacity}).`,
    };
  }

  // 3. Prerequisite check
  for (const prereq of courseToRegister.prerequisites) {
    if (!passedCourses.includes(prereq)) {
      return {
        allowed: false,
        newTotalEcts: currentlyRegisteredCourses.reduce((sum, c) => sum + c.credits, 0),
        error: `Missing prerequisite: ${prereq} is required for ${courseToRegister.code}.`,
      };
    }
  }

  // 4. ECTS limit check
  const currentTotal = currentlyRegisteredCourses.reduce((sum, c) => sum + c.credits, 0);
  const newTotalEcts = currentTotal + courseToRegister.credits;
  if (newTotalEcts > maxEctsLimit) {
    return {
      allowed: false,
      newTotalEcts: currentTotal,
      error: `ECTS credit overload: ${newTotalEcts} exceeds semester limit of ${maxEctsLimit} credits.`,
    };
  }

  return { allowed: true, newTotalEcts };
}

/**
 * 5. Student Menu: Attestation & Grade Point Calculation
 */
export interface AttestationInput {
  attestation1: number; // max 30.0
  attestation2: number; // max 30.0
  finalExam?: number;   // max 40.0
}

export interface AttestationResult {
  preExamTotal: number;
  admittedToExam: boolean;
  finalScore?: number;
  letterGrade?: string;
  status: string;
}

export function calculateAttestationStatus(input: AttestationInput): AttestationResult {
  const att1 = Math.min(30, Math.max(0, input.attestation1));
  const att2 = Math.min(30, Math.max(0, input.attestation2));
  const preExamTotal = Math.round((att1 + att2) * 10) / 10;

  // KBTU Policy: Minimum 30.0 points out of 60.0 required to be admitted to Final Exam
  const admittedToExam = preExamTotal >= 30.0;

  if (!admittedToExam) {
    return {
      preExamTotal,
      admittedToExam: false,
      status: 'Barred from Exam (< 30.0 pre-exam points). Must retake course in Summer semester.',
    };
  }

  if (input.finalExam !== undefined) {
    const exam = Math.min(40, Math.max(0, input.finalExam));
    // Must score at least 20 / 40 on the final exam to pass
    const passedExam = exam >= 20.0;
    const finalScore = Math.round((preExamTotal + exam) * 10) / 10;
    const { letter } = scoreToGradePoint(passedExam ? finalScore : 49);

    return {
      preExamTotal,
      admittedToExam: true,
      finalScore,
      letterGrade: passedExam ? letter : 'F',
      status: passedExam ? `Course Passed (${letter})` : 'Failed Exam (< 20.0 pts on Final)',
    };
  }

  return {
    preExamTotal,
    admittedToExam: true,
    status: `Admitted to Final Exam (${preExamTotal} / 60.0)`,
  };
}

/**
 * 6. Student Menu: Student Requests (ЦОС / Official Certificates)
 */
export type RequestType =
  | 'TRANSCRIPT'
  | 'ENROLLMENT_CERTIFICATE'
  | 'MILITARY_APP4'
  | 'ACADEMIC_LEAVE';

export interface StudentRequest {
  id: string;
  studentId: string;
  type: RequestType;
  submittedAt: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  verificationHash: string;
}

export function submitStudentRequest(
  studentId: string,
  type: RequestType,
  yearOfStudy: number
): { success: boolean; request?: StudentRequest; error?: string } {
  if (!studentId || !studentId.trim()) {
    return { success: false, error: 'Student ID is required.' };
  }

  if (yearOfStudy < 1 || yearOfStudy > 5) {
    return { success: false, error: 'Invalid year of study.' };
  }

  // Generate unique request ID and verification hash
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const id = `REQ-2026-${randomSuffix}`;
  const raw = `${studentId}:${type}:${id}`;
  const verificationHash = `KBTU-VERIFY-${typeof btoa !== 'undefined' ? btoa(raw).slice(0, 12) : 'HASH-' + randomSuffix}`;

  return {
    success: true,
    request: {
      id,
      studentId,
      type,
      submittedAt: new Date().toISOString(),
      status: 'APPROVED', // Instant electronic generation for standard digital certificates
      verificationHash,
    },
  };
}

/**
 * 7. Student Menu: Entry Diagnostic Tests Evaluation
 */
export interface DiagnosticTestScore {
  studentId: string;
  englishScore: number;     // 0-100
  calculusScore: number;    // 0-100
  integrityQuizScore: number; // 0-100
}

export interface DiagnosticResult {
  studentId: string;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  calculusCleared: boolean;
  integrityCleared: boolean;
  overallEligible: boolean;
}

export function evaluateEntryDiagnosticTest(scores: DiagnosticTestScore): DiagnosticResult {
  const { studentId, englishScore, calculusScore, integrityQuizScore } = scores;

  let cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' = 'A1';
  if (englishScore >= 85) cefrLevel = 'C1';
  else if (englishScore >= 70) cefrLevel = 'B2';
  else if (englishScore >= 55) cefrLevel = 'B1';
  else if (englishScore >= 40) cefrLevel = 'A2';

  const calculusCleared = calculusScore >= 60;
  const integrityCleared = integrityQuizScore >= 80;
  const overallEligible = (cefrLevel === 'B2' || cefrLevel === 'C1') && calculusCleared && integrityCleared;

  return {
    studentId,
    cefrLevel,
    calculusCleared,
    integrityCleared,
    overallEligible,
  };
}

// ============================================================================
// TEACHER MENU FUNCTIONS & TYPES
// ============================================================================

export interface SessionRosterStudent {
  studentId: string;
  studentName: string;
  hour1: 'PRESENT' | 'ABSENT' | 'LATE';
  hour2: 'PRESENT' | 'ABSENT' | 'LATE';
  hour3: 'PRESENT' | 'ABSENT' | 'LATE';
  totalPoints: number; // 0 to 3
}

/**
 * 1. Teacher Menu: Generate Multi-Hour Session Attendance Roster
 */
export function generateSessionMultiHourRoster(
  enrolledStudents: { id: string; fullName: string }[],
  attendanceRecords: {
    sessionId: string;
    studentId: string;
    hourSlot: 1 | 2 | 3;
    verificationStatus: 'PRESENT' | 'ABSENT' | 'REJECTED' | 'MANUAL_REVIEW';
  }[],
  sessionId: string
): { roster: SessionRosterStudent[]; totalPossiblePoints: number; totalEarnedPoints: number; presenceRate: number } {
  let totalPossible = enrolledStudents.length * 3;
  let totalEarned = 0;

  const roster: SessionRosterStudent[] = enrolledStudents.map((s) => {
    const r1 = attendanceRecords.find((r) => r.sessionId === sessionId && r.studentId === s.id && r.hourSlot === 1);
    const r2 = attendanceRecords.find((r) => r.sessionId === sessionId && r.studentId === s.id && r.hourSlot === 2);
    const r3 = attendanceRecords.find((r) => r.sessionId === sessionId && r.studentId === s.id && r.hourSlot === 3);

    const h1 = r1?.verificationStatus === 'PRESENT' ? 'PRESENT' : 'ABSENT';
    const h2 = r2?.verificationStatus === 'PRESENT' ? 'PRESENT' : 'ABSENT';
    const h3 = r3?.verificationStatus === 'PRESENT' ? 'PRESENT' : 'ABSENT';

    let points = 0;
    if (h1 === 'PRESENT') points++;
    if (h2 === 'PRESENT') points++;
    if (h3 === 'PRESENT') points++;

    totalEarned += points;

    return {
      studentId: s.id,
      studentName: s.fullName,
      hour1: h1,
      hour2: h2,
      hour3: h3,
      totalPoints: points,
    };
  });

  const presenceRate = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
  return { roster, totalPossiblePoints: totalPossible, totalEarnedPoints: totalEarned, presenceRate };
}

/**
 * 2. Teacher Menu: Manual Attendance Override with Audit Logging
 */
export interface ManualOverrideInput {
  teacherUsername: string;
  studentId: string;
  sessionId: string;
  hourSlot: 1 | 2 | 3;
  newStatus: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  reason: string;
}

export function teacherManualAttendanceOverride(
  input: ManualOverrideInput
): { success: boolean; auditEntry?: any; error?: string } {
  if (!input.teacherUsername) {
    return { success: false, error: 'Teacher authentication required for override.' };
  }

  if (!input.reason || input.reason.trim().length < 5) {
    return { success: false, error: 'A written justification of at least 5 characters is mandatory for manual overrides.' };
  }

  const auditEntry = {
    action: 'MANUAL_OVERRIDE',
    actor: input.teacherUsername,
    studentId: input.studentId,
    sessionId: input.sessionId,
    hourSlot: input.hourSlot,
    newStatus: input.newStatus,
    reason: input.reason.trim(),
    timestamp: new Date().toISOString(),
  };

  return { success: true, auditEntry };
}

/**
 * 3. Teacher Menu: Set Session Geofence & Open/Close Status
 */
export function setSessionGeofenceAndStatus(
  currentStatus: 'OPEN' | 'CLOSED',
  radiusMeters: number,
  targetAction: 'TOGGLE' | 'SET_RADIUS'
): { isOpen: boolean; allowedRadiusM: number; error?: string } {
  if (targetAction === 'SET_RADIUS') {
    if (radiusMeters < 20 || radiusMeters > 1000) {
      return {
        isOpen: currentStatus === 'OPEN',
        allowedRadiusM: 150,
        error: 'Campus radius must be between 20 and 1000 meters.',
      };
    }
    return { isOpen: currentStatus === 'OPEN', allowedRadiusM: radiusMeters };
  }

  // TOGGLE action
  const nextOpen = currentStatus !== 'OPEN';
  return { isOpen: nextOpen, allowedRadiusM: radiusMeters };
}

/**
 * 4. Teacher Menu: Evaluate At-Risk Attendance (< 80% threshold)
 */
export function evaluateAtRiskAttendance(
  totalPossiblePoints: number,
  attendedPoints: number
): { rate: number; isAtRisk: boolean; hoursNeededToReach80Percent: number } {
  if (totalPossiblePoints <= 0) {
    return { rate: 100, isAtRisk: false, hoursNeededToReach80Percent: 0 };
  }

  const rate = Math.round((attendedPoints / totalPossiblePoints) * 100);
  const isAtRisk = rate < 80;

  // Formula to find required future attended hours (x) to satisfy (attended + x)/(total + x) >= 0.8:
  // attended + x >= 0.8 total + 0.8 x => 0.2 x >= 0.8 total - attended => x >= 4 total - 5 attended
  let needed = 0;
  if (isAtRisk) {
    needed = Math.max(0, Math.ceil(4 * totalPossiblePoints - 5 * attendedPoints));
  }

  return { rate, isAtRisk, hoursNeededToReach80Percent: needed };
}

/**
 * 5. Teacher Menu: Early Warning Notice Dispatcher
 */
export function dispatchEarlyWarningNotice(
  student: { id: string; fullName: string; email: string },
  courseCode: string,
  attendancePercentage: number
): { dispatched: boolean; message: string; emailSentTo: string } {
  const isAtRisk = attendancePercentage < 80;
  if (!isAtRisk) {
    return {
      dispatched: false,
      message: 'Student attendance is above 80%. No early warning required.',
      emailSentTo: student.email,
    };
  }

  const subject = `[KBTU Academic Notice] Attendance Warning for ${courseCode} (${attendancePercentage}%)`;
  const message = `Dear ${student.fullName}, your attendance in ${courseCode} has dropped to ${attendancePercentage}%, which is below the 80% threshold required by KBTU academic policy. Please consult your instructor immediately.`;

  return {
    dispatched: true,
    message,
    emailSentTo: student.email,
  };
}

/**
 * 6. Teacher Menu: Electronic Gradebook Course Total Scoring
 */
export interface GradebookComponents {
  labs: number;      // max 20
  quizzes: number;   // max 10
  project: number;   // max 30
  finalExam: number; // max 40
}

export function calculateGradebookCourseTotal(
  components: GradebookComponents
): { valid: boolean; total: number; letterGrade: string; error?: string } {
  if (
    components.labs < 0 || components.labs > 20 ||
    components.quizzes < 0 || components.quizzes > 10 ||
    components.project < 0 || components.project > 30 ||
    components.finalExam < 0 || components.finalExam > 40
  ) {
    return { valid: false, total: 0, letterGrade: 'F', error: 'Score exceeds permissible bounds for one or more components.' };
  }

  const total = Math.round((components.labs + components.quizzes + components.project + components.finalExam) * 10) / 10;
  const { letter } = scoreToGradePoint(total);

  return { valid: true, total, letterGrade: letter };
}

/**
 * 7. Teacher Menu: Attendance CSV Report Generator
 */
export function generateAttendanceCsvReport(
  courseCode: string,
  sessionDate: string,
  roster: SessionRosterStudent[]
): { header: string; rowCount: number; csvContent: string } {
  const header = 'StudentID,StudentName,CourseCode,SessionDate,Hour1,Hour2,Hour3,TotalPoints';
  const lines = [header];

  for (const s of roster) {
    lines.push(
      `${s.studentId},"${s.studentName}",${courseCode},${sessionDate},${s.hour1},${s.hour2},${s.hour3},${s.totalPoints}`
    );
  }

  return {
    header,
    rowCount: roster.length,
    csvContent: lines.join('\n'),
  };
}
