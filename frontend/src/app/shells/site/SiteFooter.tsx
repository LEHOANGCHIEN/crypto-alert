import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLastSymbol } from '../../../shared/nav/lastSymbol';

const CHARTS_URL = 'https://www.tradingview.com/lightweight-charts/';

/**
 * Full site footer (AC-UI-03, docs/design/v2/01-home.png): brand column + link columns.
 * Every link opens an existing page — columns grow only when their pages exist.
 */
export function SiteFooter({ flush = false }: { flush?: boolean }) {
  const { t } = useTranslation();
  const symbol = useLastSymbol((s) => s.symbol);
  const products = [
    { id: 'chart', to: `/chart/${symbol}` },
    { id: 'overview', to: `/coin/${symbol}` },
    { id: 'alerts', to: '/alerts' },
    { id: 'notifications', to: '/notifications' },
  ];
  return (
    <footer data-testid="site-footer" className={`${flush ? '' : 'mt-16'} shrink-0 border-t border-border bg-bg px-4 py-10 text-body text-text-muted lg:px-8`}>
      <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-2">
          <p className="text-section font-semibold text-text">{t('footer.brand')}</p>
          <p data-testid="footer-title" className="text-text">{t('footer.title')}</p>
          <p data-testid="footer-course">{t('footer.course')}</p>
          <p data-testid="footer-attribution">
            {t('footer.attribution')}{' '}
            <a href={CHARTS_URL} target="_blank" rel="noopener noreferrer" data-testid="footer-link-charts" className="text-accent hover:underline">
              {t('footer.chartsLink')}
            </a>
          </p>
          <p data-testid="footer-disclaimer">{t('footer.disclaimer')}</p>
          <p data-testid="footer-copyright">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
        <div data-testid="footer-col-products" className="flex flex-col gap-2">
          <p className="text-meta font-semibold uppercase tracking-wide text-text-faint">{t('footer.products')}</p>
          {products.map((p) => (
            <Link key={p.id} to={p.to} data-testid={`footer-link-${p.id}`} className="hover:text-text">
              {t(`nav.${p.id}`)}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
