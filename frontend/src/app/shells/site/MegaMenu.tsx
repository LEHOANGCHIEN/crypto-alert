import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProductItems, type MenuItem } from './menuItems';

function ItemIcon({ d }: { d: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function MenuLink({ item, onNavigate }: { item: MenuItem; onNavigate: () => void }) {
  const { t } = useTranslation();
  return (
    <Link
      to={item.to}
      data-testid={`nav-${item.id}`}
      aria-current={item.active ? 'page' : undefined}
      onClick={onNavigate}
      className={`flex items-start gap-3 rounded-input px-3 py-2 hover:bg-surface-2 ${item.active ? 'bg-surface-2' : ''}`}
    >
      <ItemIcon d={item.icon} />
      <span className="flex flex-col">
        <span data-testid={`nav-${item.id}-label`} className="text-section font-medium text-text">
          {t(`nav.${item.id}`)}
        </span>
        <span className="text-body text-text-muted">{t(`nav.${item.id}Desc`)}</span>
      </span>
    </Link>
  );
}

/**
 * Desktop top menu "Products" with a mega-menu panel (AC-UI-09): opens on hover or click, Esc closes,
 * reachable with the keyboard (button + links). The trigger carries `aria-current="page"` inside this section.
 */
export function MegaMenu() {
  const { t } = useTranslation();
  const items = useProductItems();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inSection = items.some((i) => i.active);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <nav aria-label={t('nav.main')} data-testid="nav-main" className="flex items-center gap-1">
      <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        <button
          ref={buttonRef}
          type="button"
          data-testid="nav-products"
          aria-haspopup="true"
          aria-expanded={open}
          aria-current={inSection ? 'page' : undefined}
          onClick={() => setOpen(true)}
          className={`rounded-button px-3 py-1.5 text-section hover:bg-surface-2 ${inSection ? 'font-semibold text-text' : 'text-text-muted'}`}
        >
          {t('nav.products')}
        </button>
        {open && (
          <div data-testid="nav-products-panel" className="absolute left-0 top-full z-30 w-80 rounded-card border border-border bg-surface p-2">
            {items.map((i) => (
              <MenuLink key={i.id} item={i} onNavigate={() => setOpen(false)} />
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
