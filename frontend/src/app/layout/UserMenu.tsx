import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../shared/auth/auth.store';

/** Avatar button + dropdown (account link, logout). */
export function UserMenu() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const initial = user.displayName.trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <span data-testid="user-display-name" className="hidden text-body text-text sm:inline">
        {user.displayName}
      </span>
      <button
        type="button"
        data-testid="user-menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('menu.user')}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-button bg-accent text-body font-semibold text-bg"
      >
        {initial}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-10 z-40 flex w-44 flex-col rounded-card border border-border bg-surface p-1">
          <Link role="menuitem" to="/account" data-testid="menu-account" onClick={() => setOpen(false)} className="rounded-input px-3 py-2 text-body text-text hover:bg-surface-2">
            {t('menu.account')}
          </Link>
          <button
            type="button"
            role="menuitem"
            data-testid="menu-logout"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            className="rounded-input px-3 py-2 text-left text-body text-text hover:bg-surface-2"
          >
            {t('menu.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
