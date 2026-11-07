import { describe, it, expect } from 'vitest';
import {
  createMemoryStore,
  getCredential,
  hasPassword,
  isPasswordReused,
  savePassword,
  verifyPassword,
} from '../credentials';
import { PASSWORD_HISTORY_SIZE } from '../passwordPolicy';

describe('Credential storage', () => {
  it('starts with no password for every account', () => {
    const store = createMemoryStore();
    expect(hasPassword('s_bagdat', store)).toBe(false);
    expect(getCredential('s_bagdat', store)).toBeUndefined();
  });

  it('never stores the password itself', async () => {
    const store = createMemoryStore();
    await savePassword('s_bagdat', 'Granite-Fox-905', store);
    expect(JSON.stringify(store.getItem('kbtu_ums_credentials'))).not.toContain('Granite-Fox-905');
    expect(hasPassword('s_bagdat', store)).toBe(true);
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const store = createMemoryStore();
    const record = await savePassword('s_bagdat', 'Granite-Fox-905', store);
    expect(await verifyPassword(record, 'Granite-Fox-905')).toBe(true);
    expect(await verifyPassword(record, 'Granite-Fox-906')).toBe(false);
    expect(await verifyPassword(record, '')).toBe(false);
  });

  it('uses a different salt (and hash) for the same password of two users', async () => {
    const store = createMemoryStore();
    const a = await savePassword('s_bagdat', 'Granite-Fox-905', store);
    const b = await savePassword('s_yugai', 'Granite-Fox-905', store);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('treats usernames case-insensitively', async () => {
    const store = createMemoryStore();
    await savePassword('S_Bagdat', 'Granite-Fox-905', store);
    expect(hasPassword('s_bagdat', store)).toBe(true);
  });

  it('blocks reuse of the current and earlier passwords', async () => {
    const store = createMemoryStore();
    await savePassword('s_bagdat', 'Granite-Fox-905', store);
    await savePassword('s_bagdat', 'Orchard-Lamp-471', store);
    const record = getCredential('s_bagdat', store)!;

    expect(await isPasswordReused(record, 'Orchard-Lamp-471')).toBe(true); // current
    expect(await isPasswordReused(record, 'Granite-Fox-905')).toBe(true); // previous
    expect(await isPasswordReused(record, 'Maple-River-338')).toBe(false); // new
  });

  it('forgets passwords older than the history limit', async () => {
    const store = createMemoryStore();
    const passwords = Array.from({ length: PASSWORD_HISTORY_SIZE + 1 }, (_, i) => `Pass-Word-Set-${i}x${i * 7}`);
    for (const p of passwords) await savePassword('s_bagdat', p, store);
    const record = getCredential('s_bagdat', store)!;

    expect(record.history.length).toBe(PASSWORD_HISTORY_SIZE - 1);
    expect(await isPasswordReused(record, passwords[passwords.length - 1])).toBe(true); // current
    expect(await isPasswordReused(record, passwords[0])).toBe(false); // oldest, forgotten
  });
});