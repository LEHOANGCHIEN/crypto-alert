import { useTranslation } from 'react-i18next';
import { StaticPage } from './StaticPage';
import { REPO_URL, STATIC_PAGES, type StaticPageId } from './pages';

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

/** Paragraph pages (about, contact, community rules, legal) and the FAQ. Text comes from `static.<id>.*`. */
export function ContentPage({ id }: { id: Exclude<StaticPageId, 'status'> }) {
  const { t } = useTranslation();
  const page = STATIC_PAGES.find((p) => p.id === id)!;
  const paragraphs = 'paragraphs' in page ? page.paragraphs : 0;
  const faq = 'faq' in page ? page.faq : 0;
  return (
    <StaticPage id={id}>
      {range(paragraphs).map((i) => (
        <p key={i}>{t(`static.${id}.p${i}`)}</p>
      ))}
      {range(faq).map((i) => (
        <section key={i} data-testid={`faq-item-${i}`}>
          <h2 className="mb-1 text-section font-semibold text-text">{t(`static.faq.q${i}`)}</h2>
          <p>{t(`static.faq.a${i}`)}</p>
        </section>
      ))}
      {id === 'contact' && (
        <p>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" data-testid="contact-repo-link" className="font-medium text-accent hover:underline">
            {t('static.repoLink')}: {REPO_URL}
          </a>
        </p>
      )}
    </StaticPage>
  );
}
