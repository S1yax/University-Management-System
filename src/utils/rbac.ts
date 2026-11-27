/**
 * Role-based access control (RBAC): one place that says which role may open which page.
 * Pure functions (no React) so every rule can be unit-tested.
 */
import { UserRole } from '../types';

/** Pages that only the listed role may open. */
export const ROLE_PATHS: Record<UserRole, string[]> = {
  STUDENT: [
    'dashboard',
    // Official KBTU Uninet pages
    'transcript',
    'journal',
    'syllabus',
    'attestation',
    'course-materials',
    'schedule',
    'exam-schedule',
    'discipline-schedule',
    'financial-cabinet',
    'billing',
    'course-registration',
    'schedule-creation',
    'add-drop',
    'requests',
    'surveys',
    'entry-tests',
    'mobility',
    'dormitory',
    'user-profile',
    'news',
    'files',
    // Backwards compatibility
    'my-courses',
    'attendance-checkin',
    'grades-transcript',
    'messages',
    'teacher-ratings',
  ],
  TEACHER: [
    'dashboard',
    'journal',
    'live-attendance',
    'gradebook',
    'lessons',
    'students',
    'research',
    'syllabus',
    'schedule',
    'exam-schedule',
    'messages',
    'news',
    'files',
    'user-profile',
    'my-courses',
  ],
  MANAGER: [
    'dashboard',
    'courses',
    'enrollments',
    'at-risk-attendance',
    'performance-reports',
    'audit-log',
    'mentors',
    'messages',
    'news',
    'schedule',
    'user-profile',
  ],
  ADMIN: [
    'dashboard',
    'users',
    'roles-permissions',
    'audit-log',
    'courses',
    'applications',
    'system-settings',
    'user-profile',
  ],
};

/** Pages every signed-in role may open ('change-password' and 'profile' are account pages, the rest are project pages). */
export const SHARED_PATHS = ['database-erd', 'team-39', 'project-status', 'change-password', 'profile'];

/** True when this role may open this page. Anything unknown is denied. */
export function canAccess(role: UserRole | null | undefined, path: string): boolean {
  if (!role) return false;
  if (SHARED_PATHS.includes(path)) return true;
  return ROLE_PATHS[role]?.includes(path) ?? false;
}