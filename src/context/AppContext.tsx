import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
} from '../data/mockData';
import { calculateHaversineDistance, KBTU_HALL_301_COORDS } from '../utils/geo';
import { attendanceApi, isApiConfigured, ServerRecord } from '../api/attendanceApi';
import { getTranslation } from '../utils/i18n';
import { checkPassword } from '../utils/passwordPolicy';
import {
  forgetThisDevice,
  getCredential,
  hasPassword,
  hasRememberedDevice,
  isPasswordReused,
  rememberThisDevice,
  restoreRememberedUser,
  savePassword,
  verifyPassword,
} from '../utils/credentials';
import { isPasswordExpired, semesterOf } from '../utils/passwordExpiry';
import {
  clearLoginFailures,
  getLockRemainingSeconds,
  LOCKOUT_SECONDS,
  MAX_FAILED_ATTEMPTS,
  registerLoginFailure,
} from '../utils/loginLockout';

export type TimeSimulationMode =
  | 'DURING_LESSON'
  | 'DURING_LESSON_H1'
  | 'DURING_LESSON_H2'
  | 'DURING_LESSON_H3'
  | 'BEFORE_LESSON'
  | 'AFTER_LESSON'
  | 'REAL_TIME';

export interface LessonTimeCheck {
  active: boolean;
  currentDay: string;
  currentTime: string;
  scheduledDay: string;
  scheduledTime: string;
  currentHourSlot?: 1 | 2 | 3;
  reason?: string;
}

interface PasswordResult {
  success: boolean;
  /** Human-readable reasons, shown under the form. */
  errors: string[];
}

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
  /** False only while a remembered device is being checked at start-up (avoids flashing the login page). */
  authReady: boolean;
  /** Set when the password was created in an earlier semester (students): the user must choose a new one. */
  passwordChangeInfo: { setIn: string; current: string } | null;
  idleLoggedOut: boolean;
  login: (
    loginInput: string,
    passwordInput: string,
    remember?: boolean
  ) => Promise<{ success: boolean; errorKey?: string; locked?: boolean }>;
  /** True when the account already has its own password. False = first login, the user must create one. */
  isAccountActivated: (loginInput: string) => boolean;
  /** First login: the user creates their own password and is signed in. */
  activateAccount: (
    loginInput: string,
    newPassword: string,
    confirmPassword: string,
    remember?: boolean
  ) => Promise<PasswordResult>;
  /** Signed-in user changes the password. Needs the current one; the new one must not resemble it. */
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<PasswordResult>;
  logout: () => void;
  checkInGPS: (sessionId: string, latitude: number, longitude: number, isDrift?: boolean, hourSlot?: 1 | 2 | 3) => CheckInResult;
  /** Same as checkInGPS, but saves to the server (PostgreSQL) when it is online. */
  checkInGPSAsync: (sessionId: string, latitude: number, longitude: number, isDrift?: boolean, hourSlot?: 1 | 2 | 3) => Promise<CheckInResult>;
  /** true = the website is connected to the server, false = data only in this browser. */
  serverOnline: boolean;
  isApiConfigured: boolean;
  refreshFromServer: () => Promise<void>;
  requestManualReview: (sessionId: string, reason: string) => void;
  toggleSessionStatus: (sessionId: string) => void;
  overrideAttendance: (recordId: string, newStatus: VerificationStatus, reason: string) => void;
  createManualAttendance: (sessionId: string, studentId: string, status: VerificationStatus, reason: string, hourSlot?: 1 | 2 | 3) => void;
  sendEarlyWarningNotice: (studentId: string, courseCode: string) => { success: boolean; message: string };
  addAuditLog: (action: AuditActionType, details: string, status: 'SUCCESS' | 'WARNING' | 'ERROR', username?: string) => void;
  t: (key: any, params?: Record<string, string | number>) => string;
  getStudentAttendanceRate: (studentId: string, courseCode: string) => { attended: number; total: number; percentage: number; isAtRisk: boolean };
  timeSimulationMode: TimeSimulationMode;
  setTimeSimulationMode: (mode: TimeSimulationMode) => void;
  checkSessionTime: (sessionId: string) => LessonTimeCheck;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'kbtu_ums_current_user',
  LANG: 'kbtu_ums_language',
  SESSIONS: 'kbtu_ums_sessions',
  ATTENDANCE: 'kbtu_ums_attendance',
  AUDIT: 'kbtu_ums_audit_logs',
};
// Automatic sign-out after this much time without any mouse / keyboard / touch activity.
// For a quick demo temporarily set it to 0.2 (about 12 seconds).
const IDLE_TIMEOUT_MINUTES = 15;
const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000;

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

  // Signed-in user. Only the username lives in sessionStorage (gone when the tab/browser closes);
  // the user object is always rebuilt from USERS, so a stored role can never be trusted.
  // Staying signed in across restarts needs the explicit "keep me signed in" choice (see below).
  const [sessionUser] = useState<User | null>(() => {
    try {
      const name = sessionStorage.getItem(STORAGE_KEYS.USER);
      return (name && USERS.find((u) => u.username === name)) || null;
    } catch {
      return null;
    }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(sessionUser);

  // false while a remembered device is checked at start-up
  const [authReady, setAuthReady] = useState<boolean>(() => sessionUser !== null || !hasRememberedDevice());

  // Re-render trigger after a password change (the "must change" flag is derived from the stored record).
  const [, bumpCredentials] = useState(0);

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

  // Test time: lets us try the hourly check-in at any time of day (saved in this browser).
  const [timeSimulationMode, setTimeSimulationModeState] = useState<TimeSimulationMode>(() => {
    try {
      return (localStorage.getItem('kbtu_ums_time_mode') as TimeSimulationMode) || 'REAL_TIME';
    } catch {
      return 'REAL_TIME';
    }
  });
  const setTimeSimulationMode = (mode: TimeSimulationMode) => {
    setTimeSimulationModeState(mode);
    try {
      localStorage.setItem('kbtu_ums_time_mode', mode);
    } catch {
      // storage blocked: the choice works until the page is reloaded
    }
  };

  const checkSessionTime = (sessionId: string): LessonTimeCheck => {
    const session = classSessions.find((s) => s.id === sessionId);
    const scheduledDay = session?.dayOfWeek || 'Monday';
    const scheduledTime = session ? `${session.startTime} – ${session.endTime}` : '16:00 – 19:00';

    let currentDay = 'Monday';
    let currentTime = '16:30';

    if (timeSimulationMode === 'DURING_LESSON' || timeSimulationMode === 'DURING_LESSON_H1') {
      currentDay = scheduledDay;
      currentTime = '16:25';
    } else if (timeSimulationMode === 'DURING_LESSON_H2') {
      currentDay = scheduledDay;
      currentTime = '17:25';
    } else if (timeSimulationMode === 'DURING_LESSON_H3') {
      currentDay = scheduledDay;
      currentTime = '18:25';
    } else if (timeSimulationMode === 'BEFORE_LESSON') {
      currentDay = scheduledDay;
      currentTime = '15:15';
    } else if (timeSimulationMode === 'AFTER_LESSON') {
      currentDay = scheduledDay;
      currentTime = '19:45';
    } else if (timeSimulationMode === 'REAL_TIME') {
      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      currentDay = days[now.getDay()];
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      currentTime = `${hours}:${minutes}`;
    }

    const isDayMatch = currentDay.toLowerCase() === scheduledDay.toLowerCase();
    const startTime = session?.startTime || '16:00';
    const endTime = session?.endTime || '19:00';
    const isTimeMatch = currentTime >= startTime && currentTime <= endTime;
    const active = isDayMatch && isTimeMatch;

    let currentHourSlot: 1 | 2 | 3 | undefined = undefined;
    if (active) {
      if (currentTime < '17:00') currentHourSlot = 1;
      else if (currentTime < '18:00') currentHourSlot = 2;
      else currentHourSlot = 3;
    }

    let reason: string | undefined = undefined;
    if (!active) {
      if (!isDayMatch) {
        reason = `Занятие проводится только в ${scheduledDay}. Текущий день: ${currentDay}.`;
      } else if (currentTime < startTime) {
        reason = `Занятие еще не началось (начало в ${startTime}). Текущее время: ${currentTime}.`;
      } else {
        reason = `Занятие завершено (проводилось до ${endTime}). Текущее время: ${currentTime}.`;
      }
    }

    return {
      active,
      currentDay,
      currentTime,
      scheduledDay,
      scheduledTime,
      currentHourSlot,
      reason,
    };
  };

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
  // Set when the user was signed out because of inactivity (cleared on the next sign-in)
  const [idleLoggedOut, setIdleLoggedOut] = useState(false);

  // Older versions stored the whole user (with the role) in localStorage: remove that leftover once.
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }, []);

  // Keep the tab session in sync (username only)
  useEffect(() => {
    try {
      if (currentUser) sessionStorage.setItem(STORAGE_KEYS.USER, currentUser.username);
      else sessionStorage.removeItem(STORAGE_KEYS.USER);
    } catch {
      // storage can be blocked: the user simply has to sign in again
    }
  }, [currentUser]);

  // Auto sign-in on a device where the user ticked "keep me signed in"
  useEffect(() => {
    if (authReady) return;
    let cancelled = false;
    restoreRememberedUser().then((username) => {
      if (cancelled) return;
      const user = username ? USERS.find((u) => u.username === username) : undefined;
      if (user) {
        setCurrentUser(user);
        addAuditLog(
          'LOGIN_SUCCESS',
          `User ${user.fullName} (${user.username}) signed in automatically on a remembered device.`,
          'SUCCESS',
          user.username
        );
      }
      setAuthReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(classSessions));
  }, [classSessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
  }, [auditLogs]);

  // ---------------------------------------------------------------------------
  // Server (PostgreSQL) mode: every-hour tracker.
  // When VITE_API_URL is set and the server answers, check-ins are saved in the
  // database and every device sees the same data (refreshed every 4 seconds).
  // Without a server the website works as before, with data in this browser.
  // ---------------------------------------------------------------------------
  const [serverOnline, setServerOnline] = useState(false);
  const syncing = useRef(false);

  /** Turns a database row into the record format the pages already use. */
  const fromServer = (r: ServerRecord): AttendanceRecord | null => {
    const student = USERS.find((u) => u.studentId === r.student_id);
    const session = CLASS_SESSIONS.find((s) => s.id === r.session_id);
    if (!student || !session) return null;
    return {
      id: `db-${r.attendance_id}`,
      sessionId: r.session_id,
      courseCode: session.courseCode,
      sessionTitle: session.title,
      sessionNumber: session.sessionNumber,
      studentId: student.id,
      studentName: student.fullName,
      checkInTime: r.check_in_time,
      gpsLatitude: r.gps_latitude,
      gpsLongitude: r.gps_longitude,
      distanceToCenterM: r.distance_to_center_m,
      verificationStatus: r.verification_status,
      rejectionReason: r.rejection_reason ?? undefined,
      isOverride: r.is_override,
      overrideBy: r.override_by ?? undefined,
      overrideReason: r.override_reason ?? undefined,
      hourSlot: r.hour_slot,
    };
  };

  const refreshFromServer = useCallback(async () => {
    if (!isApiConfigured || syncing.current) return;
    syncing.current = true;
    try {
      const [rec, ses] = await Promise.all([attendanceApi.records(), attendanceApi.sessions()]);
      const records = rec.body.records.map(fromServer).filter((r): r is AttendanceRecord => r !== null);
      const statusById = new Map(ses.body.sessions.map((x) => [x.session_id, x.status]));
      setAttendanceRecords(records);
      setClassSessions((prev) => prev.map((s) => (statusById.has(s.id) ? { ...s, status: statusById.get(s.id)! } : s)));
      setServerOnline(true);
    } catch {
      setServerOnline(false); // server is off: keep showing the data of this browser
    } finally {
      syncing.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isApiConfigured) return;
    refreshFromServer();
    const timer = window.setInterval(refreshFromServer, 4000);
    return () => window.clearInterval(timer);
  }, [refreshFromServer]);

  /** Lesson time to send to the server: the clock time now (or the simulated time) on the
   *  lesson's date. The website checks only the weekday and the time (Mon 16:00-19:00), and
   *  the sample lesson ses-8 is fixed to 02.11, so the date of the lesson is used.
   *  This needs ALLOW_DEMO_TIME=true on the server. A real system creates a lesson for
   *  today and lets the server use its own clock. */
  const lessonTimeFor = (sessionId: string): string | undefined => {
    const session = classSessions.find((s) => s.id === sessionId);
    return session ? `${session.date} ${checkSessionTime(sessionId).currentTime}` : undefined;
  };

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
  const findUser = (loginInput: string) => {
    const trimmed = loginInput.trim().toLowerCase();
    return users.find((u) => u.username.toLowerCase() === trimmed);
  };

  const isAccountActivated = (loginInput: string) => hasPassword(loginInput);

  // Students keep one password per semester: if the password was set in an earlier semester, a new one is required.
  const passwordChangeInfo = (() => {
    if (!currentUser) return null;
    const record = getCredential(currentUser.username);
    if (!record || !isPasswordExpired(currentUser.role, record.updatedAt)) return null;
    return { setIn: semesterOf(new Date(record.updatedAt)), current: semesterOf(new Date()) };
  })();

  /** Applies the "keep me signed in on this device" choice made on the sign-in form. */
  const applyRememberChoice = async (username: string, remember: boolean) => {
    if (remember) await rememberThisDevice(username);
    else await forgetThisDevice();
  };

  const login = async (loginInput: string, passwordInput: string, remember = false) => {
    const trimmedLogin = loginInput.trim().toLowerCase();

    // Empty fields check
    if (!trimmedLogin || !passwordInput) {
      return { success: false, errorKey: 'invalidCredentials' };
    }

    // The lock is stored per login in localStorage, so refreshing the page does not remove it.
    const lockedFor = getLockRemainingSeconds(trimmedLogin);
    if (lockedFor > 0) {
      setLockoutRemainingSeconds(lockedFor);
      return { success: false, locked: true };
    }

    // Match user and check the password against the stored salted hash.
    // An account without its own password can never log in here (it has to be activated first).
    const foundUser = findUser(trimmedLogin);
    const record = foundUser ? getCredential(foundUser.username) : undefined;
    const passwordOk = record ? await verifyPassword(record, passwordInput) : false;

    if (!foundUser || !passwordOk) {
      const failure = registerLoginFailure(trimmedLogin);
      setFailedAttempts(failure.attempts);

      addAuditLog(
        'LOGIN_FAILURE',
        `Failed authentication attempt for username '${trimmedLogin}'. Incorrect password or unknown user.`,
        'ERROR',
        trimmedLogin || 'anonymous'
      );

      if (failure.locked) {
        setLockoutRemainingSeconds(failure.remainingSeconds);
        addAuditLog(
          'ACCOUNT_LOCKED',
          `Security lockout triggered for username '${trimmedLogin}' after ${MAX_FAILED_ATTEMPTS} consecutive failed attempts. Locked for ${LOCKOUT_SECONDS}s.`,
          'ERROR',
          trimmedLogin || 'anonymous'
        );
        return { success: false, locked: true };
      }

      return { success: false, errorKey: 'invalidCredentials' };
    }

    // Success
    await applyRememberChoice(foundUser.username, remember);
    clearLoginFailures(foundUser.username);
    setFailedAttempts(0);
    setIdleLoggedOut(false);
    setCurrentUser(foundUser);
    setActivePath('dashboard');

    addAuditLog(
      'LOGIN_SUCCESS',
      `User ${foundUser.fullName} (${foundUser.username}) authenticated successfully as ${foundUser.role}${
        remember ? ' (kept signed in on this device)' : ''
      }.`,
      'SUCCESS',
      foundUser.username
    );

    return { success: true };
  };

  const activateAccount = async (
    loginInput: string,
    newPassword: string,
    confirmPassword: string,
    remember = false
  ): Promise<PasswordResult> => {
    const user = findUser(loginInput);
    if (!user) return { success: false, errors: ['Unknown account.'] };
    if (hasPassword(user.username)) {
      return { success: false, errors: ['This account already has a password. Please sign in.'] };
    }
    if (newPassword !== confirmPassword) {
      return { success: false, errors: ['The two passwords do not match.'] };
    }
    const check = checkPassword(newPassword, user);
    if (!check.ok) return { success: false, errors: check.errors };

    await savePassword(user.username, newPassword);
    addAuditLog(
      'PASSWORD_SET',
      `${user.fullName} (${user.username}) created their own password at first login.`,
      'SUCCESS',
      user.username
    );

    await applyRememberChoice(user.username, remember);
    clearLoginFailures(user.username);
    setFailedAttempts(0);
    setIdleLoggedOut(false);
    setCurrentUser(user);
    setActivePath('dashboard');
    addAuditLog(
      'LOGIN_SUCCESS',
      `User ${user.fullName} (${user.username}) authenticated successfully as ${user.role}.`,
      'SUCCESS',
      user.username
    );
    return { success: true, errors: [] };
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<PasswordResult> => {
    if (!currentUser) return { success: false, errors: ['You must be signed in.'] };
    const record = getCredential(currentUser.username);
    if (!record) return { success: false, errors: ['This account has no password yet.'] };

    if (!(await verifyPassword(record, currentPassword))) {
      addAuditLog(
        'PASSWORD_CHANGE_FAILED',
        `Password change refused for ${currentUser.username}: current password was incorrect.`,
        'WARNING'
      );
      return { success: false, errors: ['The current password is incorrect.'] };
    }
    if (newPassword !== confirmPassword) {
      return { success: false, errors: ['The two new passwords do not match.'] };
    }

    const check = checkPassword(newPassword, { ...currentUser, previousPassword: currentPassword });
    if (!check.ok) return { success: false, errors: check.errors };

    if (await isPasswordReused(record, newPassword)) {
      return { success: false, errors: ['This password was already used. Choose one you have not used recently.'] };
    }

    // Saving a new password revokes every "keep me signed in" token. This device keeps its own choice.
    const keepThisDevice = hasRememberedDevice();
    const semesterRenewal = passwordChangeInfo !== null;
    await savePassword(currentUser.username, newPassword);
    if (keepThisDevice) await rememberThisDevice(currentUser.username);
    bumpCredentials((n) => n + 1);

    addAuditLog(
      'PASSWORD_CHANGED',
      `${currentUser.fullName} (${currentUser.username}) changed their password${
        semesterRenewal ? ` (required new-semester change, ${passwordChangeInfo?.current})` : ''
      }. Other devices were signed out of "keep me signed in".`,
      'SUCCESS'
    );
    return { success: true, errors: [] };
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
    void forgetThisDevice(); // signing out switches auto sign-in off on this device
    setCurrentUser(null);
    setActivePath('dashboard');
  };

  // Automatic sign-out after inactivity: recorded in the audit log, and this device stops auto sign-in.
  const idleLogout = () => {
    if (!currentUser) return;
    addAuditLog(
      'SESSION_TIMEOUT',
      `User ${currentUser.fullName} (${currentUser.username}) was signed out automatically after ${IDLE_TIMEOUT_MINUTES} minutes of inactivity.`,
      'WARNING',
      currentUser.username
    );
    void forgetThisDevice();
    setIdleLoggedOut(true);
    setCurrentUser(null);
    setActivePath('dashboard');
  };

  // Watch for activity while somebody is signed in (each browser tab has its own session)
  useEffect(() => {
    if (!currentUser) return;

    let lastActivity = Date.now();
    const markActive = () => {
      lastActivity = Date.now();
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((name) => window.addEventListener(name, markActive, { passive: true }));

    const timer = setInterval(() => {
      if (Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
        clearInterval(timer);
        idleLogout();
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      events.forEach((name) => window.removeEventListener(name, markActive));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Student Attendance Calculations (including hourly marks for 3-hour sessions)
  const getStudentAttendanceRate = (studentId: string, courseCode: string) => {
    const passedSessions = classSessions.filter((s) => s.courseCode === courseCode && s.sessionNumber <= 8);
    let totalPoints = 0;
    let attendedPoints = 0;

    for (const session of passedSessions) {
      const is3HourSession = session.startTime === '16:00' && session.endTime === '19:00';
      if (is3HourSession && session.sessionNumber === 8) {
        totalPoints += 3;
        const attendedHours = attendanceRecords.filter(
          (r) => r.sessionId === session.id && r.studentId === studentId && r.verificationStatus === 'PRESENT'
        ).length;
        attendedPoints += Math.min(3, attendedHours);
      } else {
        totalPoints += 1;
        const attended = attendanceRecords.some(
          (r) => r.sessionId === session.id && r.studentId === studentId && r.verificationStatus === 'PRESENT'
        );
        if (attended) attendedPoints += 1;
      }
    }

    const total = totalPoints || 1;
    const attended = attendedPoints;
    const percentage = Math.round((attended / total) * 100);
    const isAtRisk = percentage < 80;

    return { attended, total, percentage, isAtRisk };
  };

  // Hero GPS Check-in
  const checkInGPS = (
    sessionId: string,
    latitude: number,
    longitude: number,
    isDrift: boolean = false,
    hourSlot?: 1 | 2 | 3
  ): CheckInResult => {
    if (!currentUser) {
      return { status: 'REJECTED_NOT_ENROLLED', message: 'User not logged in' };
    }

    const session = classSessions.find((s) => s.id === sessionId);
    if (!session) {
      return { status: 'REJECTED_CLOSED', message: 'Class session not found.' };
    }

    // 0. Lesson Time Window Check (e.g. Monday/Tuesday 16:00 - 19:00)
    const timeCheck = checkSessionTime(session.id);
    if (!timeCheck.active) {
      addAuditLog(
        'CHECK_IN_REJECTED',
        `Check-in rejected for ${currentUser.username} in ${session.courseCode}: outside scheduled lesson hours (${timeCheck.currentDay} ${timeCheck.currentTime}, scheduled: ${timeCheck.scheduledDay} ${timeCheck.scheduledTime}).`,
        'ERROR'
      );
      return {
        status: 'REJECTED_CLOSED',
        message: `Отметка посещаемости доступна ТОЛЬКО во время урока (${timeCheck.scheduledDay} ${timeCheck.scheduledTime}). ${timeCheck.reason || ''}`,
      };
    }

    const targetHourSlot: 1 | 2 | 3 = hourSlot || timeCheck.currentHourSlot || 1;

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

    // 3. Duplicate Check: Unique rule on (session_id, student_id, hourSlot)
    const existingRecord = attendanceRecords.find(
      (r) => r.sessionId === sessionId && r.studentId === currentUser.id && (r.hourSlot || 1) === targetHourSlot
    );
    if (existingRecord) {
      return {
        status: 'ALREADY_CHECKED_IN',
        message: `Вы уже отметились за Час ${targetHourSlot} (${existingRecord.verificationStatus} в ${existingRecord.checkInTime.substring(11, 19)}).`,
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
        hourSlot: targetHourSlot,
        verificationStatus: 'MANUAL_REVIEW',
        rejectionReason: 'Indoor GPS drift detected (accuracy degraded inside thick masonry)',
        manualReviewNote: `Student in ${session.roomName}. Signal drift requested manual review for Hour ${targetHourSlot}.`,
      };

      setAttendanceRecords((prev) => [driftRecord, ...prev]);
      addAuditLog(
        'MANUAL_REVIEW_REQUEST',
        `Weak GPS signal for ${currentUser.fullName} (${currentUser.username}). Requested manual review in ${session.courseCode} ${session.roomName} (Час ${targetHourSlot}).`,
        'WARNING'
      );

      return {
        status: 'MANUAL_REVIEW_SUBMITTED',
        message: `Слабый GPS-сигнал — запрос на ручную проверку за Час ${targetHourSlot} отправлен преподавателю.`,
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
        hourSlot: targetHourSlot,
        verificationStatus: 'PRESENT',
      };

      setAttendanceRecords((prev) => [presentRecord, ...prev]);
      addAuditLog(
        'GPS_CHECK_IN',
        `Verified GPS check-in for ${currentUser.fullName} in ${session.courseCode} ${session.roomName} (Час ${targetHourSlot}). Distance: ${distanceM}m (Allowed: ${session.allowedCampusRadiusM}m). Status: PRESENT`,
        'SUCCESS'
      );

      return {
        status: 'SUCCESS_PRESENT',
        message: `Посещаемость за Час ${targetHourSlot} подтверждена! Вы верифицированы внутри ${session.roomName}.`,
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
        hourSlot: targetHourSlot,
        verificationStatus: 'REJECTED',
        rejectionReason: `Distance ${distanceM}m exceeded campus radius limit (${session.allowedCampusRadiusM}m).`,
      };

      setAttendanceRecords((prev) => [rejectedRecord, ...prev]);
      addAuditLog(
        'CHECK_IN_REJECTED',
        `GPS check-in REJECTED for ${currentUser.fullName} in ${session.courseCode} (Час ${targetHourSlot}): distance ${distanceM}m > allowed ${session.allowedCampusRadiusM}m.`,
        'ERROR'
      );

      return {
        status: 'REJECTED_RADIUS',
        message: `Дистанция ${distanceM} м находится вне допустимого радиуса кампуса (${session.allowedCampusRadiusM} м). Отметка за Час ${targetHourSlot} отклонена.`,
        distanceM,
        record: rejectedRecord,
      };
    }
  };

  // Check-in through the server when it is online, otherwise the old local check-in
  const checkInGPSAsync = async (
    sessionId: string,
    latitude: number,
    longitude: number,
    isDrift: boolean = false,
    hourSlot?: 1 | 2 | 3
  ): Promise<CheckInResult> => {
    if (!serverOnline || !currentUser?.studentId) {
      return checkInGPS(sessionId, latitude, longitude, isDrift, hourSlot);
    }
    try {
      const { body } = await attendanceApi.checkIn({
        sessionId,
        studentId: currentUser.studentId,
        latitude,
        longitude,
        time: lessonTimeFor(sessionId),
        weakSignal: isDrift || undefined,
      });
      const ok = body.status === 'SUCCESS_PRESENT' || body.status === 'MANUAL_REVIEW_SUBMITTED';
      addAuditLog(
        ok ? 'GPS_CHECK_IN' : 'CHECK_IN_REJECTED',
        `[server] ${currentUser.fullName} ${sessionId} hour ${body.hourSlot ?? '-'}: ${body.status}. ${body.message}`,
        ok ? 'SUCCESS' : 'ERROR'
      );
      await refreshFromServer();
      const known = ['SUCCESS_PRESENT', 'REJECTED_RADIUS', 'REJECTED_NOT_ENROLLED', 'REJECTED_CLOSED', 'ALREADY_CHECKED_IN', 'MANUAL_REVIEW_SUBMITTED'];
      return {
        status: (known.includes(body.status) ? body.status : 'REJECTED_CLOSED') as CheckInResult['status'],
        message: body.message,
        distanceM: body.distanceM,
      };
    } catch {
      setServerOnline(false);
      return { status: 'REJECTED_CLOSED', message: 'Сервер недоступен. Попробуйте ещё раз через несколько секунд.' };
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
    if (serverOnline) {
      const current = classSessions.find((s) => s.id === sessionId);
      const next = current?.status === 'OPEN' ? 'CLOSED' : 'OPEN';
      attendanceApi.setSessionStatus(sessionId, next).then(refreshFromServer).catch(() => setServerOnline(false));
    }
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
    const record = attendanceRecords.find((r) => r.id === recordId);
    if (record) {
      const timeCheck = checkSessionTime(record.sessionId);
      if (!timeCheck.active) {
        addAuditLog(
          'MANUAL_OVERRIDE',
          `Teacher override rejected for ${record.studentName}: Outside scheduled lesson hours (${timeCheck.currentDay} ${timeCheck.currentTime}, scheduled: ${timeCheck.scheduledDay} ${timeCheck.scheduledTime}).`,
          'ERROR'
        );
        return;
      }
    }

    if (serverOnline && record) {
      const student = USERS.find((u) => u.id === record.studentId);
      if (student?.studentId) {
        attendanceApi
          .override({
            sessionId: record.sessionId,
            studentId: student.studentId,
            hourSlot: record.hourSlot || 1,
            status: newStatus,
            reason,
            teacher: currentUser?.fullName || 'Instructor',
          })
          .then(refreshFromServer)
          .catch(() => setServerOnline(false));
      }
    }

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
    reason: string,
    hourSlot: 1 | 2 | 3 = 1
  ) => {
    const student = users.find((u) => u.id === studentId);
    const session = classSessions.find((s) => s.id === sessionId);
    if (!student || !session) return;

    const timeCheck = checkSessionTime(sessionId);
    if (!timeCheck.active) {
      addAuditLog(
        'CHECK_IN_REJECTED',
        `Teacher manual attendance entry rejected: Outside scheduled lesson hours (${timeCheck.currentDay} ${timeCheck.currentTime}, scheduled: ${timeCheck.scheduledDay} ${timeCheck.scheduledTime}).`,
        'ERROR'
      );
      return;
    }

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
      hourSlot,
      verificationStatus: status,
      isOverride: true,
      overrideBy: currentUser?.fullName || 'Ainur Issabek',
      overrideReason: reason,
    };

    if (serverOnline && student.studentId) {
      attendanceApi
        .override({
          sessionId: session.id,
          studentId: student.studentId,
          hourSlot,
          status,
          reason,
          teacher: currentUser?.fullName || 'Ainur Issabek',
        })
        .then(refreshFromServer)
        .catch(() => setServerOnline(false));
    }

    setAttendanceRecords((prev) => [newRecord, ...prev]);
    addAuditLog(
      'MANUAL_OVERRIDE',
      `Manual attendance entry added for ${student.fullName} in ${session.courseCode} Session #${session.sessionNumber} (Час ${hourSlot}): Set to ${status}. Reason: "${reason}" (by ${currentUser?.fullName})`,
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
        authReady,
        passwordChangeInfo,
        idleLoggedOut,
        login,
        isAccountActivated,
        activateAccount,
        changePassword,
        logout,
        checkInGPS,
        checkInGPSAsync,
        serverOnline,
        isApiConfigured,
        refreshFromServer,
        requestManualReview,
        toggleSessionStatus,
        overrideAttendance,
        createManualAttendance,
        sendEarlyWarningNotice,
        addAuditLog,
        t,
        getStudentAttendanceRate,
        timeSimulationMode,
        setTimeSimulationMode,
        checkSessionTime,
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