import type { FieldErrorCode } from '../api/types';

/** Client-side validation with the same rules and codes as API.md §3.1 / SPEC §4. */
export type Issue = { code: FieldErrorCode | 'PASSWORD_MISMATCH'; params?: { min?: number; max?: number } };

export function validateEmail(raw: string): Issue | undefined {
  const v = raw.trim();
  if (!v) return { code: 'REQUIRED' };
  if (v.length > 254) return { code: 'TOO_LONG', params: { max: 254 } };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { code: 'INVALID_EMAIL' };
  return undefined;
}

export function validatePassword(v: string): Issue | undefined {
  if (!v) return { code: 'REQUIRED' };
  if (v.length < 8) return { code: 'TOO_SHORT', params: { min: 8 } };
  if (v.length > 72) return { code: 'TOO_LONG', params: { max: 72 } };
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return { code: 'PASSWORD_WEAK' };
  return undefined;
}

export function validateRequired(v: string): Issue | undefined {
  return v ? undefined : { code: 'REQUIRED' };
}

export function validateDisplayName(raw: string): Issue | undefined {
  const v = raw.trim();
  if (!v) return { code: 'REQUIRED' };
  if (v.length < 2) return { code: 'TOO_SHORT', params: { min: 2 } };
  if (v.length > 50) return { code: 'TOO_LONG', params: { max: 50 } };
  return undefined;
}

export function validateConfirm(password: string, confirm: string): Issue | undefined {
  if (!confirm) return { code: 'REQUIRED' };
  return password === confirm ? undefined : { code: 'PASSWORD_MISMATCH' };
}
