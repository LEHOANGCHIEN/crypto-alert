import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSymbols } from '../market/queries';
import { coinName } from '../market/coin-names';
import { useLastSymbol } from '../nav/lastSymbol';
import { matchPages, searchPairs } from './lib/search';
import { readRecent } from './lib/recent';
import { useSearch } from './search.store';

type Item = { kind: 'pair' | 'recent' | 'page'; key: string; label: string; sub?: string; to: string };

/**
 * Search dialog (AC-SITE-02): Ctrl+K / Cmd+K or any trigger opens it; pairs (symbol, base asset, known name)
 * and pages; ↑/↓ + Enter, Esc closes and returns the focus to the trigger; empty query = recent pairs.
 */
export function SearchDialog() {
  const open = useSearch((s) => s.open);
  const show = useSearch((s) => s.show);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      // Ctrl+K (Windows/Linux) or Cmd+K (macOS)
      if (e.key.toLowerCase() !== 'k' || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if (useSearch.getState().open) return; // keep the original trigger for the focus return
      const active = document.activeElement;
      show(active instanceof HTMLElement && active !== document.body ? active : null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show]);

  return open ? <SearchPanel /> : null;
}

function SearchPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initialQuery = useSearch((s) => s.initialQuery);
  const trigger = useSearch((s) => s.trigger);
  const hide = useSearch((s) => s.hide);
  const symbols = useSymbols();
  const lastSymbol = useLastSymbol((s) => s.symbol);
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const recent = useMemo(() => readRecent(), []);

  useEffect(() => inputRef.current?.focus(), []);

  const items = useMemo<Item[]>(() => {
    const all = symbols.data ?? [];
    const pairItem = (kind: Item['kind'], s: { symbol: string; baseAsset: string }): Item => ({
      kind,
      key: `${kind}-${s.symbol}`,
      label: `${s.baseAsset}/USDT`,
      sub: coinName(s.baseAsset),
      to: `/coin/${s.symbol}`,
    });
    if (!query.trim()) {
      return recent.flatMap((sym) => {
        const info = all.find((x) => x.symbol === sym);
        return info ? [pairItem('recent', info)] : [];
      });
    }
    const pages = [
      { id: 'chart', label: t('nav.chart'), to: `/chart/${lastSymbol}` },
      { id: 'overview', label: t('nav.overview'), to: `/coin/${lastSymbol}` },
      { id: 'alerts', label: t('nav.alerts'), to: '/alerts' },
      { id: 'notifications', label: t('nav.notifications'), to: '/notifications' },
    ];
    return [
      ...searchPairs(all, query).map((s) => pairItem('pair', s)),
      ...matchPages(pages, query).map((p): Item => ({ kind: 'page', key: `page-${p.id}`, label: p.label, to: p.to })),
    ];
  }, [symbols.data, query, recent, t, lastSymbol]);

  const close = () => {
    hide();
    trigger?.focus();
  };
  const go = (item: Item) => {
    hide();
    navigate(item.to);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown' && items.length > 0) {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length > 0) {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[Math.min(active, items.length - 1)];
      if (item) go(item);
    } else if (e.key === 'Tab') {
      e.preventDefault(); // focus stays in the input (options are chosen with the arrow keys)
    }
  };

  const sectionLabel = (kind: Item['kind']) => t(kind === 'page' ? 'search.pages' : kind === 'recent' ? 'search.recent' : 'search.pairs');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-bg/70 px-4 pt-24" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('search.title')}
        data-testid="search-dialog"
        onKeyDown={onKeyDown}
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-card border border-border bg-surface"
      >
        <input
          ref={inputRef}
          data-testid="search-input"
          role="combobox"
          aria-expanded="true"
          aria-controls="search-results"
          aria-activedescendant={items.length > 0 ? `search-opt-${Math.min(active, items.length - 1)}` : undefined}
          value={query}
          placeholder={t('search.placeholder')}
          aria-label={t('search.title')}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          className="h-12 border-b border-border bg-transparent px-4 text-section text-text outline-none placeholder:text-text-faint"
        />
        <ul id="search-results" role="listbox" aria-label={t('search.title')} data-testid="search-results" className="min-h-0 overflow-auto p-2">
          {items.map((item, i) => {
            const selected = i === Math.min(active, items.length - 1);
            const header = i === 0 || items[i - 1]!.kind !== item.kind;
            return (
              <li key={item.key} role="presentation">
                {header && <p className="px-3 pb-1 pt-2 text-meta font-semibold uppercase tracking-wide text-text-faint">{sectionLabel(item.kind)}</p>}
                <div
                  id={`search-opt-${i}`}
                  role="option"
                  aria-selected={selected}
                  data-testid={`search-result-${item.key}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex cursor-pointer items-center gap-3 rounded-input px-3 py-2 text-section ${selected ? 'bg-surface-3' : ''}`}
                >
                  <span className="font-semibold text-text">{item.label}</span>
                  {item.sub && <span className="text-text-muted">{item.sub}</span>}
                </div>
              </li>
            );
          })}
        </ul>
        {items.length === 0 && (
          <p data-testid={query.trim() ? 'search-empty' : 'search-hint'} className="px-4 py-6 text-center text-body text-text-muted">
            {query.trim() ? t('search.empty') : t('search.hint')}
          </p>
        )}
      </div>
    </div>
  );
}
