import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../shared/auth/auth.store';

export const DEFAULT_AFTER_LOGIN = '/';

/** Protected routes: guests go to /login and come back afterwards (return-to). */
export function RequireAuth() {
  const status = useAuth((s) => s.status);
  const location = useLocation();
  const { t } = useTranslation();
  if (status === 'loading') return <p data-testid="auth-loading" className="p-4 text-text-muted">{t('common.loading')}</p>;
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <Outlet />;
}

/** /login and /register: logged-in users are redirected to the return-to page (default /). */
export function GuestOnly() {
  const status = useAuth((s) => s.status);
  const location = useLocation();
  const { t } = useTranslation();
  if (status === 'loading') return <p data-testid="auth-loading" className="p-4 text-text-muted">{t('common.loading')}</p>;
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from.startsWith('/') ? from : DEFAULT_AFTER_LOGIN} replace />;
  }
  return <Outlet />;
}
