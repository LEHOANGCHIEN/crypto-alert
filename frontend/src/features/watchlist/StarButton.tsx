import { useTranslation } from "react-i18next";
import { useAuth } from "../../shared/auth/auth.store";
import { useWatchlistPrompt } from "./loginPrompt.store";
import { useWatchlist, useWatchlistMutations } from "./useWatchlist";

/** Star toggle for a pair (market row + chart header). Guests get the login prompt and nothing is saved. */
/** `testId` defaults to `star-<SYMBOL>`; the chart header passes its own so ids stay unique on one page. */
export function StarButton({ symbol, testId }: { symbol: string; testId?: string }) {
  const { t } = useTranslation();
  const authed = useAuth((s) => s.status === "authenticated");
  const showPrompt = useWatchlistPrompt((s) => s.show);
  const list = useWatchlist();
  const { add, remove } = useWatchlistMutations();
  const filled = authed && Boolean(list.data?.some((i) => i.symbol === symbol));

  return (
    <button
      type="button"
      data-testid={testId ?? `star-${symbol}`}
      aria-pressed={filled}
      aria-label={t(filled ? "watchlist.star.remove" : "watchlist.star.add", {
        symbol,
      })}
      onClick={(e) => {
        e.stopPropagation();
        if (!authed) return showPrompt();
        (filled ? remove : add).mutate(symbol);
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-input text-body ${filled ? "text-warning" : "text-text-muted"} hover:bg-surface-2`}
    >
      <span aria-hidden="true">{filled ? "★" : "☆"}</span>
    </button>
  );
}
