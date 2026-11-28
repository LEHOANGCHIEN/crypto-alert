import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProductItems } from './menuItems';
import { MenuLink } from './MegaMenu';

/** Below 1024 px the menus move into a menu button that opens a drawer (AC-UI-09). */
export function MobileDrawer() {
  const { t } = useTranslation();
  const items = useProductItems();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
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
        <div className="fixed inset-0 top-site-header z-30 flex">
          <nav aria-label={t('nav.main')} data-testid="nav-main" className="flex h-full w-72 max-w-full flex-col gap-1 overflow-auto border-r border-border bg-surface p-3">
            <span className="px-3 pb-1 text-meta font-semibold uppercase tracking-wide text-text-faint">{t('nav.products')}</span>
            {items.map((i) => (
              <MenuLink key={i.id} item={i} onNavigate={() => setOpen(false)} />
            ))}
          </nav>
          <button type="button" aria-label={t('nav.close')} className="flex-1 bg-bg/60" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
