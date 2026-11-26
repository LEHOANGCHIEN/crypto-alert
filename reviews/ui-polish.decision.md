# Decision — UI polish: redesign + new pages (owner request)

Date: 2026-11-26 · Decided by: project coordinator (on behalf of the owner) · Source: owner request in the coordination chat after Phase 6 (v0.6), with a Figma mockup made by the owner (`docs/design/mockup-trading-terminal.png`) and a TradingView symbol overview page as references.

This is a **direct request of the project owner** (coordination rule 5). It changes scope, so the SPEC edits listed in §3 are **explicitly allowed** for the session that applies this decision. Nothing outside §3 may change SPEC.md.

## 1. Summary

The owner finds the v0.6 UI too plain ("one page", large fonts, grey-blue theme, fixed columns). Work is split into two packages, each a normal phase (plan → build → review → merge):

| Package | Phase | Branch | Tag | Settings | Content |
|---|---|---|---|---|---|
| 1 | **6a — UI redesign** | `phase-6a-ui-redesign` | `v0.6.1` | Sonnet 5.5 + Medium | New dark theme + density from the mockup, resizable/collapsible side columns, market pulse bar, status bar, two-line market rows + All/Watchlist tabs, chart header stats, chart types, volume, screenshot + maximize |
| 2 | **6b — Pages** | `phase-6b-pages` | `v0.6.2` | Sonnet 5.5 + Medium | Header navigation, bottom panel under the chart (alerts/notifications), `/alerts` page, `/notifications` page, coin overview page `/coin/:symbol` |

Phase 7 (hardening, release, screenshots, v1.0) comes **after** 6b, because its screenshots and regression run must use the final UI. Phase 6b starts only after 6a is merged and tagged.

## 2. What is NOT built (stays out of scope)

From the mockup / TradingView, these are **not** built: order book, recent trades, buy/sell forms, open orders / order history / funds, spot wallet, deposit / transfer / fees, Futures / Earn / Portfolio navigation, drawing-tools toolbar, chart range shortcuts (1D/5D/…/All under the trading chart — they need infinite scroll-back), Fear & Greed index, BTC dominance, global market cap, market cap / rank / news / community / ETFs / "Key facts" on the coin page (no data source besides Binance). The mockup's brand name and logo ("vertex") are **not** copied — use the app's own name "Crypto Alert" with a simple original mark.

All CLAUDE.md hard rules stay: tokens only, i18n for every string, **green/red only for price direction** (so the mockup's green active-tab / button / "operational" colors become `--color-accent` or neutral text), Lightweight Charts attribution logo visible, mobile layout (< 1024 px) keeps the bottom tab bar.

## 3. Allowed doc edits (apply all of them in the first commit of Phase 6a)

### 3.1 docs/SPEC.md
1. §1 Out of scope: remove "volume pane" (replaced by the volume overlay of AC-CHART-08). Add: "order book, trade history, order entry and wallet UI; chart range shortcuts on the trading chart; market-wide statistics (fear & greed, dominance, total market cap); coin fundamentals (market cap, rank, news)".
   Also §7 assumption A10: replace "no volume pane" with "no separate volume pane (volume is an overlay on the price pane, AC-CHART-08)" so §1, A10 and AC-CHART-08 agree.
2. §3 Routes: add rows `/coin/:symbol` (coin overview, public), `/alerts` (alerts page, protected), `/notifications` (notifications page, protected). Change the `/trade/:symbol` row text to "Main dashboard (market list · chart · watchlist/alerts; bottom panel on desktop)".
3. Replace AC-MKT-01 and AC-UI-01 with the texts in §5, and add every new AC of §5 and §6 under its feature (F2, F3, F7, F8, F11, and a new **F13 Coin overview — `AC-COIN`** after F12).

### 3.2 docs/ARCHITECTURE.md §11
- Replace the "No Figma…" sentence with: "Visual reference: owner's mockup `docs/design/mockup-trading-terminal.png` (layout, density, colors). Names/logos in the mockup are not used."
- §11.1: update the `/trade/:symbol` row (header 56 · market pulse bar 32 · columns left default 240 px / chart flex / right default 320 px, resizable and collapsible · status bar 28 · footer); add rows for `/coin/:symbol`, `/alerts`, `/notifications` (Phase 6b) as described in §6.
- §11.2: dark values from §4 of this decision; light values chosen by the builder so that every text/background pair keeps WCAG AA contrast (keep current light values unless they clash). Add the new tokens.
- §11.3: typography and sizes from §4.
- Add one decision-record row in §12: "2026-11-26 · UI redesign + pages per reviews/ui-polish.decision.md (owner request)".

### 3.3 docs/PROGRESS.md
Add Status rows and sections **6a** and **6b** between Phase 6 and Phase 7 (checklists in §7). Phase 7 target dates move by +2 days (Dec 8–9, buffer Dec 10–11). Phase 7 checklist item "All 76 ACs passing" becomes "All ACs passing (93)".

### 3.4 docs/TRACEABILITY.md
Add every new AC (6a and 6b) with status `pending`; summary total becomes 93 ACs. Edited ACs (AC-MKT-01, AC-UI-01) keep their rows; their tests are updated in 6a.

### 3.5 frontend/CONTEXT.md
"Testing hooks" lists every new testid (patterns allowed).

API.md and DATABASE.md need **no** change for either package (all data already exists: `Ticker` has open/high/low/volume/quoteVolume, `GET /market/klines` takes `limit`, alerts/notifications endpoints exist). If the builder finds a real need, stop and ask.

## 4. Design tokens and type (from the owner's Figma file, measured)

| Token | Dark (new) | Use |
|---|---|---|
| `--color-bg` | `#0B0E12` | page background, chart background |
| `--color-surface` | `#101419` | header, panels, side columns, status bar |
| `--color-surface-2` | `#161B22` | inputs, search box, badges, selected row |
| `--color-surface-3` (new) | `#1A2028` | hover, active timeframe chip, avatar |
| `--color-border` | `#252C35` | all 1 px dividers |
| `--color-text` | `#E8EDF2` | primary text, numbers |
| `--color-text-muted` | `#A0ABB8` | secondary text, inactive tabs/buttons |
| `--color-text-faint` (new) | `#697685` | labels, column headers, placeholders, `/USDT` suffix |
| `--color-up` | `#37C99A` | price up only |
| `--color-down` | `#EF7381` | price down only |
| `--color-up-soft` / `--color-down-soft` (new) | up/down at 15 % opacity | flash, volume bars (40 %), area fill |
| `--color-accent` | keep `#3B82F6` | active tab underline, primary buttons, links, focus, "connected" dot |
| `--color-chart-grid` | `#161B22` | chart grid |
| others (`danger`, `warning`, indicator colors) | unchanged | |

Type: **Inter** for UI text, **Roboto Mono** (self-hosted `@fontsource/roboto-mono` 400/500, OFL) for every number (prices, changes, volumes, times, legends, chart scales via `layout.fontFamily`). Sizes: 10 (labels, meta, status bar) · 11 (rows, numbers, chips, buttons) · 12 (body, inputs) · 13 (header nav, section titles) · 18 (pair name in chart header) · 24 (last price in chart header). Weights 400/500/600 as before. Radius 3–4 px for chips/inputs, 6 px cards. Row height in the market list 48 px (two lines). Header 56 px, market pulse 32 px, chart toolbar 40 px, status bar 28 px. Panels are separated by 1 px `--color-border` lines, no gaps, no card shadows (as in the mockup).

## 5. Package 1 — Phase 6a ACs

| ID | Steps → expected result |
|---|---|
| AC-MKT-01 (edited) | Open `/trade/BTCUSDT` → left panel lists pairs; each row shows Pair (base asset bold + `/USDT` muted), Last price, 24h change and 24h volume (two-line row: pair over volume on the left, price over change on the right); column header labels name all four; only `…USDT` pairs appear (mock non-USDT pairs `ETHBTC`, `BTCUSDC` are absent); default order = 24h quote volume descending. |
| AC-MKT-07 | Market list has tabs **All** (default) and **Watchlist**. Logged-in user with BTCUSDT and ETHUSDT in the watchlist clicks Watchlist → only those two rows remain (search still filters within them); All → full list. Guest clicks Watchlist → translated login prompt with a link to `/login`. |
| AC-UI-01 (edited) | Viewport 1440×900, no saved layout → three columns: market list (left, 240 px), chart (center), Watchlist/Alerts tabs (right, 320 px); header with logo, language switcher, theme toggle, bell, user menu; market pulse bar under the header; status bar and footer visible. |
| AC-UI-05 | Drag the handle between market list and chart 100 px right → market list 340 px (±2) and the chart canvas redraws to the new width; drag the handle between chart and right panel 80 px left → right panel 400 px (±2); reload → both widths kept (localStorage `crypto-alert.layout`). Limits while open: left 180–480 px, right 260–520 px. Handles have `role="separator"`, are focusable, and ←/→ change the width by 16 px. Double-click a handle → that panel returns to its default width. |
| AC-UI-06 | Click the collapse button in the market list header → the market list is hidden completely (not visible, not in tab order), a reopen rail ≤ 24 px with an expand button stays at the left edge, the chart takes the freed width. Click expand → the panel returns at its previous width. Same for the right panel (rail at the right edge). Dragging a handle below the panel's minimum collapses it. Collapsed state is kept after reload. At 390×844 nothing changes (AC-UI-02 still passes). |
| AC-UI-07 | Under the header, a market pulse bar shows BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, DOGEUSDT (pairs missing from tickers are skipped) as `BTC/USDT  <price>  <change %>` with AC-MKT-04 colors; a mock tick for ETHUSDT updates its price within 2 s; clicking an item opens `/trade/<SYMBOL>?tf=<current tf>`. Hidden below 1024 px. |
| AC-UI-08 | A status bar above the footer shows a dot + translated market-data status (en "Connected" / "Reconnecting…" / "Market data delayed"; vi "Đã kết nối" / existing vi texts, same states as AC-RT-05/06; dot `--color-accent` or `--color-warning`, never green/red), the time of the last market update and a clock in the user's timezone (ticks every second). Going offline → "Reconnecting…" within 5 s; online → "Connected". |
| AC-CHART-07 | Chart toolbar has a chart-type menu: Candles / Bars (OHLC) / Line / Area (translated); default Candles. Choose Line → chart container `data-chart-type="line"`, the series shows close prices, indicators, legend, real-time updates and timeframe switching keep working; reload → still Line (localStorage `crypto-alert.chart-type`). Candles and bars use up/down colors; line and area use `--color-accent`. |
| AC-CHART-08 | Volume bars are shown by default at the bottom of the price pane (overlay on its own scale, about the lowest 20 % of the pane), one bar per candle, colored by that candle's direction (up/down soft tokens); the legend shows `Vol` with the hovered (or latest) candle's base volume in compact locale format. Indicators menu toggle "Volume" off → bars and legend entry disappear; reload → kept (stored with the indicator settings). A mock kline update changes the last bar's value within 2 s. |
| AC-CHART-09 | Chart header shows: coin avatar (first letter on a neutral circle), pair, base-asset full name for known assets (static map of at least BTC, ETH, SOL, BNB, XRP, DOGE, ADA, TRX, AVAX, LINK, DOT, LTC, TON, SHIB, NEAR, UNI, PEPE, SUI; unknown → no name), last price (24 px), 24h change (absolute and %), 24h high, 24h low, 24h volume (base) and 24h volume (USDT), all in locale number format. A mock tick above the current 24h high updates the High value within 2 s. |
| AC-CHART-10 | Camera button → the browser downloads `<SYMBOL>-<tf>-<yyyyMMdd-HHmm>.png` (Lightweight Charts `takeScreenshot`). Maximize button → the chart panel fills the window above every other panel (`data-maximized="true"`); Esc or the button again restores it; column widths are unchanged afterwards. (CSS maximize, not the browser Fullscreen API.) |

Visual restyle (no AC, checked by the owner and the reviewer against the mockup): every existing screen — header, market list, chart toolbar/legend, Watchlist/Alerts panel, forms, toasts, bell panel, login/register, account, 404 — uses §4 tokens and sizes. Existing tests must keep passing; selectors/testids are not renamed unless a test is updated in the same commit without weakening it.

## 6. Package 2 — Phase 6b ACs (written now, built in 6b)

| ID | Steps → expected result |
|---|---|
| AC-UI-09 | Header shows navigation links Chart → `/trade/<last symbol>`, Overview → `/coin/<last symbol>`, Alerts → `/alerts`, Notifications → `/notifications` (translated; "last symbol" = last opened, default BTCUSDT); the link of the current page has `aria-current="page"` and is highlighted. Below 1024 px the links move into a menu button. Guests clicking Alerts/Notifications go to `/login` with return-to. |
| AC-ALERT-11 | On `/trade/:symbol` (desktop), a bottom panel under the chart has tabs **Active alerts (n)**, **Triggered**, **Notifications**. Active: symbol, condition, target price, current price, distance % to target, created at, delete button. Triggered: symbol, condition, target price, triggered at. Notifications: the latest notifications with unread marker; click marks read. Checkbox "Current pair only" filters all three tabs. Guest → translated login prompt. The panel can be collapsed to its tab row and resized by dragging (min 120 px, max 60 % of the center height); state kept in `crypto-alert.layout`. Creating an alert in the right panel shows it in the bottom panel within 2 s; a mock trigger moves it to Triggered within 2 s. |
| AC-ALERT-12 | `/alerts` (protected): table of all the user's alerts with filters Status (All / Active / Triggered) and symbol search; columns as AC-ALERT-11 plus status; a "New alert" button opens the alert form with a symbol field validated against the market list (translated errors as AC-ALERT-02…); delete with the same rules as the Alerts tab; clicking a symbol opens `/trade/<SYMBOL>`; empty state with a link to the chart. |
| AC-NOTIF-06 | `/notifications` (protected): latest 100 notifications (API limit) newest first, filter All / Unread, click marks one read, "Mark all as read" button, a new notification (mock trigger) appears at the top within 2 s. The bell panel has a "View all" link to this page. |
| AC-COIN-01 | `/coin/BTCUSDT`: coin avatar, full name (when known) and pair, star button (watchlist rules of F6), large last price, 24h change (absolute and %, colored), "updated at HH:mm:ss" in the user's timezone, and an "Open full chart" button → `/trade/BTCUSDT`. A mock tick updates the price within 2 s. The pair name in the trade chart header links to this page. `/coin/FAKEUSDT` → translated "Pair not found" with a link to `/coin/BTCUSDT`. |
| AC-COIN-02 | Area chart with range buttons 1D / 1W / 1M / 3M / 6M / YTD / 1Y (default 1D). Each range loads klines: 1D = 5m × 288, 1W = 1h × 168, 1M = 4h × 180, 3M = 1d × 90, 6M = 1d × 180, YTD = 1d × days since 1 Jan (user timezone, min 1), 1Y = 1d × 365 (network requests show these `interval`/`limit` values). Area and line are colored up/down by the range's change; a dashed line marks the range's first close; attribution logo visible; crosshair tooltip shows time + price. |
| AC-COIN-03 | Performance tiles 24h, 1W, 1M, 3M, 6M, YTD, 1Y show `(last − first close of range) / first close` in % with sign and up/down color; on the mock fixture they equal the values computed by a unit-tested helper (e2e checks 24h and 1M); clicking a tile selects that range in the chart. |
| AC-COIN-04 | Key stats card: 24h open, 24h high, 24h low, 24h volume (base), 24h volume (USDT), 52-week high and low (from 1d klines). Layout: chart + stats side by side on desktop, single column at 390×844 with no horizontal scroll. Page works for guests. |

## 7. PROGRESS checklists

**Phase 6a — UI redesign** · Settings: Sonnet 5.5 + Medium · Plan mode ON · ACs: AC-MKT-01 (edited), AC-MKT-07, AC-UI-01 (edited), AC-UI-05…08, AC-CHART-07…10
- [ ] Doc edits of reviews/ui-polish.decision.md §3 (SPEC, ARCHITECTURE §11/§12, PROGRESS 6a/6b, TRACEABILITY pending rows, CONTEXT) + commit the decision and `docs/design/`
- [ ] Tokens + fonts (§4), restyle of every existing screen to the mockup density
- [ ] Resizable + collapsible side columns (AC-UI-01, AC-UI-05, AC-UI-06)
- [ ] Market pulse bar + status bar (AC-UI-07, AC-UI-08)
- [ ] Two-line market rows + All/Watchlist tabs (AC-MKT-01, AC-MKT-07)
- [ ] Chart header stats + coin names (AC-CHART-09)
- [ ] Chart types + volume overlay (AC-CHART-07, AC-CHART-08)
- [ ] Screenshot + maximize (AC-CHART-10)
- [ ] Playwright for this phase's ACs, full regression, TRACEABILITY, CONTEXT testids, log line

**Phase 6b — Pages** · Settings: Sonnet 5.5 + Medium · Plan mode ON · ACs: AC-UI-09, AC-ALERT-11, AC-ALERT-12, AC-NOTIF-06, AC-COIN-01…04
- [ ] Header navigation + last-symbol memory (AC-UI-09)
- [ ] Bottom panel under the chart (AC-ALERT-11)
- [ ] `/alerts` page (AC-ALERT-12)
- [ ] `/notifications` page + "View all" in the bell panel (AC-NOTIF-06)
- [ ] Coin overview page: header, range chart, performance tiles, key stats (AC-COIN-01…04)
- [ ] Playwright for this phase's ACs, full regression, TRACEABILITY, CONTEXT testids, log line

Merge of each package = docs/PROMPTS.md section e with N=6a / 6b, tag `v0.6.1` / `v0.6.2` (instead of `v0.N`), deploy as usual (`railway up` run by the owner).

## 8. Notes for the builder
- Read `docs/design/mockup-trading-terminal.png` (open the image) before planning the restyle; match layout, spacing and density, not the brand.
- Layout state: one localStorage key `crypto-alert.layout` = `{ left: { width, collapsed }, right: { width, collapsed }, bottom?: { height, collapsed } }`, read defensively (bad JSON → defaults).
- The chart must resize on column drag (ResizeObserver or `autoSize`), without re-fetching klines.
- Volume overlay uses the existing kline data (`volume`), no new requests.
- A long session: finish the current item, commit, log, stop (CLAUDE.md session hygiene). Phase 6a may take two sessions.
