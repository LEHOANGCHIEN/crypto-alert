import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/** Breadcrumb: Home › … › current page (the last item is not a link). */
export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('static.breadcrumb')} data-testid="breadcrumb" className="mb-6 text-meta text-text-faint">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link to="/" className="hover:text-text">
            {t('static.home')}
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            {item.to && i < items.length - 1 ? (
              <Link to={item.to} className="hover:text-text">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-text-muted">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
