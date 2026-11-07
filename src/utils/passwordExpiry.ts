import type { UserRole } from '../types';

/** Roles that have to change the password every semester. Add 'TEACHER' etc. here to extend the rule. */
export const SEMESTER_PASSWORD_ROLES: UserRole[] = ['STUDENT'];

/**
 * Semester a date belongs to.
 * Fall = August–December, Spring = January–July (summer is counted as part of Spring).
 * Change this one function if the university calendar differs.
 */
export function semesterOf(date: Date): string {
  return date.getMonth() >= 7 ? `Fall ${date.getFullYear()}` : `Spring ${date.getFullYear()}`;
}

/** True when this role must use a different password in every semester. */
export function usesSemesterPassword(role: UserRole): boolean {
  return SEMESTER_PASSWORD_ROLES.includes(role);
}

/** True when the password was set in an earlier semester than `now` and the role requires a yearly-semester change. */
export function isPasswordExpired(role: UserRole, passwordSetAt: string, now: Date = new Date()): boolean {
  if (!usesSemesterPassword(role)) return false;
  const setAt = new Date(passwordSetAt);
  if (Number.isNaN(setAt.getTime())) return true; // unreadable date -> be safe and ask for a new password
  return semesterOf(setAt) !== semesterOf(now);
}