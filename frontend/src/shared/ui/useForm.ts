import { useCallback, useMemo, useState } from 'react';
import type { FieldError } from '../api/types';
import type { Issue } from '../validation/rules';

type Errors<T> = Partial<Record<keyof T, Issue>>;

/**
 * Tiny form state: client validation (shown after blur or submit) + server field errors
 * (cleared as soon as that field is edited).
 */
export function useForm<T extends Record<string, string>>(initial: T, validate: (v: T) => Errors<T>) {
  const [values, setValues] = useState<T>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [server, setServer] = useState<Errors<T>>({});
  const [submitted, setSubmitted] = useState(false);

  const client = useMemo(() => validate(values), [validate, values]);

  const setValue = useCallback((key: keyof T, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setServer((s) => {
      if (!s[key]) return s;
      const next = { ...s };
      delete next[key];
      return next;
    });
  }, []);

  const blur = useCallback((key: keyof T) => setTouched((t) => ({ ...t, [key]: true })), []);

  const issueOf = (key: keyof T): Issue | undefined => server[key] ?? (touched[key] || submitted ? client[key] : undefined);

  /** Returns true when the client rules pass (and marks every field as shown). */
  const beginSubmit = (): boolean => {
    setSubmitted(true);
    return Object.keys(client).length === 0;
  };

  const applyServerErrors = (details: FieldError[] | undefined): boolean => {
    const next: Errors<T> = {};
    for (const d of details ?? []) if (d.field in values) next[d.field as keyof T] = { code: d.code, params: d.params };
    setServer(next);
    return Object.keys(next).length > 0;
  };

  return { values, setValue, setValues, blur, issueOf, beginSubmit, applyServerErrors };
}
