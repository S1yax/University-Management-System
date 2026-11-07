import { describe, it, expect } from 'vitest';
import {
  checkPassword,
  isSimilarToPrevious,
  hasObviousPattern,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PasswordContext,
} from '../passwordPolicy';

const alua: PasswordContext = {
  username: 's_bagdat',
  fullName: 'Bagdat Alua',
  email: 's_bagdat@kbtu.kz',
  studentId: '24B031666',
};

const failedIds = (password: string, ctx: PasswordContext = alua) =>
  checkPassword(password, ctx)
    .rules.filter((r) => !r.passed)
    .map((r) => r.id);

describe('Password policy', () => {
  it('accepts a strong password', () => {
    const result = checkPassword('Granite-Fox-905', alua);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts Cyrillic letters', () => {
    expect(checkPassword('Кызыл-Тюльпан-58', alua).ok).toBe(true);
  });

  it('allows exactly 8 to 20 characters', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_MAX_LENGTH).toBe(20);
    expect(failedIds('Fx7kLm2q')).not.toContain('length'); // 8
    expect(failedIds('Granite-Fox-Tiger-905')).toContain('length'); // 21
    expect(failedIds('Granite-Fox-Tige-905')).not.toContain('length'); // 20
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(failedIds('Fx7kLm2')).toContain('length'); // 7
    expect(failedIds('Ab1xyz')).toContain('length');
  });

  it('rejects passwords longer than 20 characters', () => {
    expect(failedIds('Qx7-' + 'granite'.repeat(3))).toContain('length');
  });

  it('requires at least one digit', () => {
    expect(failedIds('Granite-Fox-Tiger')).toContain('digit');
  });

  it('requires at least one letter', () => {
    expect(failedIds('8465093172')).toContain('letter');
  });

  it('rejects leading or trailing spaces', () => {
    expect(failedIds(' Granite-Fox-905')).toContain('spaces');
  });

  it('rejects the username, name, student ID and corporate e-mail login', () => {
    expect(failedIds('Xx-s_bagdat-905')).toContain('personal');
    expect(failedIds('Alua-Granite-905')).toContain('personal');
    expect(failedIds('Granite-24B031666')).toContain('personal');
  });

  it('rejects the corporate login built as first letter of the name + surname', () => {
    // Alua Bagdat -> a_bagdat@kbtu.kz (the name list is stored surname first, so both orders are checked)
    expect(failedIds('Fox-a_bagdat-9')).toContain('personal');
    expect(failedIds('Fox-a.bagdat-9')).toContain('personal');
    expect(failedIds('Fox-abagdat-9')).toContain('personal');
    expect(failedIds('Fox-b_alua-905')).toContain('personal');
  });

  it('does not reject a harmless password that only shares one letter with the name', () => {
    expect(failedIds('Granite-Fox-905')).not.toContain('personal');
  });

  it('rejects common passwords', () => {
    expect(failedIds('Password-Fox-905')).toContain('common');
    expect(failedIds('Qwerty-Fox-905')).toContain('common');
    expect(failedIds('Demo2026-Fox-905')).toContain('common');
  });

  it('rejects obvious patterns', () => {
    expect(hasObviousPattern('Granite-1234-Fox')).toBe(true);
    expect(hasObviousPattern('Granite-4321-Fox')).toBe(true);
    expect(hasObviousPattern('Graniteabcd-905')).toBe(true);
    expect(hasObviousPattern('Granite-9999-Fox')).toBe(true);
    expect(hasObviousPattern('Granite-Fox-905')).toBe(false);
  });

  it('does not run the "similar" rule unless a previous password is known', () => {
    expect(checkPassword('Granite-Fox-905', alua).rules.some((r) => r.id === 'similar')).toBe(false);
    expect(
      checkPassword('Granite-Fox-905', { ...alua, previousPassword: 'Orchard-Lamp-47' }).rules.some(
        (r) => r.id === 'similar'
      )
    ).toBe(true);
  });
});

describe('Similarity to the previous password', () => {
  const previous = 'Orchard-Lamp-47';

  it('rejects the same password', () => {
    expect(isSimilarToPrevious('Orchard-Lamp-47', previous)).toBe(true);
  });

  it('rejects the same password in a different case', () => {
    expect(isSimilarToPrevious('ORCHARD-lamp-47', previous)).toBe(true);
  });

  it('rejects a change of one digit', () => {
    expect(isSimilarToPrevious('Orchard-Lamp-48', previous)).toBe(true);
  });

  it('rejects an added suffix or prefix', () => {
    expect(isSimilarToPrevious('Orchard-Lamp-47!', previous)).toBe(true);
    expect(isSimilarToPrevious('1Orchard-Lamp-47', previous)).toBe(true);
  });

  it('rejects the same words with different digits and symbols', () => {
    expect(isSimilarToPrevious('Orchard.Lamp.9051', previous)).toBe(true);
  });

  it('accepts a really different password', () => {
    expect(isSimilarToPrevious('Granite-Fox-905', previous)).toBe(false);
  });

  it('is reported through checkPassword', () => {
    const result = checkPassword('Orchard-Lamp-48', { ...alua, previousPassword: previous });
    expect(result.ok).toBe(false);
    expect(result.rules.find((r) => r.id === 'similar')?.passed).toBe(false);
  });
});