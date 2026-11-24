import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useWatchlistPrompt } from "./loginPrompt.store";

export function WatchlistLoginPrompt() {
  const { t } = useTranslation();
  const open = useWatchlistPrompt((s) => s.open);
  const hide = useWatchlistPrompt((s) => s.hide);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4"
      onClick={hide}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("watchlist.loginPrompt.title")}
        data-testid="watchlist-login-prompt"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-card border border-border bg-surface p-4 text-center"
      >
        <p className="text-body">{t("watchlist.loginPrompt.title")}</p>
        <div className="flex gap-2">
          <Link
            to="/login"
            data-testid="watchlist-login-button"
            onClick={hide}
            className="h-10 rounded-button bg-accent px-4 text-body font-medium leading-10 text-bg"
          >
            {t("watchlist.loginPrompt.login")}
          </Link>
          <button
            type="button"
            data-testid="watchlist-login-cancel"
            onClick={hide}
            className="h-10 rounded-button bg-surface-2 px-4 text-body text-text"
          >
            {t("watchlist.loginPrompt.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
