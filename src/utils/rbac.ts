/**
 * Role-based access control (RBAC): one place that says which role may open which page.
 * Pure functions (no React) so every rule can be unit-tested.
 */
import { UserRole } from '../types';

/** Pages that only the listed role may open. */
export const ROLE_PATHS: Record<UserRole, string[]> = {
  STUDENT: [
    'dashboard',
    'my-courses',
    'attendance-checkin',
    'schedule',
    'grades-transcript',
    'course-registration',
    'messages',
    'teacher-ratings',
    'news',
  ],
  TEACHER: [
    'dashboard',
    'my-courses',
    'live-attendance',
    'gradebook',
    'lessons',
    'students',
    'research',
    'messages',
    'news',
  ],
  MANAGER: [
    'dashboard',
    'courses',
    'enrollments',
    'at-risk-attendance',
    'performance-reports',
    'mentors',
    'messages',
    'news',
  ],
  ADMIN: ['dashboard', 'users', 'roles-permissions', 'audit-log', 'courses', 'applications', 'system-settings'],
};

/** Pages every signed-in role may open ('change-password' is an account page, the rest are project pages). */
export const SHARED_PATHS = ['database-erd', 'team-39', 'project-status', 'change-password', 'profile'];

/** True when this role may open this page. Anything unknown is denied. */
export function canAccess(role: UserRole | null | undefined, path: string): boolean {
  if (!role) return false;
  if (SHARED_PATHS.includes(path)) return true;
  return ROLE_PATHS[role]?.includes(path) ?? false;
}