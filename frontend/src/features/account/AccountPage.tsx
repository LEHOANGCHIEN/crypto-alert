import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../shared/api/http';
import type { Locale, Theme } from '../../shared/api/types';
import { Button } from '../../shared/ui/Button';
import { FormField } from '../../shared/ui/FormField';
import { toast } from '../../shared/ui/toast';
import { useForm } from '../../shared/ui/useForm';
import { validateConfirm, validateDisplayName, validatePassword, validateRequired, type Issue } from '../../shared/validation/rules';
import { useAuth } from '../../shared/auth/auth.store';
import { errorText, issueText } from '../../shared/i18n/errorText';
import { usePreferenceActions } from '../../app/usePreferenceActions';

const timezoneOptions = (current: string) =>
  [...new Set(['UTC', 'Asia/Ho_Chi_Minh', current, ...Intl.supportedValuesOf('timeZone')])].sort();

function ProfileForm() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user)!;
  const updateProfile = useAuth((s) => s.updateProfile);
  const form = useForm<{ displayName: string }>({ displayName: user.displayName }, (v) => {
    const e = validateDisplayName(v.displayName);
    return e ? { displayName: e } : {};
  });
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.beginSubmit()) return;
    setBusy(true);
    try {
      await updateProfile(form.values.displayName.trim());
      toast.success(t('account.profile.saved'));
    } catch (err) {
      if (!form.applyServerErrors(err instanceof ApiError ? err.details : undefined)) toast.error(errorText(t, err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={onSubmit} data-testid="profile-form" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6">
      <h2 className="text-section font-semibold">{t('account.profile.title')}</h2>
      <FormField name="email" label={t('fields.email')} value={user.email} readOnly />
      <FormField name="displayName" label={t('fields.displayName')} value={form.values.displayName} error={issueText(t, form.issueOf('displayName'))} onChange={(e) => form.setValue('displayName', e.target.value)} onBlur={() => form.blur('displayName')} />
      <Button type="submit" disabled={busy} data-testid="save-profile" className="self-start">
        {t('account.save')}
      </Button>
    </form>
  );
}

type PwValues = { currentPassword: string; newPassword: string; confirmPassword: string };
const validatePw = (v: PwValues): Partial<Record<keyof PwValues, Issue>> => {
  const out: Partial<Record<keyof PwValues, Issue>> = {};
  const c = validateRequired(v.currentPassword);
  if (c) out.currentPassword = c;
  const n = validatePassword(v.newPassword);
  if (n) out.newPassword = n;
  const m = validateConfirm(v.newPassword, v.confirmPassword);
  if (m) out.confirmPassword = m;
  return out;
};

function PasswordForm() {
  const { t } = useTranslation();
  const changePassword = useAuth((s) => s.changePassword);
  const empty: PwValues = { currentPassword: '', newPassword: '', confirmPassword: '' };
  const form = useForm<PwValues>(empty, validatePw);
  const [wrongCurrent, setWrongCurrent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setWrongCurrent(false);
    if (!form.beginSubmit()) return;
    setBusy(true);
    try {
      await changePassword(form.values.currentPassword, form.values.newPassword);
      toast.success(t('account.password.changed'));
      form.setValues(empty);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'WRONG_CURRENT_PASSWORD') setWrongCurrent(true);
      else if (!form.applyServerErrors(err instanceof ApiError ? err.details : undefined)) toast.error(errorText(t, err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={onSubmit} data-testid="password-form" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6">
      <h2 className="text-section font-semibold">{t('account.password.title')}</h2>
      <FormField name="currentPassword" type="password" autoComplete="current-password" label={t('fields.currentPassword')} value={form.values.currentPassword} error={wrongCurrent ? t('errors.WRONG_CURRENT_PASSWORD') : issueText(t, form.issueOf('currentPassword'))} onChange={(e) => { setWrongCurrent(false); form.setValue('currentPassword', e.target.value); }} onBlur={() => form.blur('currentPassword')} />
      <FormField name="newPassword" type="password" autoComplete="new-password" label={t('fields.newPassword')} value={form.values.newPassword} error={issueText(t, form.issueOf('newPassword'))} onChange={(e) => form.setValue('newPassword', e.target.value)} onBlur={() => form.blur('newPassword')} />
      <FormField name="confirmPassword" type="password" autoComplete="new-password" label={t('fields.confirmPassword')} value={form.values.confirmPassword} error={issueText(t, form.issueOf('confirmPassword'))} onChange={(e) => form.setValue('confirmPassword', e.target.value)} onBlur={() => form.blur('confirmPassword')} />
      <Button type="submit" disabled={busy} data-testid="save-password" className="self-start">
        {t('account.password.submit')}
      </Button>
    </form>
  );
}

function PreferencesForm() {
  const { t } = useTranslation();
  const settings = useAuth((s) => s.user)!.settings;
  const { savePreferences } = usePreferenceActions();
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const selectClass = 'h-10 rounded-input border border-border bg-surface-2 px-3 text-body text-text';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await savePreferences(draft);
      toast.success(t('account.preferences.saved'));
    } catch (err) {
      toast.error(errorText(t, err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={onSubmit} data-testid="preferences-form" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6">
      <h2 className="text-section font-semibold">{t('account.preferences.title')}</h2>
      <div className="flex flex-col gap-1">
        <label htmlFor="pref-locale" className="text-meta font-medium text-text-muted">{t('fields.locale')}</label>
        <select id="pref-locale" data-testid="pref-locale" className={selectClass} value={draft.locale} onChange={(e) => setDraft({ ...draft, locale: e.target.value as Locale })}>
          <option value="vi">{t('account.preferences.localeVi')}</option>
          <option value="en">{t('account.preferences.localeEn')}</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="pref-theme" className="text-meta font-medium text-text-muted">{t('fields.theme')}</label>
        <select id="pref-theme" data-testid="pref-theme" className={selectClass} value={draft.theme} onChange={(e) => setDraft({ ...draft, theme: e.target.value as Theme })}>
          <option value="dark">{t('theme.dark')}</option>
          <option value="light">{t('theme.light')}</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="pref-timezone" className="text-meta font-medium text-text-muted">{t('fields.timezone')}</label>
        <select id="pref-timezone" data-testid="pref-timezone" className={selectClass} value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}>
          {timezoneOptions(draft.timezone).map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={busy} data-testid="save-preferences" className="self-start">
        {t('account.save')}
      </Button>
    </form>
  );
}

export function AccountPage() {
  const { t } = useTranslation();
  return (
    <section data-testid="page-account" className="mx-auto flex w-full max-w-160 flex-col gap-4">
      <h1 className="text-page font-semibold">{t('account.title')}</h1>
      <ProfileForm />
      <PasswordForm />
      <PreferencesForm />
    </section>
  );
}
