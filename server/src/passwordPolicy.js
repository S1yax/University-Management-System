const COMMON_FRAGMENTS = [
  'password', 'parol', 'qwerty', 'qazwsx',
  'asdfgh', 'letmein', 'welcome', 'iloveyou',
  'admin', 'demo2026', 'kbtu',
  '12345', '11111', '00000',
];

function levenshtein(a, b) {
  let prev = Array.from(
    { length: b.length + 1 },
    (_, i) => i
  );

  for (let i = 1; i <= a.length; i++) {
    const curr = [i];

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }

    prev = curr;
  }

  return prev[b.length];
}

function isSimilar(next, previous) {
  const a = next.toLowerCase();
  const b = previous.toLowerCase();

  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (levenshtein(a, b) <= 3) return true;

  const lettersA = a.replace(/[^\p{L}]/gu, '');
  const lettersB = b.replace(/[^\p{L}]/gu, '');

  return lettersA.length >= 4 && lettersA === lettersB;
}

function hasObviousPattern(password) {
  const s = password.toLowerCase();

  let same = 1;
  let up = 1;
  let down = 1;

  for (let i = 1; i < s.length; i++) {
    const diff = s.charCodeAt(i) - s.charCodeAt(i - 1);

    same = diff === 0 ? same + 1 : 1;
    up = diff === 1 ? up + 1 : 1;
    down = diff === -1 ? down + 1 : 1;

    if (same >= 4 || up >= 4 || down >= 4) {
      return true;
    }
  }

  return false;
}

function personalTokens(user) {
  const tokens = new Set();

  const add = (value) => {
    const v = value?.trim().toLowerCase();

    if (v && v.length >= 3) {
      tokens.add(v);
    }
  };

  add(user.username);
  add(user.studentId);
  add(user.email?.split('@')[0]);

  (user.username || '').split(/[_\-.]/).forEach(add);

  const parts = (user.fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  parts.forEach(add);

  if (parts.length >= 2) {
    for (const [first, second] of [
      [parts[0], parts[1]],
      [parts[1], parts[0]],
    ]) {
      for (const separator of ['_', '.', '']) {
        add(`${first[0]}${separator}${second}`);
      }
    }
  }

  return [...tokens];
}

export function checkPassword(password, user, previous) {
  const errors = [];

  if (typeof password !== 'string') {
    return ['Password must be a string.'];
  }

  const lower = password.toLowerCase();

  if (password.length < 8 || password.length > 20) {
    errors.push('Password must contain 8–20 characters.');
  }

  if (!/\p{L}/u.test(password)) {
    errors.push('At least one letter is required.');
  }

  if (!/\d/.test(password)) {
    errors.push('At least one digit is required.');
  }

  if (password !== password.trim()) {
    errors.push('No spaces at the start or end.');
  }

  if (personalTokens(user).some(token => lower.includes(token))) {
    errors.push('Password must not contain personal information.');
  }

  if (COMMON_FRAGMENTS.some(fragment => lower.includes(fragment))) {
    errors.push('Password contains a common pattern.');
  }

  if (hasObviousPattern(password)) {
    errors.push('Repeated or sequential characters are not allowed.');
  }

  if (previous !== undefined && isSimilar(password, previous)) {
    errors.push('Password is too similar to the current password.');
  }

  return errors;
}

export function semesterOf(date) {
  return date.getMonth() >= 7
    ? `Fall ${date.getFullYear()}`
    : `Spring ${date.getFullYear()}`;
}

export function isPasswordExpired(role, changedAt, now = new Date()) {
  if (role !== 'STUDENT') return false;

  if (!changedAt) return true;

  const date = new Date(changedAt);

  if (Number.isNaN(date.getTime())) {
    return true;
  }

  return semesterOf(date) !== semesterOf(now);
}