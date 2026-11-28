import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumb } from '../../shared/ui/Breadcrumb';
import type { StaticPageId } from './pages';

/** Shell of every static page: breadcrumb, translated `h1`, body (≤ 768 px column). */
export function StaticPage({ id, children }: { id: StaticPageId; children: ReactNode }) {
  const { t } = useTranslation();
  const title = t(`static.${id}.title`);
  return (
    <article data-testid={`static-${id}`} className="mx-auto w-full max-w-3xl px-0 py-8 sm:px-4 lg:py-12">
      <Breadcrumb items={[{ label: title }]} />
      <h1 data-testid="static-title" className="mb-6 text-page-title font-extrabold text-text">
        {title}
      </h1>
      <div className="flex flex-col gap-4 text-section leading-relaxed text-text-muted">{children}</div>
    </article>
  );
}
