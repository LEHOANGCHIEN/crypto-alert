import { describe, expect, it } from 'vitest';
import { validateConfirm, validateDisplayName, validateEmail, validatePassword } from './rules';

describe('validation rules (same as API.md)', () => {
  it('email', () => {
    expect(validateEmail('')).toEqual({ code: 'REQUIRED' });
    expect(validateEmail('nope')).toEqual({ code: 'INVALID_EMAIL' });
    expect(validateEmail('  a@b.co ')).toBeUndefined();
  });
  it('password', () => {
    expect(validatePassword('a1')).toEqual({ code: 'TOO_SHORT', params: { min: 8 } });
    expect(validatePassword('abcdefgh')).toEqual({ code: 'PASSWORD_WEAK' });
    expect(validatePassword('12345678')).toEqual({ code: 'PASSWORD_WEAK' });
    expect(validatePassword('a'.repeat(72) + '1')).toEqual({ code: 'TOO_LONG', params: { max: 72 } });
    expect(validatePassword('Passw0rdX')).toBeUndefined();
  });
  it('display name is trimmed, 2–50', () => {
    expect(validateDisplayName(' a ')).toEqual({ code: 'TOO_SHORT', params: { min: 2 } });
    expect(validateDisplayName('x'.repeat(51))).toEqual({ code: 'TOO_LONG', params: { max: 50 } });
    expect(validateDisplayName('ab')).toBeUndefined();
  });
  it('confirm', () => {
    expect(validateConfirm('a', 'b')).toEqual({ code: 'PASSWORD_MISMATCH' });
    expect(validateConfirm('a', 'a')).toBeUndefined();
  });
});
