import { describe, it, expect } from 'vitest';
import { canAccess, ROLE_PATHS, SHARED_PATHS } from '../rbac';
import { UserRole } from '../../types';

describe('Role-based access (canAccess)', () => {
  it('lets a student open the student pages', () => {
    expect(canAccess('STUDENT', 'attendance-checkin')).toBe(true);
    expect(canAccess('STUDENT', 'grades-transcript')).toBe(true);
  });

  it('denies a student the admin, teacher and manager pages (403)', () => {
    expect(canAccess('STUDENT', 'audit-log')).toBe(false);
    expect(canAccess('STUDENT', 'live-attendance')).toBe(false);
    expect(canAccess('STUDENT', 'at-risk-attendance')).toBe(false);
  });

  it('lets a teacher open the teacher pages but not the admin pages', () => {
    expect(canAccess('TEACHER', 'live-attendance')).toBe(true);
    expect(canAccess('TEACHER', 'gradebook')).toBe(true);
    expect(canAccess('TEACHER', 'users')).toBe(false);
    expect(canAccess('TEACHER', 'audit-log')).toBe(false);
  });

  it('lets a manager open the manager pages but not the gradebook', () => {
    expect(canAccess('MANAGER', 'at-risk-attendance')).toBe(true);
    expect(canAccess('MANAGER', 'performance-reports')).toBe(true);
    expect(canAccess('MANAGER', 'gradebook')).toBe(false);
  });

  it('allows managers and admins to open audit logs and reserves user management for admins', () => {
    expect(canAccess('ADMIN', 'audit-log')).toBe(true);
    expect(canAccess('ADMIN', 'roles-permissions')).toBe(true);
    expect(canAccess('ADMIN', 'attendance-checkin')).toBe(false);
    const roles: UserRole[] = ['STUDENT', 'TEACHER'];
    roles.forEach((role) => expect(canAccess(role, 'audit-log')).toBe(false));
    expect(canAccess('MANAGER', 'audit-log')).toBe(true);
    expect(canAccess('MANAGER', 'users')).toBe(false);
  });

  it('lets every role open the shared pages (including change-password)', () => {
    const roles: UserRole[] = ['STUDENT', 'TEACHER', 'MANAGER', 'ADMIN'];
    for (const role of roles) {
      SHARED_PATHS.forEach((path) => expect(canAccess(role, path)).toBe(true));
    }
  });

  it('denies a page that does not exist and a missing role', () => {
    expect(canAccess('ADMIN', 'no-such-page')).toBe(false);
    expect(canAccess(null, 'dashboard')).toBe(false);
    expect(canAccess(undefined, 'dashboard')).toBe(false);
  });

  it('keeps the page lists free of duplicates', () => {
    for (const paths of Object.values(ROLE_PATHS)) {
      expect(new Set(paths).size).toBe(paths.length);
    }
  });
});