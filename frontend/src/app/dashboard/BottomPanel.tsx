import { useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Alert, Notification } from '../../shared/api/types';
import { useAuth } from '../../shared/auth/auth.store';
import { useFormat } from '../../shared/format/useFormat';
import { BottomResizeHandle } from '../../shared/layout/BottomResizeHandle';
import { clampBottom, defaultBottom, maxBottom } from '../../shared/layout/layout';
import { useLayout } from '../../shared/layout/layout.store';
import { useSymbols, useTickers } from '../../shared/market/queries';
import { distancePercent, useAlerts, useDeleteAlert } from '../../features/alerts';
import { useMarkRead, useNotificationFormat, useNotifications } from '../../features/notifications';

type Tab = 'active' | 'triggered' | 'notifications';
const TABS: Tab[] = ['active', 'triggered', 'notifications'];
const DEFAULT_PRECISION = 2;

const TH = 'px-3 py-2 text-left text-meta font-medium uppercase text-text-faint';
const TD = 'px-3 py-2 text-row';

/**
 * Bottom panel under the chart (desktop only, AC-ALERT-11): Active alerts / Triggered / Notifications,
 * optionally filtered to the current pair. Collapsible to its tab row, resizable (state in `crypto-alert.layout`).
 */
export function BottomPanel({ symbol, centerHeight }: { symbol: string; centerHeight: number }) {
  const { t } = useTranslation();
  const authed = useAuth((s) => s.status === 'authenticated');
  const stored = useLayout((s) => s.bottom) ?? defaultBottom();
  const setCollapsed = useLayout((s) => s.setBottomCollapsed);
  const [tab, setTab] = useState<Tab>('active');
  const [currentOnly, setCurrentOnly] = useState(false);

  const alerts = useAlerts();
  const notifications = useNotifications();
  const matches = (s: string) => !currentOnly || s === symbol;
  const active = (alerts.data ?? []).filter((a) => a.status === 'ACTIVE' && matches(a.symbol));
  const triggered = (alerts.data ?? []).filter((a) => a.status === 'TRIGGERED' && matches(a.symbol));
  const notes = (notifications.data?.items ?? []).filter((n) => matches(n.payload.symbol));

  const max = maxBottom(centerHeight);
  const height = clampBottom(stored.height, centerHeight);

  return (
    <>
      {!stored.collapsed && <BottomResizeHandle height={height} max={max} />}
      <section
        data-testid="bottom-panel"
        data-collapsed={stored.collapsed}
        aria-label={t('bottomPanel.label')}
        style={{ '--dash-bottom': `${height}px` } as CSSProperties}
        className={`hidden min-h-0 shrink-0 flex-col border-t border-border bg-surface lg:flex ${stored.collapsed ? '' : 'lg:h-(--dash-bottom)'}`}
      >
        <div className="flex h-toolbar shrink-0 items-center gap-4 border-b border-border px-3">
          <div role="tablist" aria-label={t('bottomPanel.label')} className="flex h-full items-stretch gap-4">
            {TABS.map((id) => {
              const label =
                id === 'active' ? t('bottomPanel.tabs.active', { count: active.length }) : id === 'triggered' ? t('bottomPanel.tabs.triggered') : t('bottomPanel.tabs.notifications');
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  data-testid={`bottom-tab-${id}`}
                  aria-selected={tab === id}
                  onClick={() => {
                    setTab(id);
                    if (stored.collapsed) setCollapsed(false);
                  }}
                  className={`border-b-2 px-1 text-section ${tab === id ? 'border-accent font-semibold text-text' : 'border-transparent text-text-muted hover:text-text'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
          <label className="flex items-center gap-2 text-body text-text-muted">
            <input type="checkbox" data-testid="bottom-current-only" checked={currentOnly} onChange={(e) => setCurrentOnly(e.target.checked)} className="accent-accent" />
            {t('bottomPanel.currentOnly')}
          </label>
          <button
            type="button"
            data-testid={stored.collapsed ? 'panel-expand-bottom' : 'panel-collapse-bottom'}
            aria-label={t(stored.collapsed ? 'layout.expand.bottom' : 'layout.collapse.bottom')}
            title={t(stored.collapsed ? 'layout.expand.bottom' : 'layout.collapse.bottom')}
            aria-expanded={!stored.collapsed}
            onClick={() => setCollapsed(!stored.collapsed)}
            className="flex h-6 w-6 items-center justify-center rounded-chip text-text-muted hover:bg-surface-3 hover:text-text"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={stored.collapsed ? 'M3 10l5-5 5 5' : 'M3 6l5 5 5-5'} />
            </svg>
          </button>
        </div>
        {!stored.collapsed && (
          <div data-testid="bottom-panel-body" className="min-h-0 flex-1 overflow-auto">
            {!authed ? (
              <p data-testid="bottom-login-prompt" className="p-4 text-body text-text-muted">
                {t('bottomPanel.loginPrompt')}{' '}
                <Link to="/login" data-testid="bottom-login-link" className="font-medium text-accent">
                  {t('nav.login')}
                </Link>
              </p>
            ) : tab === 'active' ? (
              <AlertTable kind="active" alerts={active} />
            ) : tab === 'triggered' ? (
              <AlertTable kind="triggered" alerts={triggered} />
            ) : (
              <NotificationRows items={notes} />
            )}
          </div>
        )}
      </section>
    </>
  );
}

function usePairs() {
  const symbols = useSymbols();
  return useMemo(() => new Map((symbols.data ?? []).map((s) => [s.symbol, s])), [symbols.data]);
}

function AlertTable({ kind, alerts }: { kind: 'active' | 'triggered'; alerts: Alert[] }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const pairs = usePairs();
  const tickers = useTickers();
  const remove = useDeleteAlert();
  const last = useMemo(() => new Map((tickers.data ?? []).map((x) => [x.symbol, x.lastPrice])), [tickers.data]);
  const price = (symbol: string, v: number) => fmt.price(v, pairs.get(symbol)?.pricePrecision ?? DEFAULT_PRECISION);

  if (alerts.length === 0) {
    return (
      <p data-testid={`bottom-${kind}-empty`} className="p-4 text-body text-text-muted">
        {t(`bottomPanel.empty.${kind}`)}
      </p>
    );
  }
  return (
    <table data-testid={`bottom-${kind}`} className="w-full border-collapse">
      <thead>
        <tr>
          <th className={TH}>{t('bottomPanel.columns.pair')}</th>
          <th className={TH}>{t('bottomPanel.columns.condition')}</th>
          <th className={TH}>{t('bottomPanel.columns.target')}</th>
          {kind === 'active' && <th className={TH}>{t('bottomPanel.columns.current')}</th>}
          {kind === 'active' && <th className={TH}>{t('bottomPanel.columns.distance')}</th>}
          <th className={TH}>{t(kind === 'active' ? 'bottomPanel.columns.createdAt' : 'bottomPanel.columns.triggeredAt')}</th>
          {kind === 'active' && <th className={TH}><span className="sr-only">{t('bottomPanel.columns.actions')}</span></th>}
        </tr>
      </thead>
      <tbody>
        {alerts.map((a) => {
          const info = pairs.get(a.symbol);
          const current = last.get(a.symbol);
          const distance = distancePercent(a.targetPrice, current);
          return (
            <tr key={a.id} data-testid={`bottom-alert-${a.id}`} data-status={a.status} className="border-b border-border">
              <td data-testid="bottom-alert-symbol" data-symbol={a.symbol} className={`${TD} font-semibold`}>
                {info ? `${info.baseAsset}/${info.quoteAsset}` : a.symbol}
              </td>
              <td data-testid="bottom-alert-condition" className={`${TD} text-text-muted`}>
                {t(`alerts.condition.${a.condition}`)}
              </td>
              <td data-testid="bottom-alert-target" className={`${TD} font-mono tabular-nums`}>
                {price(a.symbol, a.targetPrice)}
              </td>
              {kind === 'active' && (
                <td data-testid="bottom-alert-current" className={`${TD} font-mono tabular-nums`}>
                  {current === undefined ? '—' : price(a.symbol, current)}
                </td>
              )}
              {kind === 'active' && (
                <td data-testid="bottom-alert-distance" className={`${TD} font-mono tabular-nums text-text-muted`}>
                  {distance === null ? '—' : fmt.percent(distance)}
                </td>
              )}
              <td data-testid={kind === 'active' ? 'bottom-alert-created' : 'bottom-alert-triggered-at'} className={`${TD} font-mono tabular-nums text-text-muted`}>
                {kind === 'active' ? fmt.dateTime(Date.parse(a.createdAt)) : a.triggeredAt ? fmt.dateTime(Date.parse(a.triggeredAt)) : '—'}
              </td>
              {kind === 'active' && (
                <td className={`${TD} text-right`}>
                  <button
                    type="button"
                    data-testid={`bottom-alert-delete-${a.id}`}
                    aria-label={t('alerts.delete', { symbol: a.symbol })}
                    title={t('alerts.delete', { symbol: a.symbol })}
                    disabled={remove.isPending && remove.variables === a.id}
                    onClick={() => remove.mutate(a.id)}
                    className="h-7 w-7 rounded-button text-text-muted hover:bg-surface-2 hover:text-danger"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function NotificationRows({ items }: { items: Notification[] }) {
  const { t } = useTranslation();
  const markRead = useMarkRead();
  const { text, dateTime } = useNotificationFormat();

  if (items.length === 0) {
    return (
      <p data-testid="bottom-notifications-empty" className="p-4 text-body text-text-muted">
        {t('bottomPanel.empty.notifications')}
      </p>
    );
  }
  return (
    <ul data-testid="bottom-notifications">
      {items.map((n) => {
        const unread = n.readAt === null;
        return (
          <li key={n.id}>
            <button
              type="button"
              data-testid={`bottom-notification-${n.id}`}
              data-unread={unread}
              onClick={() => {
                if (unread) markRead.mutate(n.id);
              }}
              className={`flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left hover:bg-surface-2 ${unread ? 'bg-surface-2' : ''}`}
            >
              <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${unread ? 'bg-accent' : 'bg-transparent'}`} />
              {unread && <span className="sr-only">{t('notifications.unread')}</span>}
              <span className={`min-w-0 flex-1 text-body ${unread ? 'font-semibold text-text' : 'text-text-muted'}`}>{text(n.payload)}</span>
              <span className="shrink-0 font-mono text-row tabular-nums text-text-muted">{dateTime(Date.parse(n.createdAt))}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
