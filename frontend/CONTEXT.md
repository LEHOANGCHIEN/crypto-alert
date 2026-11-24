# frontend/CONTEXT.md — React rules

Read with `CLAUDE.md`, `docs/API.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md` §7 and §11.

## Structure & layering
- Feature folders in `src/features/<feature>/` own their pages, components, hooks and API calls. Shared code only in `src/shared/`. A feature never imports another feature's internals — move shared pieces to `shared/`.
- Components: `PascalCase.tsx`, one component per file; hooks `useXxx.ts`; pure logic in `lib/` with Vitest tests.
- State: server data in **TanStack Query**; auth/session + preferences in a small store (`zustand`); UI-only state in components. No Redux.
- Query keys (exact): `['symbols']`, `['tickers']`, `['klines', symbol, interval]`, `['me']`, `['watchlist']`, `['alerts']`, `['notifications']`.

## API & errors
- Only `shared/api/http.ts` calls `fetch`. It adds the bearer token, unwraps the envelope, throws `ApiError { code, details }`, and does single-flight refresh on `TOKEN_EXPIRED`/`UNAUTHENTICATED`.
- Types in `shared/api/types.ts` copied **exactly** from API.md §2 — no renamed fields, no extra optional fields.
- Show errors via translation, never raw codes:
```tsx
// ✅
toast.error(t(`errors.${err.code}`, { defaultValue: t('errors.UNKNOWN') }));
// ❌
toast.error(err.message ?? 'Something went wrong');
```
- Never call Binance or any external API. Socket only via `shared/socket` (one client per tab).

## i18n
- `react-i18next`; files `shared/i18n/locales/vi.json` and `en.json`, nested keys by feature (`alerts.form.submit`), plus `errors.*`, `validation.*`, `fields.*`, `notifications.*`, `market.status.*`.
- Every new key goes into **both** files in the same commit (Vitest parity test fails otherwise). ESLint `i18next/no-literal-string` must stay on.
- Numbers, prices, percentages, volumes, dates only through `shared/format` (`Intl`, current locale + user timezone). Never `toFixed()` or `toLocaleString()` directly in components.
- Footer title (`footer-title`) and course line (`footer-course`) are translated: vi = Vietnamese official title + "Đồ án chuyên ngành — UIT"; en = English official title + "Specialized Project — UIT". The footer has a close button (`footer-close`) whose state is stored in localStorage key `crypto-alert.footer-hidden`.

## Styling
- Tailwind utilities mapped to tokens (`bg-surface`, `text-muted`, `text-up`, `border-border`…). No hex colors, no arbitrary values like `p-[13px]`, no inline `style` for colors.
- Green/red (`up`/`down`) only for price direction. Errors use `danger` (orange).
- Breakpoint: `< 1024px` → mobile tab layout.

## Chart (Lightweight Charts v5)
- `createChart(el, { layout: { attributionLogo: true, … } })`; series via `chart.addSeries(CandlestickSeries | LineSeries | HistogramSeries, options, paneIndex)` — price pane 0, RSI and MACD in their own panes.
- Data times stay UTC (seconds); display timezone via `localization.timeFormatter` and `timeScale.tickMarkFormatter` using `shared/format` — never shift timestamps.
- Colors read from CSS variables; re-apply with `chart.applyOptions()` / `series.applyOptions()` on theme change. Dispose chart on unmount.
- `setData` on load, `update` for live ticks; indicator lib functions are pure and unit-tested.

## Testing hooks
- Stable `data-testid` for Playwright: `market-row-<SYMBOL>`, `chart-root`, `chart-legend`, `tf-<interval>`, `star-<SYMBOL>` (market row star), `chart-star-<SYMBOL>` (chart header star), `watchlist-row-<SYMBOL>`, `watchlist-remove-<SYMBOL>`, `watchlist-price-<SYMBOL>`, `watchlist-change-<SYMBOL>`, `watchlist-empty`, `watchlist-login-prompt`, `watchlist-login-button`, `alert-row-<id>`, `bell-badge`, `notification-item-<id>`, `toast`, `conn-banner`, `market-status-badge`, `lang-switcher`, `theme-toggle`, `footer-title`, `footer-course`, `footer-disclaimer`, `footer-close`.
- Vitest: indicator lib (vs oracle), format helpers, i18n key parity, http client refresh logic.

## Accessibility
- Every interactive element reachable by keyboard with visible focus; inputs have labels (translated); icons have translated `aria-label`.
