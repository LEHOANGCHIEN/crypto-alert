import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FOOTER_HIDDEN_KEY = 'crypto-alert.footer-hidden';

function readHidden(): boolean {
  try {
    return localStorage.getItem(FOOTER_HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function Footer() {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState<boolean>(readHidden);

  if (hidden) return null;

  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem(FOOTER_HIDDEN_KEY, '1');
    } catch {
      /* storage unavailable: hide for this visit only */
    }
  };

  return (
    <footer className="relative shrink-0 border-t border-border bg-surface px-10 py-2 text-center text-meta text-text-muted">
      <p data-testid="footer-title">{t('footer.title')}</p>
      <p data-testid="footer-disclaimer">{t('footer.disclaimer')}</p>
      <p data-testid="footer-course">{t('footer.course')}</p>
      <button
        type="button"
        data-testid="footer-close"
        aria-label={t('footer.close')}
        onClick={close}
        className="absolute right-2 top-2 rounded px-2 text-text-muted hover:bg-bg hover:text-text"
      >
        ×
      </button>
    </footer>
  );
}
