import { test, expect } from 'vitest';

const USERNAME_REGEX = /^[a-z0-9._]+$/;

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function validateUsernameFormat(username: string): { valid: boolean; error?: string } {
  if (username.length < 3 || username.length > 32) {
    return { valid: false, error: 'اسم المستخدم يجب أن يكون بين 3 و 32 حرفاً' }
  }
  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, error: 'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام ونقاط وشرطات سفلية فقط' }
  }
  return { valid: true }
}

test('Username normalization', () => {
  expect(normalizeUsername('Ali')).toBe('ali');
  expect(normalizeUsername('ALI')).toBe('ali');
  expect(normalizeUsername(' ali ')).toBe('ali');
  expect(normalizeUsername('a.li')).toBe('a.li');
  expect(normalizeUsername('a_li')).toBe('a_li');
});

test('Username validation', () => {
  expect(validateUsernameFormat('ali').valid).toBe(true);
  expect(validateUsernameFormat('a.li').valid).toBe(true);
  expect(validateUsernameFormat('a_li').valid).toBe(true);
  expect(validateUsernameFormat('al').valid).toBe(false); // too short
  expect(validateUsernameFormat('a'.repeat(33)).valid).toBe(false); // too long
  expect(validateUsernameFormat('ali!').valid).toBe(false); // invalid char
});
