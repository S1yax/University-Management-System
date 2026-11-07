/**
 * Credential storage for the frontend-only demo.
 *
 * Passwords are never stored: only a salted PBKDF2-SHA256 hash (Web Crypto API).
 * The store is still the browser's localStorage, so this is NOT real security.
 * A server must do this job in the production version (see the project plan).
 */
import { PASSWORD_HISTORY_SIZE } from './passwordPolicy';

export const PBKDF2_ITERATIONS = 210_000;
const STORAGE_KEY = 'kbtu_ums_credentials';

export interface HashEntry {
  salt: string; // base64
  hash: string; // base64
}

export interface CredentialRecord extends HashEntry {
  iterations: number;
  /** Hashes of earlier passwords (newest first). Used only to block reuse. */
  history: HashEntry[];
  /** When the current password was set (ISO). Used for the once-per-semester rule. */
  updatedAt: string;
  /** SHA-256 hashes of the "keep me signed in" tokens issued to devices. Changing the password clears them. */
  devices?: string[];
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function defaultStore(): KeyValueStore {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // access to storage can throw in private mode
  }
  return createMemoryStore();
}

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

async function derive(password: string, salt: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations },
    key,
    256
  );
  return toBase64(new Uint8Array(bits));
}

/** Compares in constant time so timing does not leak where the hashes differ. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function newSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

function readAll(store: KeyValueStore): Record<string, CredentialRecord> {
  try {
    const raw = store.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CredentialRecord>) : {};
  } catch {
    return {};
  }
}

function writeAll(store: KeyValueStore, all: Record<string, CredentialRecord>): void {
  store.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getCredential(username: string, store: KeyValueStore = defaultStore()): CredentialRecord | undefined {
  return readAll(store)[username.trim().toLowerCase()];
}

/** False for an account that has never had its own password set. */
export function hasPassword(username: string, store: KeyValueStore = defaultStore()): boolean {
  return getCredential(username, store) !== undefined;
}

export async function verifyPassword(record: CredentialRecord, password: string): Promise<boolean> {
  const hash = await derive(password, record.salt, record.iterations);
  return safeEqual(hash, record.hash);
}

/** True if the password equals the current one or any of the remembered earlier ones. */
export async function isPasswordReused(record: CredentialRecord, password: string): Promise<boolean> {
  const entries: HashEntry[] = [record, ...record.history];
  for (const entry of entries) {
    const hash = await derive(password, entry.salt, record.iterations);
    if (safeEqual(hash, entry.hash)) return true;
  }
  return false;
}

/** Stores a new password (first-time or change). The old hash moves into the history. */
export async function savePassword(
  username: string,
  password: string,
  store: KeyValueStore = defaultStore()
): Promise<CredentialRecord> {
  const key = username.trim().toLowerCase();
  const all = readAll(store);
  const existing = all[key];

  const salt = newSalt();
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);

  const history = existing
    ? [{ salt: existing.salt, hash: existing.hash }, ...existing.history].slice(0, PASSWORD_HISTORY_SIZE - 1)
    : [];

  const record: CredentialRecord = {
    salt,
    hash,
    iterations: PBKDF2_ITERATIONS,
    history,
    updatedAt: new Date().toISOString(),
  };
  all[key] = record;
  writeAll(store, all);
  return record;
}

/* ------------------------------------------------------------------ */
/* "Keep me signed in on this device"                                  */
/*                                                                     */
/* The device keeps a random token; the credential record keeps only   */
/* its SHA-256 hash. Auto sign-in works only on the device that holds  */
/* the token, and every token is revoked when the password changes.    */
/* ------------------------------------------------------------------ */

const DEVICE_KEY = 'kbtu_ums_remember'; // lives in this browser only
export const REMEMBER_DAYS = 30;
const MAX_DEVICES = 5;

interface DeviceToken {
  username: string;
  token: string;
  expiresAt: number; // ms since epoch
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toBase64(new Uint8Array(digest));
}

function readDeviceToken(store: KeyValueStore): DeviceToken | null {
  try {
    const raw = store.getItem(DEVICE_KEY);
    return raw ? (JSON.parse(raw) as DeviceToken) : null;
  } catch {
    return null;
  }
}

/** True when this device holds a "keep me signed in" token (it may still be expired or revoked). */
export function hasRememberedDevice(store: KeyValueStore = defaultStore()): boolean {
  return readDeviceToken(store) !== null;
}

/** Issues a token for this device and stores its hash in the user's credential record. */
export async function rememberThisDevice(
  username: string,
  store: KeyValueStore = defaultStore(),
  now: number = Date.now()
): Promise<void> {
  const key = username.trim().toLowerCase();
  const all = readAll(store);
  const record = all[key];
  if (!record) return; // nothing to attach the token to

  const token = toBase64(crypto.getRandomValues(new Uint8Array(32)));
  record.devices = [await sha256(token), ...(record.devices ?? [])].slice(0, MAX_DEVICES);
  writeAll(store, all);

  const payload: DeviceToken = { username: key, token, expiresAt: now + REMEMBER_DAYS * 24 * 60 * 60 * 1000 };
  store.setItem(DEVICE_KEY, JSON.stringify(payload));
}

/** Username to sign in automatically on this device, or null (no token, expired, revoked, tampered). */
export async function restoreRememberedUser(
  store: KeyValueStore = defaultStore(),
  now: number = Date.now()
): Promise<string | null> {
  const saved = readDeviceToken(store);
  if (!saved) return null;

  const record = readAll(store)[saved.username];
  const valid =
    typeof saved.token === 'string' &&
    now < saved.expiresAt &&
    !!record &&
    (record.devices ?? []).includes(await sha256(saved.token));

  if (!valid) {
    store.removeItem(DEVICE_KEY);
    return null;
  }
  return saved.username;
}

/** Turns auto sign-in off on this device (used on sign-out and when "keep me signed in" is not ticked). */
export async function forgetThisDevice(store: KeyValueStore = defaultStore()): Promise<void> {
  const saved = readDeviceToken(store);
  if (!saved) return;
  try {
    const all = readAll(store);
    const record = all[saved.username];
    if (record?.devices) {
      const hash = await sha256(saved.token);
      record.devices = record.devices.filter((d) => d !== hash);
      writeAll(store, all);
    }
  } finally {
    store.removeItem(DEVICE_KEY);
  }
}