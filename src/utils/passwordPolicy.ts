/**
 * Password policy for KBTU UMS.
 *
 * Pure functions only (no React, no storage) so every rule can be unit-tested.
 * "Was this password used before?" needs stored hashes, so it lives in credentials.ts.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 20;
/** How many previous passwords are remembered and cannot be reused. */
export const PASSWORD_HISTORY_SIZE = 3;

export interface PasswordContext {
  username: string;
  fullName: string;
  email: string;
  studentId?: string;
  /** Current password, known only when the user changes it. Enables the "not similar to previous" rule. */
  previousPassword?: string;
}

export interface PasswordRule {
  id: string;
  label: string;
  passed: boolean;
}

export interface PasswordCheck {
  ok: boolean;
  rules: PasswordRule[];
  /** Labels of failed rules, ready to show as error messages. */
  errors: string[];
}

/** Fragments that make a password trivially guessable. Checked case-insensitively. */
const COMMON_FRAGMENTS = [
  'password',
  'parol',
  'qwerty',
  'qazwsx',
  'asdfgh',
  'letmein',
  'welcome',
  'iloveyou',
  'admin',
  'demo2026',
  'kbtu',
  '12345',
  '11111',
  '00000',
];

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/** Same letters, only digits/symbols differ: "Summer-2026" vs "Summer-2027". */
function lettersOnly(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}]/gu, '');
}

/** True when the new password is too close to the previous one. */
export function isSimilarToPrevious(next: string, previous: string): boolean {
  const a = next.toLowerCase();
  const b = previous.toLowerCase();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (levenshtein(a, b) <= 3) return true;
  const la = lettersOnly(next);
  const lb = lettersOnly(previous);
  return la.length >= 4 && la === lb;
}

/** Runs of 4+ identical characters ("aaaa") or 4+ consecutive characters ("1234", "abcd", "4321"). */
export function hasObviousPattern(password: string): boolean {
  const s = password.toLowerCase();
  let same = 1;
  let up = 1;
  let down = 1;
  for (let i = 1; i < s.length; i++) {
    const diff = s.charCodeAt(i) - s.charCodeAt(i - 1);
    same = diff === 0 ? same + 1 : 1;
    up = diff === 1 ? up + 1 : 1;
    down = diff === -1 ? down + 1 : 1;
    if (same >= 4 || up >= 4 || down >= 4) return true;
  }
  return false;
}

/**
 * Words that must not appear inside a password because they are easy to guess from public data.
 * KBTU corporate e-mails look like "<first letter of the name>_<surname>@kbtu.kz" (a_bagdat@kbtu.kz),
 * so besides the real e-mail name we also block that pattern built from the full name.
 */
export function personalTokens(ctx: PasswordContext): string[] {
  const tokens = new Set<string>();
  const add = (value?: string) => {
    const v = value?.trim().toLowerCase();
    if (v && v.length >= 3) tokens.add(v);
  };
  add(ctx.username);
  add(ctx.studentId);
  ctx.username.split(/[_\-.]/).forEach(add); // "s_bagdat" -> "bagdat"

  // Corporate e-mail: the part before "@kbtu.kz" (the "@kbtu.kz" part itself is covered by the "kbtu" rule).
  add(ctx.email.split('@')[0]);

  const nameParts = ctx.fullName.trim().split(/\s+/).filter(Boolean);
  nameParts.forEach(add);
  if (nameParts.length >= 2) {
    const pairs: [string, string][] = [
      [nameParts[0], nameParts[1]],
      [nameParts[1], nameParts[0]],
    ];
    for (const [first, second] of pairs) {
      for (const separator of ['_', '.', '']) {
        add(`${first[0]}${separator}${second}`); // a_bagdat, a.bagdat, abagdat
      }
    }
  }
  return [...tokens];
}

export function checkPassword(password: string, ctx: PasswordContext): PasswordCheck {
  const lower = password.toLowerCase();

  const rules: PasswordRule[] = [
    {
      id: 'length',
      label: `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`,
      passed: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
    },
    { id: 'letter', label: 'At least one letter', passed: /\p{L}/u.test(password) },
    { id: 'digit', label: 'At least one digit', passed: /\d/.test(password) },
    {
      id: 'spaces',
      label: 'No spaces at the start or end',
      passed: password === password.trim(),
    },
    {
      id: 'personal',
      label: 'Does not contain your name, username, student ID or KBTU e-mail (like a_bagdat@kbtu.kz)',
      passed: !personalTokens(ctx).some((token) => lower.includes(token)),
    },
    {
      id: 'common',
      label: 'Is not a common password (password, qwerty, 12345, kbtu…)',
      passed: !COMMON_FRAGMENTS.some((fragment) => lower.includes(fragment)),
    },
    {
      id: 'pattern',
      label: 'No runs like aaaa or 1234',
      passed: !hasObviousPattern(password),
    },
  ];

  if (ctx.previousPassword !== undefined) {
    rules.push({
      id: 'similar',
      label: 'Is not similar to your current password',
      passed: !isSimilarToPrevious(password, ctx.previousPassword),
    });
  }

  const errors = rules.filter((r) => !r.passed).map((r) => `Required: ${r.label.charAt(0).toLowerCase()}${r.label.slice(1)}`);
  return { ok: errors.length === 0, rules, errors };
}