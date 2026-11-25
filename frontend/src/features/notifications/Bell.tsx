import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { badgeText } from './lib/badge';
import { NotificationsPanel } from './NotificationsPanel';
import { useNotifications } from './useNotifications';

/** Header bell with unread badge; opens the notifications panel (logged-in users only). */
export function Bell() {
  const { t } = useTranslation();
  const list = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const badge = badgeText(list.data?.unreadCount ?? 0);

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
        data-testid="bell"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={badge ? t('notifications.bellUnread', { count: list.data?.unreadCount ?? 0 }) : t('notifications.bell')}
        title={t('notifications.title')}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-button bg-surface-2 text-text"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {badge && (
          <span
            data-testid="bell-badge"
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-meta font-semibold leading-none text-bg"
          >
            {badge}
          </span>
        )}
      </button>
      {open && <NotificationsPanel onClose={() => setOpen(false)} />}
    </div>
  );
}
