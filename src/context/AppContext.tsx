import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ClassSession, Language, VerificationStatus } from '../types';
import { attendanceApi, call, isApiConfigured, sessionToken, setSessionToken } from '../api/attendanceApi';
import { api, type Workspace } from '../api/portalApi';
import { getTranslation } from '../utils/i18n';

export type TimeSimulationMode =
  | 'DURING_LESSON' | 'DURING_LESSON_H1' | 'DURING_LESSON_H2' | 'DURING_LESSON_H3'
  | 'BEFORE_LESSON' | 'AFTER_LESSON' | 'REAL_TIME';

export interface LessonTimeCheck {
  active: boolean;
  currentDay: string;
  currentTime: string;
  scheduledDay: string;
  scheduledTime: string;
  currentHourSlot?: 1 | 2 | 3;
  reason?: string;
}

const emptyWorkspace: Omit<Workspace, 'user' | 'demoTime'> = {
  users: [], courses: [], enrollments: [], classSessions: [], attendanceRecords: [], auditLogs: [], notifications: [],
};
const idleTimeoutMs = 15 * 60 * 1000;
const sessionClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit',
  weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function campusNow() {
  const time = Object.fromEntries(sessionClock.formatToParts().map(({ type, value }) => [type, value]));
  return { date: [time.year, time.month, time.day].join('-'), time: time.hour + ':' + time.minute, weekday: time.weekday };
}

export function selectSession(sessions: ClassSession[], demoTime: boolean) {
  const now = campusNow();
  const today = sessions.filter((session) => session.date === now.date);
  return today.find((session) => session.startTime <= now.time && now.time < session.endTime)
    ?? today.find((session) => session.startTime > now.time)
    ?? today.at(-1)
    ?? (demoTime ? sessions.find((session) => session.status === 'OPEN') : undefined);
}

const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));

function useWorkspace() {
  const [language, setLanguageState] = useState<Language>(() =>
    (localStorage.getItem('kbtu_ums_language') as Language) || 'EN');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [activePath, setActivePath] = useState('dashboard');
  const [authReady, setAuthReady] = useState(!sessionToken());
  const [serverOnline, setServerOnline] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [actionError, setActionError] = useState('');
  const [idleLoggedOut, setIdleLoggedOut] = useState(false);
  const [timeSimulationMode, setTimeSimulationMode] = useState<TimeSimulationMode>('REAL_TIME');
  const pending = useRef<Promise<void> | null>(null);

  const clearSession = useCallback(() => {
    setSessionToken(null);
    setWorkspace(null);
    setActivePath('dashboard');
    setServerOnline(false);
    setTimeSimulationMode('REAL_TIME');
    setActionError('');
  }, []);

  const refreshFromServer = useCallback((): Promise<void> => {
    const token = sessionToken();
    if (!token) return Promise.resolve();
    if (pending.current) return pending.current;
    pending.current = (async () => {
      try {
        const { code, body } = await call<Workspace>('/workspace');
        if (sessionToken() !== token) return;
        if (code === 401) return clearSession();
        if (code !== 200) throw new Error('Could not refresh university data.');
        setWorkspace(body);
        setServerOnline(true);
        setWorkspaceError('');
      } catch {
        if (sessionToken() !== token) return;
        setServerOnline(false);
        setWorkspaceError('Could not load university data. Retrying…');
      } finally {
        pending.current = null;
        setAuthReady(true);
      }
    })();
    return pending.current;
  }, [clearSession]);

  useEffect(() => {
    void refreshFromServer();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refreshFromServer();
    }, 5000);
    window.addEventListener('focus', refreshFromServer);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshFromServer);
    };
  }, [refreshFromServer]);

  const logout = useCallback(() => {
    const request = api('/auth/logout', 'POST');
    clearSession();
    void request.catch(() => undefined);
  }, [clearSession]);

  const userId = workspace?.user.id;
  useEffect(() => {
    if (!userId) return;
    let lastActivity = Date.now();
    const markActive = () => { lastActivity = Date.now(); };
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity >= idleTimeoutMs) {
        setIdleLoggedOut(true);
        logout();
      }
    }, 5000);
    return () => {
      window.clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, markActive));
    };
  }, [userId, logout]);

  const login = async (username: string, password: string, remember: boolean) => {
    try {
      const result = await api<{ token: string }>('/login','POST',{ username, password, remember });
      await pending.current;
      setSessionToken(result.token, remember);
      setIdleLoggedOut(false);
      setActivePath('dashboard');
      await refreshFromServer();
      return { success: true, message: '' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Sign-in failed.' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    if (newPassword !== confirmPassword) return { success: false, errors: ['Passwords do not match.'] };
    try {
      await api('/change-password','POST',{ currentPassword, newPassword }
);
      await pending.current;
      await refreshFromServer();
      return { success: true, errors: [] };
    } catch (error) {
      return { success: false, errors: [error instanceof Error ? error.message : 'Password change failed.'] };
    }
  };

  const data = workspace ?? emptyWorkspace;
  const demoTime = workspace?.demoTime ?? false;
  const currentUser = workspace?.user ?? null;

  const checkSessionTime = (id: string): LessonTimeCheck => {
    const session = data.classSessions.find((item) => item.id === id);
    const now = campusNow();
    const scheduledTime = session ? session.startTime + ' – ' + session.endTime : '—';
    const scheduledDay = session?.dayOfWeek || '—';
    let currentTime = now.time;
    let currentDay = now.weekday;
    const simulated = demoTime && timeSimulationMode !== 'REAL_TIME' && !!session;
    if (simulated && session) {
      const start = minutes(session.startTime);
      const end = minutes(session.endTime);
      const hour = timeSimulationMode === 'DURING_LESSON_H3' ? 2 : timeSimulationMode === 'DURING_LESSON_H2' ? 1 : 0;
      const minute = timeSimulationMode === 'BEFORE_LESSON' ? start - 30
        : timeSimulationMode === 'AFTER_LESSON' ? end + 30 : Math.min(start + hour * 60 + 5, end - 1);
      const clock = (minute + 1440) % 1440;
      currentTime = String(Math.floor(clock / 60)).padStart(2, '0') + ':' + String(clock % 60).padStart(2, '0');
      currentDay = scheduledDay;
    }
    const active = !!session && (simulated || now.date === session.date) &&
      currentTime >= session.startTime && currentTime < session.endTime;
    const slot = active && session ? Math.min(session.trackedHours ?? 1, 1 + Math.floor((minutes(currentTime) - minutes(session.startTime)) / 60)) : undefined;
    return {
      active, currentDay, currentTime, scheduledDay, scheduledTime, currentHourSlot: slot as 1 | 2 | 3 | undefined,
      reason: active ? undefined : 'Check-in is available during the scheduled lesson.',
    };
  };

  const getStudentAttendanceRate = (studentId: string, courseCode: string) => {
    const sessions = data.classSessions.filter((s) => s.courseCode === courseCode && s.completed);
    const ids = new Set(sessions.map((s) => s.id));
    const total = sessions.reduce((sum, session) => sum + (session.trackedHours ?? 1), 0);
    const attended = data.attendanceRecords.filter((r) =>
      r.studentId === studentId && ids.has(r.sessionId) && r.verificationStatus === 'PRESENT').length;
    const percentage = total ? Math.round(100 * attended / total) : 0;
    return { attended, total, percentage, isAtRisk: total > 0 && percentage < 80 };
  };

  const lessonTimeFor = (id: string) => {
    const session = data.classSessions.find((item) => item.id === id);
    return demoTime && timeSimulationMode !== 'REAL_TIME' && session
      ? session.date + ' ' + checkSessionTime(id).currentTime : undefined;
  };

  const mutate = async (path: string, method: string, payload: unknown) => {
    const token = sessionToken();
    setActionError('');
    try {
      const result = await api<{ message?: string }>(path, method, payload);
      if (token === sessionToken()) {
        await pending.current;
        await refreshFromServer();
      }
      return { success: true, message: result.message || 'Saved.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save changes.';
      if (token === sessionToken()) setActionError(message);
      return { success: false, message };
    }
  };
  const refreshAfterWrite = async (token: string | null) => {
    if (token !== sessionToken()) return;
    await pending.current;
    await refreshFromServer();
  };

  const checkInGPSAsync = async (sessionId: string, latitude: number, longitude: number,
    isDrift?: boolean, _hourSlot?: number, accuracy?: number) => {
    if (!currentUser?.studentId) return { status: 'REJECTED_NOT_ENROLLED', message: 'Student account required.' };
    const token = sessionToken();
    try {
      const { body } = await attendanceApi.checkIn({
        sessionId, studentId: currentUser.studentId, latitude, longitude,
        time: lessonTimeFor(sessionId), accuracy, weakSignal: isDrift || undefined,
      });
      await refreshAfterWrite(token);
      return body;
    } catch {
      return { status: 'REJECTED_CLOSED', message: 'Could not connect to the attendance server.' };
    }
  };

  const createManualAttendance = (sessionId: string, studentId: string, status: VerificationStatus, reason: string, hourSlot = 1) =>
    mutate('/override', 'POST', { sessionId, studentId, hourSlot, status, reason });

  return {
    ...data, currentUser, activePath, setActivePath, authReady, serverOnline, workspaceError,
    actionError, setActionError, isApiConfigured, demoTime, idleLoggedOut, login, logout, changePassword,
    timeSimulationMode, setTimeSimulationMode, checkSessionTime, getStudentAttendanceRate,
    refreshFromServer, checkInGPSAsync, createManualAttendance, mutate,
    requestManualReview: (sessionId: string, reason: string) =>
      mutate('/manual-review', 'POST', { sessionId, reason, time: lessonTimeFor(sessionId) }),
    toggleSessionStatus: (sessionId: string) => {
      const session = data.classSessions.find((item) => item.id === sessionId);
      if (!session) return;
      return mutate('/sessions/' + encodeURIComponent(sessionId), 'PATCH', { status: session.status === 'OPEN' ? 'CLOSED' : 'OPEN' });
    },
    overrideAttendance: (recordId: string, status: VerificationStatus, reason: string) => {
      const record = data.attendanceRecords.find((item) => item.id === recordId);
      if (record) return createManualAttendance(record.sessionId, record.studentId, status, reason, record.hourSlot);
    },
    sendEarlyWarningNotice: (studentId: string, courseCode: string) => mutate('/warnings', 'POST', { studentId, courseCode }),
    language,
    setLanguage: (value: Language) => {
      setLanguageState(value);
      localStorage.setItem('kbtu_ums_language', value);
    },
    t: (key: Parameters<typeof getTranslation>[1], params?: Record<string, string | number>) => getTranslation(language, key, params),
  };
}

const AppContext = createContext<ReturnType<typeof useWorkspace> | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const workspace = useWorkspace();
  return <AppContext.Provider value={workspace}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
