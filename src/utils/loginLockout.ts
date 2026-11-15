/**
 * Login lockout, stored per login in localStorage.
 * A page refresh does not reset it. (Demo only: whoever clears the browser data removes it too;
 * the real lockout must live on the server.)
 */
import { createMemoryStore, KeyValueStore } from './credentials';

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_SECONDS = 30;
/** Mistakes older than this are forgotten and the count starts from zero. */
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
/** Keeps the stored table small even if somebody types thousands of different logins. */
const MAX_ENTRIES = 50;
const STORAGE_KEY = 'kbtu_ums_lockout';

interface LockEntry {
  count: number;
  lastAt: number; // ms: time of the last failed attempt
  lockedUntil: number; // ms: 0 = not locked
}

function defaultStore(): KeyValueStore {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // access to storage can throw in private mode
  }
  return createMemoryStore();
}

const keyOf = (login: string) => login.trim().toLowerCase().slice(0, 64);

function read(store: KeyValueStore): Record<string, LockEntry> {
  try {
    const raw = store.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LockEntry>) : {};
  } catch {
    return {};
  }
}

function write(store: KeyValueStore, all: Record<string, LockEntry>): void {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // storage full or blocked: the lockout then only works until the next refresh
  }
}

/** Seconds left until this login can try again (0 = not locked). */
export function getLockRemainingSeconds(
  login: string,
  store: KeyValueStore = defaultStore(),
  now: number = Date.now()
): number {
  const entry = read(store)[keyOf(login)];
  if (!entry || entry.lockedUntil <= now) return 0;
  return Math.ceil((entry.lockedUntil - now) / 1000);
}

/** Call after every wrong password. Returns how many mistakes are counted and whether the login is now locked. */
export function registerLoginFailure(
  login: string,
  store: KeyValueStore = defaultStore(),
  now: number = Date.now()
): { attempts: number; locked: boolean; remainingSeconds: number } {
  const all = read(store);
  const key = keyOf(login);
  const previous = all[key];

  // Already locked: do not extend the lock and do not count more mistakes
  if (previous && previous.lockedUntil > now) {
    return {
      attempts: previous.count,
      locked: true,
      remainingSeconds: Math.ceil((previous.lockedUntil - now) / 1000),
    };
  }

  // A finished lock or an old series of mistakes starts counting from zero
  const stale = !previous || previous.lockedUntil > 0 || now - previous.lastAt > FAILURE_WINDOW_MS;
  const count = (stale ? 0 : previous.count) + 1;
  const locked = count >= MAX_FAILED_ATTEMPTS;

  all[key] = { count, lastAt: now, lockedUntil: locked ? now + LOCKOUT_SECONDS * 1000 : 0 };

  // Keep the table small: drop old entries first, then the oldest ones
  for (const [k, e] of Object.entries(all)) {
    if (e.lockedUntil <= now && now - e.lastAt > FAILURE_WINDOW_MS) delete all[k];
  }
  const keys = Object.keys(all);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => all[a].lastAt - all[b].lastAt)
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((k) => delete all[k]);
  }

  write(store, all);
  return { attempts: count, locked, remainingSeconds: locked ? LOCKOUT_SECONDS : 0 };
}

/** Call after a successful sign-in. */
export function clearLoginFailures(login: string, store: KeyValueStore = defaultStore()): void {
  const all = read(store);
  if (all[keyOf(login)]) {
    delete all[keyOf(login)];
    write(store, all);
  }
}