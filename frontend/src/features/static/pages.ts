export const REPO_URL = 'https://github.com/LEHOANGCHIEN/crypto-alert';

/** Static pages (F14, AC-SITE-03): route path, i18n id and the number of body paragraphs / FAQ pairs. */
export const STATIC_PAGES = [
  { id: 'about', path: '/about', paragraphs: 4 },
  { id: 'faq', path: '/faq', faq: 5 },
  { id: 'status', path: '/status' },
  { id: 'contact', path: '/contact', paragraphs: 2 },
  { id: 'community-rules', path: '/community-rules', paragraphs: 5 },
  { id: 'terms', path: '/legal/terms', paragraphs: 5, legal: true },
  { id: 'privacy', path: '/legal/privacy', paragraphs: 5, legal: true },
  { id: 'cookies', path: '/legal/cookies', paragraphs: 4, legal: true },
  { id: 'disclaimer', path: '/legal/disclaimer', paragraphs: 4, legal: true },
] as const;

export type StaticPageId = (typeof STATIC_PAGES)[number]['id'];
