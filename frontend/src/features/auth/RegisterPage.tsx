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
import { useAuth } from './auth.store';
import { errorText, issueText } from './messages';

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
    <section data-testid="page-register" className="mx-auto w-full max-w-100 rounded-card border border-border bg-surface p-6">
      <h1 className="mb-4 text-page font-semibold">{t('auth.register.title')}</h1>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {formError && (
          <p role="alert" data-testid="form-error" className="rounded-input border border-danger p-3 text-body text-danger">
            {errorText(t, formError.err)}
          </p>
        )}
        <FormField name="email" type="email" autoComplete="email" label={t('fields.email')} value={form.values.email} error={issueText(t, form.issueOf('email'))} onChange={(e) => form.setValue('email', e.target.value)} onBlur={() => form.blur('email')} />
        <FormField name="displayName" autoComplete="nickname" label={t('fields.displayName')} value={form.values.displayName} error={issueText(t, form.issueOf('displayName'))} onChange={(e) => form.setValue('displayName', e.target.value)} onBlur={() => form.blur('displayName')} />
        <FormField name="password" type="password" autoComplete="new-password" label={t('fields.password')} value={form.values.password} error={issueText(t, form.issueOf('password'))} onChange={(e) => form.setValue('password', e.target.value)} onBlur={() => form.blur('password')} />
        <FormField name="confirmPassword" type="password" autoComplete="new-password" label={t('fields.confirmPassword')} value={form.values.confirmPassword} error={issueText(t, form.issueOf('confirmPassword'))} onChange={(e) => form.setValue('confirmPassword', e.target.value)} onBlur={() => form.blur('confirmPassword')} />
        <Button type="submit" disabled={busy} data-testid="submit-register">
          {t('auth.register.submit')}
        </Button>
      </form>
      <p className="mt-4 text-body text-text-muted">
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login" className="text-accent underline">
          {t('auth.register.toLogin')}
        </Link>
      </p>
    </section>
  );
}
