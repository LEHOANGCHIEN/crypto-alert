import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../shared/api/http';
import { Button } from '../../shared/ui/Button';
import { FormField } from '../../shared/ui/FormField';
import { useForm } from '../../shared/ui/useForm';
import { validateEmail, validateRequired, type Issue } from '../../shared/validation/rules';
import { useAuth } from '../../shared/auth/auth.store';
import { issueText, errorText } from '../../shared/i18n/errorText';

type Values = { email: string; password: string };
const validate = (v: Values): Partial<Record<keyof Values, Issue>> => {
  const out: Partial<Record<keyof Values, Issue>> = {};
  const e = validateEmail(v.email);
  if (e) out.email = e;
  const p = validateRequired(v.password);
  if (p) out.password = p;
  return out;
};

export function LoginPage() {
  const { t } = useTranslation();
  const login = useAuth((s) => s.login);
  const form = useForm<Values>({ email: '', password: '' }, validate);
  const [formError, setFormError] = useState<{ err: unknown } | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.beginSubmit()) return;
    setBusy(true);
    try {
      await login(form.values.email.trim(), form.values.password);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (!form.applyServerErrors(apiErr?.details)) setFormError({ err });
      form.setValue('password', ''); // AC-AUTH-05: password field cleared
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="page-login" className="mx-auto w-full max-w-100 rounded-card border border-border bg-surface p-6">
      <h1 className="mb-4 text-page font-semibold">{t('auth.login.title')}</h1>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {formError && (
          <p role="alert" data-testid="form-error" className="rounded-input border border-danger p-3 text-body text-danger">
            {errorText(t, formError.err)}
          </p>
        )}
        <FormField name="email" type="email" autoComplete="email" label={t('fields.email')} value={form.values.email} error={issueText(t, form.issueOf('email'))} onChange={(e) => form.setValue('email', e.target.value)} onBlur={() => form.blur('email')} />
        <FormField name="password" type="password" autoComplete="current-password" label={t('fields.password')} value={form.values.password} error={issueText(t, form.issueOf('password'))} onChange={(e) => form.setValue('password', e.target.value)} onBlur={() => form.blur('password')} />
        <Button type="submit" disabled={busy} data-testid="submit-login">
          {t('auth.login.submit')}
        </Button>
      </form>
      <p className="mt-4 text-body text-text-muted">
        {t('auth.login.noAccount')}{' '}
        <Link to="/register" className="text-accent underline">
          {t('auth.login.toRegister')}
        </Link>
      </p>
    </section>
  );
}
