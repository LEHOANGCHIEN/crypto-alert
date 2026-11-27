import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../shared/api/http';
import type { Locale } from '../../shared/api/types';
import { Button } from '../../shared/ui/Button';
import { FormField } from '../../shared/ui/FormField';
import { useForm } from '../../shared/ui/useForm';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { validateConfirm, validateDisplayName, validateEmail, validatePassword, type Issue } from '../../shared/validation/rules';
import { useAuth } from '../../shared/auth/auth.store';
import { errorText, issueText } from '../../shared/i18n/errorText';
import { AuthShell } from './AuthShell';

type Values = { email: string; displayName: string; password: string; confirmPassword: string };
const validate = (v: Values): Partial<Record<keyof Values, Issue>> => {
  const out: Partial<Record<keyof Values, Issue>> = {};
  const e = validateEmail(v.email);
  if (e) out.email = e;
  const n = validateDisplayName(v.displayName);
  if (n) out.displayName = n;
  const p = validatePassword(v.password);
  if (p) out.password = p;
  const c = validateConfirm(v.password, v.confirmPassword);
  if (c) out.confirmPassword = c;
  return out;
};

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const register = useAuth((s) => s.register);
  const form = useForm<Values>({ email: '', displayName: '', password: '', confirmPassword: '' }, validate);
  const [formError, setFormError] = useState<{ err: unknown } | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.beginSubmit()) return;
    setBusy(true);
    try {
      // The guest's current language/theme become the new account's settings.
      await register({
        email: form.values.email.trim(),
        displayName: form.values.displayName.trim(),
        password: form.values.password,
        locale: i18n.language as Locale,
        theme,
      });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.code === 'EMAIL_TAKEN') setFormError({ err });
      else if (!form.applyServerErrors(apiErr?.details)) setFormError({ err });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell testId="page-register" title={t('auth.register.title')} subtitle={t('auth.register.subtitle')}>
      <form data-testid="auth-form" noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {formError && (
          <p role="alert" data-testid="form-error" className="rounded-input border border-danger p-3 text-body text-danger">
            {errorText(t, formError.err)}
          </p>
        )}
        <FormField size="lg" name="email" type="email" autoComplete="email" placeholder={t('auth.placeholders.email')} label={t('fields.email')} value={form.values.email} error={issueText(t, form.issueOf('email'))} onChange={(e) => form.setValue('email', e.target.value)} onBlur={() => form.blur('email')} />
        <FormField size="lg" name="displayName" autoComplete="nickname" placeholder={t('auth.placeholders.displayName')} label={t('fields.displayName')} value={form.values.displayName} error={issueText(t, form.issueOf('displayName'))} onChange={(e) => form.setValue('displayName', e.target.value)} onBlur={() => form.blur('displayName')} />
        <FormField size="lg" name="password" type="password" autoComplete="new-password" placeholder={t('auth.placeholders.password')} label={t('fields.password')} value={form.values.password} error={issueText(t, form.issueOf('password'))} onChange={(e) => form.setValue('password', e.target.value)} onBlur={() => form.blur('password')} />
        <FormField size="lg" name="confirmPassword" type="password" autoComplete="new-password" placeholder={t('auth.placeholders.confirmPassword')} label={t('fields.confirmPassword')} value={form.values.confirmPassword} error={issueText(t, form.issueOf('confirmPassword'))} onChange={(e) => form.setValue('confirmPassword', e.target.value)} onBlur={() => form.blur('confirmPassword')} />
        <Button size="lg" type="submit" disabled={busy} data-testid="submit-register">
          {t('auth.register.submit')}
        </Button>
      </form>
      <p className="mt-6 text-body text-text-muted">
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login" className="text-accent underline">
          {t('auth.register.toLogin')}
        </Link>
      </p>
    </AuthShell>
  );
}
