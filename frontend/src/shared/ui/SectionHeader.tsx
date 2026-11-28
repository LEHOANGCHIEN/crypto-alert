import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Section title (24 px / 700) with an optional `›` link, plus an optional slot for pill tabs. */
export function SectionHeader({ title, to, children, testId }: { title: string; to?: string; children?: ReactNode; testId?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4">
      <h2 data-testid={testId} className="text-site-section font-bold text-text">
        {to ? (
          <Link to={to} className="hover:text-accent">
            {title} <span aria-hidden="true">›</span>
          </Link>
        ) : (
          title
        )}
      </h2>
      {children}
    </div>
  );
}
