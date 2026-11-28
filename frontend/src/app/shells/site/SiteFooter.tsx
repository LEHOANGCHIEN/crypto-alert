import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLastSymbol } from '../../../shared/nav/lastSymbol';
import { FooterSocial } from '../../../shared/ui/SocialLinks';

const CHARTS_URL = 'https://www.tradingview.com/lightweight-charts/';

/**
 * Full site footer (AC-UI-03, docs/design/v2/01-home.png): brand column + link columns.
 * Every link opens an existing page — columns grow only when their pages exist.
 */
export function SiteFooter({ flush = false }: { flush?: boolean }) {
  const { t } = useTranslation();
  const symbol = useLastSymbol((s) => s.symbol);
  // Columns list only pages that exist (AC-UI-03).
  const columns = [
    {
      id: 'products',
      title: 'footer.products',
      links: [
        { id: 'chart', to: `/chart/${symbol}`, label: 'nav.chart' },
        { id: 'overview', to: `/coin/${symbol}`, label: 'nav.overview' },
        { id: 'alerts', to: '/alerts', label: 'nav.alerts' },
        { id: 'notifications', to: '/notifications', label: 'nav.notifications' },
      ],
    },
    {
      id: 'about',
      title: 'footer.colAbout',
      links: [
        { id: 'about', to: '/about', label: 'static.about.title' },
        { id: 'faq', to: '/faq', label: 'static.faq.title' },
        { id: 'status', to: '/status', label: 'static.status.title' },
        { id: 'contact', to: '/contact', label: 'static.contact.title' },
      ],
    },
    { id: 'community', title: 'footer.colCommunity', links: [{ id: 'community-rules', to: '/community-rules', label: 'static.community-rules.title' }] },
    {
      id: 'policies',
      title: 'footer.colPolicies',
      links: [
        { id: 'terms', to: '/legal/terms', label: 'static.terms.title' },
        { id: 'privacy', to: '/legal/privacy', label: 'static.privacy.title' },
        { id: 'cookies', to: '/legal/cookies', label: 'static.cookies.title' },
        { id: 'disclaimer', to: '/legal/disclaimer', label: 'static.disclaimer.title' },
      ],
    },
  ];
  return (
    <footer data-testid="site-footer" className={`${flush ? '' : 'mt-16'} shrink-0 border-t border-border bg-bg px-4 py-10 text-body text-text-muted lg:px-8`}>
      <div className="mx-auto grid max-w-site gap-10 lg:grid-cols-footer">
        <div className="flex flex-col gap-2">
          <p className="text-section font-semibold text-text">{t('footer.brand')}</p>
          <p data-testid="footer-title" className="text-text">{t('footer.title')}</p>
          <p data-testid="footer-course">{t('footer.course')}</p>
          <FooterSocial />
          <p data-testid="footer-attribution">
            {t('footer.attribution')}{' '}
            <a href={CHARTS_URL} target="_blank" rel="noopener noreferrer" data-testid="footer-link-charts" className="text-accent hover:underline">
              {t('footer.chartsLink')}
            </a>
          </p>
          <p data-testid="footer-disclaimer">{t('footer.disclaimer')}</p>
          <p data-testid="footer-copyright">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((col) => (
            <div key={col.id} data-testid={`footer-col-${col.id}`} className="flex flex-col gap-2">
              <p className="text-meta font-semibold uppercase tracking-wide text-text-faint">{t(col.title)}</p>
              {col.links.map((l) => (
                <Link key={l.id} to={l.to} data-testid={`footer-link-${l.id}`} className="hover:text-text">
                  {t(l.label)}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
