import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const FEATURES = ['feature1', 'feature2', 'feature3'] as const;

/**
 * Two-column shell of /login and /register (AC-UI-10): brand panel (≥ 1024 px) + the form centered at 440 px.
 * Below 1024 px only the form remains, with 16 px side margins.
 */
export function AuthShell({ testId, title, subtitle, children }: { testId: string; title: string; subtitle: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div data-testid="auth-layout" className="grid flex-1 grid-cols-1 lg:grid-cols-2">
      <aside data-testid="auth-brand-panel" className="hidden items-center border-r border-border bg-surface p-8 lg:flex">
        <div data-testid="auth-brand-content" className="mx-auto flex w-full max-w-auth-content flex-col gap-8">
          <h2 className="text-auth-headline font-semibold leading-tight">{t('auth.brand.headline')}</h2>
          <ul className="flex flex-col gap-4">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-section text-text-muted">
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                {t(`auth.brand.${f}`)}
              </li>
            ))}
          </ul>
          <svg aria-hidden="true" viewBox="0 0 360 100" className="h-24 w-full text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
            <polyline points="0,96 34,82 68,88 104,60 140,72 176,40 212,52 248,24 284,32 320,8 360,12" />
          </svg>
        </div>
      </aside>
      <section data-testid="auth-form-column" className="flex items-center justify-center px-4 py-8">
        <div data-testid={testId} className="w-full max-w-auth-form">
          <h1 className="text-auth-title font-semibold leading-tight">{title}</h1>
          <p className="mb-6 mt-1 text-body text-text-muted">{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
