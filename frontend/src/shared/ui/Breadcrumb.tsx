import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PARENT = 'text-text-muted underline-offset-4 hover:text-text hover:underline focus-visible:text-text focus-visible:underline';

/** Breadcrumb: Home › … › current page (the last item is not a link, `aria-current="page"`). */
export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('static.breadcrumb')} data-testid="breadcrumb" className="mb-breadcrumb-gap text-breadcrumb font-breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link to="/" className={PARENT}>
            {t('static.home')}
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2">
            <span aria-hidden="true" className="text-text-faint">
              ›
            </span>
            {item.to && i < items.length - 1 ? (
              <Link to={item.to} className={PARENT}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-text">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
