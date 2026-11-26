import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../shared/format/useFormat';
import { useTickers } from '../../shared/market/queries';
import { useConnection } from '../../shared/socket/connection.store';

type State = 'connected' | 'connecting' | 'reconnecting' | 'delayed';

/** Bottom status bar (desktop): market-data status dot + text, last market update, clock in the user's timezone. */
export function StatusBar() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const connected = useConnection((s) => s.connected);
  const everConnected = useConnection((s) => s.everConnected);
  const marketStatus = useConnection((s) => s.marketStatus);
  // Snapshot fetch and every live `tickers:update` (setQueryData) both move `dataUpdatedAt`.
  const updatedAt = useTickers().dataUpdatedAt;
  const lastMarketAt = updatedAt > 0 ? updatedAt : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const state: State = !connected ? (everConnected ? 'reconnecting' : 'connecting') : marketStatus === 'reconnecting' ? 'delayed' : 'connected';
  const text = {
    connected: t('statusBar.connected'),
    connecting: t('statusBar.connecting'),
    reconnecting: t('connection.reconnecting'),
    delayed: t('market.status.reconnecting'),
  }[state];

  return (
    <div
      data-testid="status-bar"
      className="hidden h-statusbar shrink-0 items-center gap-4 border-t border-border bg-surface px-3 text-meta text-text-muted lg:flex"
    >
      <span className="flex items-center gap-2">
        <span
          data-testid="status-dot"
          data-state={state}
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${state === 'connected' ? 'bg-accent' : 'bg-warning'}`}
        />
        <span data-testid="status-text" role="status">
          {text}
        </span>
      </span>
      <span className="flex-1" />
      <span>
        {t('statusBar.lastUpdate')}{' '}
        <span data-testid="status-last-update" data-epoch={lastMarketAt ?? ''} className="font-mono text-text">
          {lastMarketAt ? fmt.time(lastMarketAt) : '—'}
        </span>
      </span>
      <span title={t('statusBar.clock')}>
        <span data-testid="status-clock" data-epoch={now} className="font-mono text-text">
          {fmt.time(now)}
        </span>
      </span>
    </div>
  );
}
