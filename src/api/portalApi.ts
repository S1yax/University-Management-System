import { call } from './attendanceApi';
import type { AttendanceRecord, AuditLogEntry, ClassSession, Course, Enrollment, User } from '../types';

export interface Notification {
  id: string;
  sender: string;
  subject: string;
  content: string;
  date: string;
  read: boolean;
}

export interface Workspace {
  demoTime: boolean;
  user: User;
  users: User[];
  courses: Course[];
  enrollments: Enrollment[];
  classSessions: ClassSession[];
  attendanceRecords: AttendanceRecord[];
  auditLogs: AuditLogEntry[];
  notifications: Notification[];
}

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const result = await call<T & { message?: string }>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (result.code >= 400) throw new Error(result.body.message || 'The request did not complete.');
  return result.body;
}
