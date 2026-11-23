import type { TFunction } from 'i18next';
import { ApiError } from '../../shared/api/http';
import type { Issue } from '../../shared/validation/rules';

/** Field issue (client or server) → translated text. */
export function issueText(t: TFunction, issue: Issue | undefined): string | undefined {
  if (!issue) return undefined;
  return t(`validation.${issue.code}`, { ...issue.params, defaultValue: t('errors.UNKNOWN') });
}

/** Any thrown error → translated text; unknown codes fall back to the generic message (AC-I18N-03). */
export function errorText(t: TFunction, err: unknown): string {
  const code = err instanceof ApiError ? err.code : 'UNKNOWN';
  return t(`errors.${code}`, { defaultValue: t('errors.UNKNOWN') });
}
