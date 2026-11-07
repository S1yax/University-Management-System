import { describe, it, expect } from 'vitest';
import {
  createMemoryStore,
  forgetThisDevice,
  getCredential,
  hasRememberedDevice,
  REMEMBER_DAYS,
  rememberThisDevice,
  restoreRememberedUser,
  savePassword,
} from '../credentials';

const DAY = 24 * 60 * 60 * 1000;

async function storeWithUser() {
  const store = createMemoryStore();
  await savePassword('s_bagdat', 'Granite-Fox-905', store);
  return store;
}

describe('Keep me signed in on this device', () => {
  it('does nothing until the user asks for it', async () => {
    const store = await storeWithUser();
    expect(hasRememberedDevice(store)).toBe(false);
    expect(await restoreRememberedUser(store)).toBeNull();
  });

  it('signs the user in automatically after it was ticked', async () => {
    const store = await storeWithUser();
    await rememberThisDevice('s_bagdat', store);
    expect(hasRememberedDevice(store)).toBe(true);
    expect(await restoreRememberedUser(store)).toBe('s_bagdat');
  });

  it('does not work on another device (a device without the token)', async () => {
    const mine = await storeWithUser();
    await rememberThisDevice('s_bagdat', mine);
    const otherDevice = createMemoryStore(); // different browser: no token there
    expect(await restoreRememberedUser(otherDevice)).toBeNull();
  });

  it('stores only a hash of the token in the credential record', async () => {
    const store = await storeWithUser();
    await rememberThisDevice('s_bagdat', store);
    const token = JSON.parse(store.getItem('kbtu_ums_remember')!).token as string;
    const record = getCredential('s_bagdat', store)!;
    expect(record.devices).toHaveLength(1);
    expect(JSON.stringify(record)).not.toContain(token);
  });

  it(`expires after ${REMEMBER_DAYS} days`, async () => {
    const store = await storeWithUser();
    const now = Date.now();
    await rememberThisDevice('s_bagdat', store, now);
    expect(await restoreRememberedUser(store, now + (REMEMBER_DAYS - 1) * DAY)).toBe('s_bagdat');
    expect(await restoreRememberedUser(store, now + (REMEMBER_DAYS + 1) * DAY)).toBeNull();
    expect(hasRememberedDevice(store)).toBe(false); // the expired token is removed
  });

  it('is switched off by signing out', async () => {
    const store = await storeWithUser();
    await rememberThisDevice('s_bagdat', store);
    await forgetThisDevice(store);
    expect(hasRememberedDevice(store)).toBe(false);
    expect(await restoreRememberedUser(store)).toBeNull();
    expect(getCredential('s_bagdat', store)!.devices).toEqual([]);
  });

  it('is revoked when the password changes', async () => {
    const store = await storeWithUser();
    await rememberThisDevice('s_bagdat', store);
    await savePassword('s_bagdat', 'Orchard-Lamp-471', store);
    expect(await restoreRememberedUser(store)).toBeNull();
  });

  it('refuses a tampered token', async () => {
    const store = await storeWithUser();
    await rememberThisDevice('s_bagdat', store);
    const saved = JSON.parse(store.getItem('kbtu_ums_remember')!);
    store.setItem('kbtu_ums_remember', JSON.stringify({ ...saved, token: 'AAAA' + saved.token.slice(4) }));
    expect(await restoreRememberedUser(store)).toBeNull();
  });

  it('refuses a token that names a different user', async () => {
    const store = await storeWithUser();
    await savePassword('admin', 'Maple-River-338', store);
    await rememberThisDevice('s_bagdat', store);
    const saved = JSON.parse(store.getItem('kbtu_ums_remember')!);
    store.setItem('kbtu_ums_remember', JSON.stringify({ ...saved, username: 'admin' }));
    expect(await restoreRememberedUser(store)).toBeNull();
  });
});