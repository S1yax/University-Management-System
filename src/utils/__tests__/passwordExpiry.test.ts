import { describe, it, expect } from 'vitest';
import { isPasswordExpired, semesterOf, usesSemesterPassword } from '../passwordExpiry';

const d = (iso: string) => new Date(iso);

describe('Semester password rule', () => {
  it('maps months to semesters (Fall = Aug–Dec, Spring = Jan–Jul)', () => {
    expect(semesterOf(d('2026-09-01T10:00:00'))).toBe('Fall 2026');
    expect(semesterOf(d('2026-12-31T10:00:00'))).toBe('Fall 2026');
    expect(semesterOf(d('2027-01-15T10:00:00'))).toBe('Spring 2027');
    expect(semesterOf(d('2027-06-30T10:00:00'))).toBe('Spring 2027');
  });

  it('applies to students only', () => {
    expect(usesSemesterPassword('STUDENT')).toBe(true);
    expect(usesSemesterPassword('TEACHER')).toBe(false);
    expect(usesSemesterPassword('MANAGER')).toBe(false);
    expect(usesSemesterPassword('ADMIN')).toBe(false);
  });

  it('keeps a student password valid during the same semester', () => {
    expect(isPasswordExpired('STUDENT', '2026-09-10T10:00:00', d('2026-12-20T10:00:00'))).toBe(false);
  });

  it('expires a student password when a new semester starts', () => {
    expect(isPasswordExpired('STUDENT', '2026-11-04T10:00:00', d('2027-01-12T10:00:00'))).toBe(true);
    expect(isPasswordExpired('STUDENT', '2027-03-01T10:00:00', d('2027-09-02T10:00:00'))).toBe(true);
  });

  it('never expires passwords of teachers, managers and admins', () => {
    expect(isPasswordExpired('TEACHER', '2025-01-01T10:00:00', d('2027-01-12T10:00:00'))).toBe(false);
    expect(isPasswordExpired('ADMIN', '2025-01-01T10:00:00', d('2027-01-12T10:00:00'))).toBe(false);
  });

  it('asks for a new password when the saved date is unreadable', () => {
    expect(isPasswordExpired('STUDENT', 'not-a-date', d('2026-11-04T10:00:00'))).toBe(true);
  });
});