import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Language,
  ClassSession,
  AttendanceRecord,
  Enrollment,
  AuditLogEntry,
  Course,
  AuditActionType,
  VerificationStatus,
} from '../types';
import {
  USERS,
  CLASS_SESSIONS,
  INITIAL_ATTENDANCE_RECORDS,
  ENROLLMENTS,
  INITIAL_AUDIT_LOGS,
  COURSES,
  DEMO_PASSWORD,
} from '../data/mockData';
import { calculateHaversineDistance, KBTU_HALL_301_COORDS } from '../utils/geo';
import { getTranslation } from '../utils/i18n';

interface CheckInResult {
  status: 'SUCCESS_PRESENT' | 'REJECTED_RADIUS' | 'REJECTED_NOT_ENROLLED' | 'REJECTED_CLOSED' | 'ALREADY_CHECKED_IN' | 'MANUAL_REVIEW_SUBMITTED';
  message: string;
  distanceM?: number;
  record?: AttendanceRecord;
}

interface AppContextType {
  currentUser: User | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  users: User[];
  courses: Course[];
  classSessions: ClassSession[];
  attendanceRecords: AttendanceRecord[];
  enrollments: Enrollment[];
  auditLogs: AuditLogEntry[];
  failedAttempts: number;
  lockoutRemainingSeconds: number;
  activePath: string;
  setActivePath: (path: string) => void;

  // Actions
  login: (loginInput: string, passwordInput: string) => { success: boolean; errorKey?: string; locked?: boolean };
  logout: () => void;
  checkInGPS: (sessionId: string, latitude: number, longitude: number, isDrift?: boolean) => CheckInResult;
  requestManualReview: (sessionId: string, reason: string) => void;
  toggleSessionStatus: (sessionId: string) => void;
  overrideAttendance: (recordId: string, newStatus: VerificationStatus, reason: string) => void;
  createManualAttendance: (sessionId: string, studentId: string, status: VerificationStatus, reason: string) => void;
  sendEarlyWarningNotice: (studentId: string, courseCode: string) => { success: boolean; message: string };
  addAuditLog: (action: AuditActionType, details: string, status: 'SUCCESS' | 'WARNING' | 'ERROR', username?: string) => void;
  t: (key: any, params?: Record<string, string | number>) => string;
  getStudentAttendanceRate: (studentId: string, courseCode: string) => { attended: number; total: number; percentage: number; isAtRisk: boolean };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'kbtu_ums_current_user',
  LANG: 'kbtu_ums_language',
  SESSIONS: 'kbtu_ums_sessions',
  ATTENDANCE: 'kbtu_ums_attendance',
  AUDIT: 'kbtu_ums_audit_logs',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current language
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LANG);
    return (saved as Language) || 'EN';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEYS.LANG, lang);
  };

  // Current authenticated user (default to student s_niyazkhan or null)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Initial login default is null (user starts at login page)
    return null;
  });

  // Current active navigation path
  const [activePath, setActivePath] = useState<string>('dashboard');

  // State data
  const [users] = useState<User[]>(USERS);
  const [courses] = useState<Course[]>(COURSES);
  const [enrollments] = useState<Enrollment[]>(ENROLLMENTS);

  const [classSessions, setClassSessions] = useState<ClassSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return saved ? JSON.parse(saved) : CLASS_SESSIONS;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE_RECORDS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Security Lockout State
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState<number>(0);

  // Sync to local storage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(classSessions));
  }, [classSessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemainingSeconds]);

  // Translation helper
  const t = (key: any, params?: Record<string, string | number>) => {
    return getTranslation(language, key, params);
  };

  // Add audit log entry
  const addAuditLog = (
    action: AuditActionType,
    details: string,
    status: 'SUCCESS' | 'WARNING' | 'ERROR',
    customUsername?: string
  ) => {
    const now = new Date();
    const formatted = now.toISOString().replace('T', ' ').substring(0, 19);
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: formatted,
      username: customUsername || currentUser?.username || 'anonymous',
      role: currentUser?.role || 'GUEST',
      action,
      details,
      ipAddress: '10.150.' + Math.floor(Math.random() * 5 + 1) + '.' + Math.floor(Math.random() * 200 + 10),
      status,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // Authentication Flow
  const login = (loginInput: string, passwordInput: string) => {
    // If locked out
    if (lockoutRemainingSeconds > 0) {
      return { success: false, locked: true };
    }

    const trimmedLogin = loginInput.trim().toLowerCase();

    // Empty fields check
    if (!trimmedLogin || !passwordInput) {
      return { success: false, errorKey: 'invalidCredentials' };
    }

    // Match user
    const foundUser = users.find((u) => u.username.toLowerCase() === trimmedLogin);

    // Validate password (demo password: Demo2026!)
    if (!foundUser || passwordInput !== DEMO_PASSWORD) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      addAuditLog(
        'LOGIN_FAILURE',
        `Failed authentication attempt for username '${trimmedLogin}'. Incorrect password or unknown user.`,
        'ERROR',
        trimmedLogin || 'anonymous'
      );

      if (newAttempts >= 5) {
        setLockoutRemainingSeconds(30);
        addAuditLog(
          'ACCOUNT_LOCKED',
          `Security lockout triggered for username '${trimmedLogin}' after 5 consecutive failed attempts. Locked for 30s.`,
          'ERROR',
          trimmedLogin || 'anonymous'
        );
        return { success: false, locked: true };
      }

      return { success: false, errorKey: 'invalidCredentials' };
    }

    // Success
    setFailedAttempts(0);
    setCurrentUser(foundUser);
    setActivePath('dashboard');

    addAuditLog(
      'LOGIN_SUCCESS',
      `User ${foundUser.fullName} (${foundUser.username}) authenticated successfully as ${foundUser.role}.`,
      'SUCCESS',
      foundUser.username
    );

    return { success: true };
  };

  const logout = () => {
    if (currentUser) {
      addAuditLog(
        'LOGOUT',
        `User ${currentUser.fullName} (${currentUser.username}) signed out of the portal.`,
        'SUCCESS',
        currentUser.username
      );
    }
    setCurrentUser(null);
    setActivePath('dashboard');
  };

  // Student Attendance Calculations
  const getStudentAttendanceRate = (studentId: string, courseCode: string) => {
    // Total sessions up to active session (sessions 1 to 8)
    const passedSessions = classSessions.filter((s) => s.courseCode === courseCode && s.sessionNumber <= 8);
    const total = passedSessions.length || 1;

    // Attended sessions with status PRESENT
    const attended = attendanceRecords.filter(
      (r) =>
        r.studentId === studentId &&
        r.courseCode === courseCode &&
        r.verificationStatus === 'PRESENT'
    ).length;

    const percentage = Math.round((attended / total) * 100);
    const isAtRisk = percentage < 80;

    return { attended, total, percentage, isAtRisk };
  };

  // Hero GPS Check-in
  const checkInGPS = (
    sessionId: string,
    latitude: number,
    longitude: number,
    isDrift: boolean = false
  ): CheckInResult => {
    if (!currentUser) {
      return { status: 'REJECTED_NOT_ENROLLED', message: 'User not logged in' };
    }

    const session = classSessions.find((s) => s.id === sessionId);
    if (!session) {
      return { status: 'REJECTED_CLOSED', message: 'Class session not found.' };
    }

    // 1. Session Status Check
    if (session.status !== 'OPEN') {
      addAuditLog(
        'CHECK_IN_REJECTED',
        `Check-in rejected for ${currentUser.username}: ${session.courseCode} Session #${session.sessionNumber} is currently CLOSED.`,
        'ERROR'
      );
      return {
        status: 'REJECTED_CLOSED',
        message: `Check-in window is currently closed for ${session.courseCode} ${session.title}.`,
      };
    }

    // 2. Enrollment Check
    const isEnrolled = enrollments.some(
      (e) => e.studentId === currentUser.id && e.courseCode === session.courseCode && e.status === 'Approved'
    );
    if (!isEnrolled) {
      addAuditLog(
        'CHECK_IN_REJECTED',
        `Check-in rejected for ${currentUser.username}: Student is NOT enrolled in course ${session.courseCode}.`,
        'ERROR'
      );
      return {
        status: 'REJECTED_NOT_ENROLLED',
        message: `You are not officially registered in ${session.courseCode} ${session.title}.`,
      };
    }

    // 3. Duplicate Check: Unique rule on (session_id, student_id)
    const existingRecord = attendanceRecords.find(
      (r) => r.sessionId === sessionId && r.studentId === currentUser.id
    );
    if (existingRecord) {
      return {
        status: 'ALREADY_CHECKED_IN',
        message: `You have already checked in for this session (${existingRecord.verificationStatus} at ${existingRecord.checkInTime}).`,
        record: existingRecord,
      };
    }

    // 4. Distance Calculation using Haversine
    const distanceM = calculateHaversineDistance(
      latitude,
      longitude,
      session.centerLat,
      session.centerLng
    );

    const now = new Date();
    const formattedTime = now.toISOString().replace('T', ' ').substring(0, 19);

    // 5. Indoor GPS Drift Handler
    if (isDrift) {
      const driftRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        sessionId: session.id,
        courseCode: session.courseCode,
        sessionTitle: session.title,
        sessionNumber: session.sessionNumber,
        studentId: currentUser.id,
        studentName: currentUser.fullName,
        checkInTime: formattedTime,
        gpsLatitude: latitude,
        gpsLongitude: longitude,
        distanceToCenterM: distanceM,
        verificationStatus: 'MANUAL_REVIEW',
        rejectionReason: 'Indoor GPS drift detected (accuracy degraded inside thick masonry)',
        manualReviewNote: 'Student in Hall 301. Signal drift requested manual review.',
      };

      setAttendanceRecords((prev) => [driftRecord, ...prev]);
      addAuditLog(
        'MANUAL_REVIEW_REQUEST',
        `Weak GPS signal for ${currentUser.fullName} (${currentUser.username}). Requested manual review in ${session.courseCode} Hall 301.`,
        'WARNING'
      );

      return {
        status: 'MANUAL_REVIEW_SUBMITTED',
        message: 'Weak GPS signal — Wi-Fi verification (coming in Week 10). Manual review request sent to teacher.',
        distanceM,
        record: driftRecord,
      };
    }

    // 6. Radius Check (150m)
    if (distanceM <= session.allowedCampusRadiusM) {
      const presentRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        sessionId: session.id,
        courseCode: session.courseCode,
        sessionTitle: session.title,
        sessionNumber: session.sessionNumber,
        studentId: currentUser.id,
        studentName: currentUser.fullName,
        checkInTime: formattedTime,
        gpsLatitude: latitude,
        gpsLongitude: longitude,
        distanceToCenterM: distanceM,
        verificationStatus: 'PRESENT',
      };

      setAttendanceRecords((prev) => [presentRecord, ...prev]);
      addAuditLog(
        'GPS_CHECK_IN',
        `Verified GPS check-in for ${currentUser.fullName} in ${session.courseCode} ${session.roomName}. Distance: ${distanceM}m (Allowed: ${session.allowedCampusRadiusM}m). Status: PRESENT`,
        'SUCCESS'
      );

      return {
        status: 'SUCCESS_PRESENT',
        message: `Attendance confirmed! You are verified inside ${session.roomName}.`,
        distanceM,
        record: presentRecord,
      };
    } else {
      // Outside radius rejection
      const rejectedRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        sessionId: session.id,
        courseCode: session.courseCode,
        sessionTitle: session.title,
        sessionNumber: session.sessionNumber,
        studentId: currentUser.id,
        studentName: currentUser.fullName,
        checkInTime: formattedTime,
        gpsLatitude: latitude,
        gpsLongitude: longitude,
        distanceToCenterM: distanceM,
        verificationStatus: 'REJECTED',
        rejectionReason: `Distance ${distanceM}m exceeded campus radius limit (${session.allowedCampusRadiusM}m).`,
      };

      setAttendanceRecords((prev) => [rejectedRecord, ...prev]);
      addAuditLog(
        'CHECK_IN_REJECTED',
        `GPS check-in REJECTED for ${currentUser.fullName} in ${session.courseCode}: distance ${distanceM}m > allowed ${session.allowedCampusRadiusM}m.`,
        'ERROR'
      );

      return {
        status: 'REJECTED_RADIUS',
        message: `Distance ${distanceM} m is outside the allowed campus radius of ${session.allowedCampusRadiusM} m. Check-in rejected.`,
        distanceM,
        record: rejectedRecord,
      };
    }
  };

  // Request manual review explicitly
  const requestManualReview = (sessionId: string, reason: string) => {
    if (!currentUser) return;
    const session = classSessions.find((s) => s.id === sessionId);
    if (!session) return;

    addAuditLog(
      'MANUAL_REVIEW_REQUEST',
      `Manual review requested by ${currentUser.fullName} (${currentUser.username}) for ${session.courseCode}: "${reason}"`,
      'WARNING'
    );
  };

  // Teacher: Toggle Session Status (OPEN / CLOSED)
  const toggleSessionStatus = (sessionId: string) => {
    setClassSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const nextStatus = s.status === 'OPEN' ? 'CLOSED' : 'OPEN';
          addAuditLog(
            'SESSION_STATUS_CHANGED',
            `Session #${s.sessionNumber} (${s.courseCode} - ${s.roomName}) check-in window changed to ${nextStatus} by ${currentUser?.fullName || 'instructor'}.`,
            'SUCCESS'
          );
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  };

  // Teacher: Manual Override with REQUIRED reason
  const overrideAttendance = (
    recordId: string,
    newStatus: VerificationStatus,
    reason: string
  ) => {
    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (r.id === recordId) {
          addAuditLog(
            'MANUAL_OVERRIDE',
            `Teacher manual override on attendance record ${recordId} (${r.studentName}, ${r.courseCode}): Status changed from ${r.verificationStatus} to ${newStatus}. Required Reason: "${reason}" (by ${currentUser?.fullName})`,
            'WARNING'
          );
          return {
            ...r,
            verificationStatus: newStatus,
            isOverride: true,
            overrideBy: currentUser?.fullName || 'Instructor',
            overrideReason: reason,
          };
        }
        return r;
      })
    );
  };

  // Teacher: Create manual attendance for student who didn't check in yet
  const createManualAttendance = (
    sessionId: string,
    studentId: string,
    status: VerificationStatus,
    reason: string
  ) => {
    const student = users.find((u) => u.id === studentId);
    const session = classSessions.find((s) => s.id === sessionId);
    if (!student || !session) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newRecord: AttendanceRecord = {
      id: `att-manual-${Date.now()}`,
      sessionId: session.id,
      courseCode: session.courseCode,
      sessionTitle: session.title,
      sessionNumber: session.sessionNumber,
      studentId: student.id,
      studentName: student.fullName,
      checkInTime: now,
      gpsLatitude: session.centerLat,
      gpsLongitude: session.centerLng,
      distanceToCenterM: 0,
      verificationStatus: status,
      isOverride: true,
      overrideBy: currentUser?.fullName || 'Ainur Issabek',
      overrideReason: reason,
    };

    setAttendanceRecords((prev) => [newRecord, ...prev]);
    addAuditLog(
      'MANUAL_OVERRIDE',
      `Manual attendance entry added for ${student.fullName} in ${session.courseCode} Session #${session.sessionNumber}: Set to ${status}. Reason: "${reason}" (by ${currentUser?.fullName})`,
      'WARNING'
    );
  };

  // Manager: Send Early Warning notice
  const sendEarlyWarningNotice = (studentId: string, courseCode: string) => {
    const student = users.find((u) => u.id === studentId);
    if (!student) return { success: false, message: 'Student not found' };

    const rate = getStudentAttendanceRate(studentId, courseCode);
    const details = `Dispatched early warning notification to ${student.fullName} (${student.email}, ${student.phone || 'SMS'}). Current attendance: ${rate.percentage}% (${rate.attended}/${rate.total} classes), below the mandatory 80% KBTU threshold.`;

    addAuditLog('EARLY_WARNING_SENT', details, 'WARNING');

    return {
      success: true,
      message: `Early warning alert delivered to ${student.fullName} (${student.email}) and SMS sent!`,
    };
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        language,
        setLanguage,
        users,
        courses,
        classSessions,
        attendanceRecords,
        enrollments,
        auditLogs,
        failedAttempts,
        lockoutRemainingSeconds,
        activePath,
        setActivePath,
        login,
        logout,
        checkInGPS,
        requestManualReview,
        toggleSessionStatus,
        overrideAttendance,
        createManualAttendance,
        sendEarlyWarningNotice,
        addAuditLog,
        t,
        getStudentAttendanceRate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
