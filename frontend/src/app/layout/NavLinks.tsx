import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLastSymbol } from '../../shared/nav/lastSymbol';
import { useIsDesktop } from '../../shared/nav/useIsDesktop';

type NavItem = { id: 'chart' | 'overview' | 'alerts' | 'notifications'; to: string; active: boolean };

function useNavItems(): NavItem[] {
  const symbol = useLastSymbol((s) => s.symbol);
  const { pathname } = useLocation();
  const is = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  return [
    { id: 'chart', to: `/chart/${symbol}`, active: is('/chart') },
    { id: 'overview', to: `/coin/${symbol}`, active: is('/coin') },
    { id: 'alerts', to: '/alerts', active: is('/alerts') },
    { id: 'notifications', to: '/notifications', active: is('/notifications') },
  ];
}

/** Header navigation (AC-UI-09): inline links from 1024 px, a menu button below. */
export function NavLinks() {
  const desktop = useIsDesktop();
  return desktop ? <InlineNav /> : <MenuNav />;
}

function InlineNav() {
  const { t } = useTranslation();
  const items = useNavItems();
  return (
    <nav aria-label={t('nav.main')} data-testid="nav-main" className="flex items-center gap-1">
      {items.map((i) => (
        <Link
          key={i.id}
          to={i.to}
          data-testid={`nav-${i.id}`}
          aria-current={i.active ? 'page' : undefined}
          className={`rounded-button px-3 py-1.5 text-section hover:bg-surface-2 ${i.active ? 'font-semibold text-text' : 'text-text-muted'}`}
        >
          {t(`nav.${i.id}`)}
        </Link>
      ))}
    </nav>
  );
}

function MenuNav() {
  const { t } = useTranslation();
  const items = useNavItems();
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid="nav-menu-button"
        aria-label={t('nav.menu')}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-button bg-surface-2 text-text"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {open && (
        <nav aria-label={t('nav.main')} data-testid="nav-main" className="absolute left-0 top-full z-30 mt-1 flex w-48 flex-col rounded-card border border-border bg-surface py-1">
          {items.map((i) => (
            <Link
              key={i.id}
              to={i.to}
              data-testid={`nav-${i.id}`}
              aria-current={i.active ? 'page' : undefined}
              onClick={() => setOpen(false)}
              className={`px-3 py-2 text-section hover:bg-surface-2 ${i.active ? 'font-semibold text-text' : 'text-text-muted'}`}
            >
              {t(`nav.${i.id}`)}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
