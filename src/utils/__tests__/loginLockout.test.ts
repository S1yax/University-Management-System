import { describe, it, expect } from 'vitest';
import { createMemoryStore } from '../credentials';
import {
  clearLoginFailures,
  getLockRemainingSeconds,
  LOCKOUT_SECONDS,
  MAX_FAILED_ATTEMPTS,
  registerLoginFailure,
} from '../loginLockout';

const T0 = 1_000_000;

function fail(store: ReturnType<typeof createMemoryStore>, login: string, times: number, at = T0) {
  let last = { attempts: 0, locked: false, remainingSeconds: 0 };
  for (let i = 0; i < times; i++) last = registerLoginFailure(login, store, at);
  return last;
}

describe('Login lockout', () => {
  it('is not locked at the start', () => {
    expect(getLockRemainingSeconds('s_bagdat', createMemoryStore(), T0)).toBe(0);
  });

  it('locks only on the 5th wrong attempt', () => {
    const store = createMemoryStore();
    const fourth = fail(store, 's_bagdat', MAX_FAILED_ATTEMPTS - 1);
    expect(fourth.locked).toBe(false);
    expect(getLockRemainingSeconds('s_bagdat', store, T0)).toBe(0);

    const fifth = registerLoginFailure('s_bagdat', store, T0);
    expect(fifth.locked).toBe(true);
    expect(fifth.remainingSeconds).toBe(LOCKOUT_SECONDS);
    expect(getLockRemainingSeconds('s_bagdat', store, T0)).toBe(LOCKOUT_SECONDS);
  });

  it('survives a page refresh (the data comes from the store, not from React state)', () => {
    const store = createMemoryStore();
    fail(store, 's_bagdat', MAX_FAILED_ATTEMPTS);
    expect(getLockRemainingSeconds('s_bagdat', store, T0 + 10_000)).toBe(LOCKOUT_SECONDS - 10);
  });

  it('locks only the login that made the mistakes', () => {
    const store = createMemoryStore();
    fail(store, 's_bagdat', MAX_FAILED_ATTEMPTS);
    expect(getLockRemainingSeconds('s_yugai', store, T0)).toBe(0);
  });

  it('treats the login case-insensitively and ignores spaces', () => {
    const store = createMemoryStore();
    fail(store, ' S_Bagdat ', MAX_FAILED_ATTEMPTS);
    expect(getLockRemainingSeconds('s_bagdat', store, T0)).toBeGreaterThan(0);
  });

  it('unlocks after the lock time and starts counting again from 1', () => {
    const store = createMemoryStore();
    fail(store, 's_bagdat', MAX_FAILED_ATTEMPTS);
    const later = T0 + (LOCKOUT_SECONDS + 1) * 1000;
    expect(getLockRemainingSeconds('s_bagdat', store, later)).toBe(0);
    expect(registerLoginFailure('s_bagdat', store, later).attempts).toBe(1);
  });

  it('does not extend the lock while it is active', () => {
    const store = createMemoryStore();
    fail(store, 's_bagdat', MAX_FAILED_ATTEMPTS);
    registerLoginFailure('s_bagdat', store, T0 + 10_000);
    expect(getLockRemainingSeconds('s_bagdat', store, T0 + 10_000)).toBe(LOCKOUT_SECONDS - 10);
  });

  it('a successful sign-in clears the mistakes', () => {
    const store = createMemoryStore();
    fail(store, 's_bagdat', MAX_FAILED_ATTEMPTS - 1);
    clearLoginFailures('s_bagdat', store);
    expect(registerLoginFailure('s_bagdat', store, T0).attempts).toBe(1);
  });

  it('forgets old mistakes after 15 minutes', () => {
    const store = createMemoryStore();
    fail(store, 's_bagdat', MAX_FAILED_ATTEMPTS - 1);
    const muchLater = T0 + 16 * 60 * 1000;
    expect(registerLoginFailure('s_bagdat', store, muchLater).attempts).toBe(1);
  });

  it('keeps the stored table small', () => {
    const store = createMemoryStore();
    for (let i = 0; i < 80; i++) registerLoginFailure(`user${i}`, store, T0 + i);
    const entries = Object.keys(JSON.parse(store.getItem('kbtu_ums_lockout')!));
    expect(entries.length).toBeLessThanOrEqual(50);
  });
});