import { useTranslation } from 'react-i18next';
import { siFacebook, siGithub, siInstagram, siReddit, siThreads, siX } from 'simple-icons';
import { SOCIAL_LINKS, type SocialId, type SocialLink } from '../config/social';

// Brand icons come from the CC0 `simple-icons` package. LinkedIn is not in the package, so it (like any missing
// brand) gets a neutral generic link icon — never a hand-drawn logo.
const ICON_PATHS: Partial<Record<SocialId, string>> = {
  facebook: siFacebook.path,
  github: siGithub.path,
  instagram: siInstagram.path,
  x: siX.path,
  reddit: siReddit.path,
  threads: siThreads.path,
};

function SocialIcon({ id }: { id: SocialId }) {
  const path = ICON_PATHS[id];
  if (path) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor">
        <path d={path} />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
  );
}

const LINK_CLASS =
  'inline-flex min-h-8 min-w-8 items-center justify-center gap-2 rounded-button text-text-muted hover:text-text focus-visible:text-text';

function useAriaLabel() {
  const { t } = useTranslation();
  return (link: SocialLink) => t('social.ariaLabel', { label: link.label });
}

/** Row of icon-only links (footer brand column). Test ids: `footer-social`, `footer-social-<id>`. */
export function FooterSocial() {
  const aria = useAriaLabel();
  return (
    <div data-testid="footer-social" className="mt-1 flex flex-wrap gap-1">
      {SOCIAL_LINKS.map((l) => (
        <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" aria-label={aria(l)} title={l.label} data-testid={`footer-social-${l.id}`} className={LINK_CLASS}>
          <SocialIcon id={l.id} />
        </a>
      ))}
    </div>
  );
}

/** Same list with icon + label (`/contact`). Test ids: `contact-social`, `contact-social-<id>`. */
export function ContactSocial() {
  const aria = useAriaLabel();
  return (
    <ul data-testid="contact-social" className="flex flex-col gap-2">
      {SOCIAL_LINKS.map((l) => (
        <li key={l.id}>
          <a href={l.url} target="_blank" rel="noopener noreferrer" aria-label={aria(l)} data-testid={`contact-social-${l.id}`} className={`${LINK_CLASS} justify-start`}>
            <SocialIcon id={l.id} />
            <span>{l.label}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
