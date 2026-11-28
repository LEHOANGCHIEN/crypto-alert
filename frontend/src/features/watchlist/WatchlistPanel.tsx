import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { priceDirection } from "../../shared/format";
import { useFormat } from "../../shared/format/useFormat";
import { errorText } from "../../shared/i18n/errorText";
import { useSymbols, useTickers } from "../../shared/market/queries";
import { PriceCell } from "../../shared/ui/PriceCell";
import { useWatchlist, useWatchlistMutations } from "./useWatchlist";

const DIRECTION_CLASS = {
  up: "text-up",
  down: "text-down",
  flat: "text-text-muted",
} as const;
const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"];

/** Right panel, Watchlist tab (logged-in users): live prices from the shared tickers cache. */
export function WatchlistPanel({ onSelect }: { onSelect?: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const navigate = useNavigate();
  const { symbol: current = "" } = useParams();
  const [params] = useSearchParams();
  const list = useWatchlist();
  const symbols = useSymbols();
  const tickers = useTickers();
  const { remove } = useWatchlistMutations();

  const info = useMemo(
    () => new Map((symbols.data ?? []).map((s) => [s.symbol, s])),
    [symbols.data],
  );
  const ticker = useMemo(
    () => new Map((tickers.data ?? []).map((x) => [x.symbol, x])),
    [tickers.data],
  );
  const tf = INTERVALS.includes(params.get("tf") ?? "")
    ? params.get("tf")
    : "1h";

  const open = (symbol: string) => {
    navigate(`/chart/${symbol}?tf=${tf}`);
    onSelect?.();
  };

  if (list.error) {
    return (
      <div
        data-testid="watchlist-error"
        className="flex flex-col items-center gap-3 p-4 text-center text-text-muted"
      >
        <p>{errorText(t, list.error)}</p>
        <button
          type="button"
          onClick={() => void list.refetch()}
          className="h-8 rounded-button bg-surface-2 px-3 text-body text-text"
        >
          {t("market.retry")}
        </button>
      </div>
    );
  }
  if (list.isPending) {
    return (
      <div
        data-testid="watchlist-loading"
        aria-busy="true"
        className="flex flex-col gap-1 p-2"
      >
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-row animate-pulse rounded-input bg-surface-2"
          />
        ))}
      </div>
    );
  }
  if (list.data.length === 0) {
    return (
      <p
        data-testid="watchlist-empty"
        className="p-4 text-center text-text-muted"
      >
        {t("watchlist.empty")}
      </p>
    );
  }

  return (
    <ul
      data-testid="watchlist"
      aria-label={t("watchlist.list")}
      className="min-h-0 flex-1 overflow-y-auto"
    >
      {list.data.map((item) => {
        const si = info.get(item.symbol);
        const tk = ticker.get(item.symbol);
        const dir = tk ? priceDirection(tk.priceChangePercent) : "flat";
        return (
          <li
            key={item.symbol}
            data-testid={`watchlist-row-${item.symbol}`}
            aria-current={item.symbol === current}
            className={`flex items-center gap-2 px-3 text-row hover:bg-surface-2 ${item.symbol === current ? "bg-surface-2" : ""}`}
          >
            <button
              type="button"
              onClick={() => open(item.symbol)}
              className="grid h-8 min-w-0 flex-1 grid-cols-[1.2fr_1fr_0.9fr] items-center gap-2 text-left"
            >
              <span className="truncate font-medium">
                {si ? si.baseAsset : item.symbol}
                {si && (
                  <span className="text-text-muted">/{si.quoteAsset}</span>
                )}
              </span>
              {tk && si ? (
                <PriceCell
                  testId={`watchlist-price-${item.symbol}`}
                  price={tk.lastPrice}
                  text={fmt.price(tk.lastPrice, si.pricePrecision)}
                />
              ) : (
                <span className="text-right text-text-muted">—</span>
              )}
              <span
                data-testid={`watchlist-change-${item.symbol}`}
                className={`text-right ${DIRECTION_CLASS[dir]}`}
              >
                {tk ? fmt.percent(tk.priceChangePercent) : "—"}
              </span>
            </button>
            <button
              type="button"
              data-testid={`watchlist-remove-${item.symbol}`}
              aria-label={t("watchlist.remove", { symbol: item.symbol })}
              onClick={() => remove.mutate(item.symbol)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-input text-text-muted hover:bg-surface-2"
            >
              <span aria-hidden="true">×</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
