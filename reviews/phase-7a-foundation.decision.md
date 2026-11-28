# Decision — TradingView-style restructure (owner request) + Phase 7a "Foundation"

Date: 2026-11-28 · Decided by: project coordinator (on behalf of the owner) · Owner approvals: package, mockups, folder structure, phase plan, Railway GitHub autodeploy (all 2026-11-28).

This is a **direct request of the project owner** (coordination rule 5). It (a) re-scopes the project for the whole restructure (phases 7a–7f + 8) and (b) defines Phase 7a. Later phases (7b–7f) get their own decision files with their ACs; this file only opens the scope and fixes the shared rules. Where this file and an older decision differ, this file wins.

## 0. Why
The owner judged v0.6.2 "too simple" and asked for an app that follows TradingView's design language: the **website** (home, markets, symbol pages, news, community) is the main experience; the **chart** is a separate full-screen tool ("Supercharts"). He also asked for news, a community (ideas + comments), AI features (Gemini, with RAG) and a full footer. The coordinator studied tradingview.com and drew 12 approved mockups.

## 1. Design source
- Approved mockups (Claude design canvas, owner-approved 2026-11-28). Offline copies for builder and reviewer: **`docs/design/v2/*.png`** (1440 px wide; untracked, committed in 7a item 0):
  `01-home` · `02-markets-crypto` · `03-symbol-overview` · `04-chart` · `05-news` · `06-news-detail` · `07-ideas` · `08-idea-detail` · `09-profile` · `10-screener` · `11-heatmap` · `12-ai-assistant`.
- Numbers, names and texts in the mockups are samples. Real texts go through i18n; real data from the sources in §4.
- Old design files (`docs/design/*.pdf`, `docs/design/mockup-trading-terminal.png`) move with `git mv` to **`docs/design/v1/`**; update every path that points to them (reviews/ui-polish.decision.md, reviews/phase-6b-design.decision.md, docs/ARCHITECTURE.md). History stays.
- Rules for matching: layout, hierarchy, spacing feel and colors from v2; tokens only; light theme follows the tokens; mobile (< 1024 px) is not drawn → single column, menus collapse, no horizontal page scroll.

## 2. Phase plan (owner-approved)
| Phase | Branch | Content | Settings | Tag |
|---|---|---|---|---|
| 7a Foundation | `phase-7a-foundation` | this file: doc/rule edits, black tokens, site shell (header + mega-menu, full footer, Ctrl+K search), home v1, route restructure (`/chart`), static pages, e2e folders, design v1/v2, Railway GitHub autodeploy | Sonnet 5.5 + Medium | v0.7.1 |
| 7b Market data | `phase-7b-market-data` | catalog (CoinGecko), derivatives (Binance Futures), sentiment (Fear & Greed), scheduled jobs; home v2, `/markets/crypto`, `/screener`, `/heatmap` | Sonnet 5.5 + Medium | v0.7.2 |
| 7c Symbol page | `phase-7c-symbol` | `/symbols/:symbol` with tabs (overview, technicals, seasonals, pairs, derivatives, FAQ); reuses 6b coin code; `/coin/:symbol` → redirect | Sonnet 5.5 + Medium | v0.7.3 |
| 7d News + AI base | `phase-7d-news-ai` | RSS ingest, LLM provider (Gemini) + mock, summaries/sentiment/tags, key facts, embeddings + pgvector, semantic search, `/news`, `/news/:id` | Opus 5.5 + High | v0.7.4 |
| 7e Community | `phase-7e-community` | ideas (+ chart snapshot, "grab this chart"), comments, likes, follows, minds, votes, profiles, reports + AI moderation, community notifications | Sonnet 5.5 + Medium | v0.7.5 |
| 7f AI assistant | `phase-7f-assistant` | assistant (tool calling, streaming, alert by text, explain chart, NL screener, RAG), quotas, AI eval set + docs/AI.md | Opus 5.5 + High | v0.7.6 |
| 8 Release | `phase-8-release` | old Phase 7 (hardening, i18n sweep, a11y, audit, throttle klines, version, demo seed incl. community, README, screenshots) | Sonnet 5.5 + Medium | v0.8 + v1.0 |

## 3. Allowed doc edits (first commit of Phase 7a, item 0) — these and only these

### 3.1 docs/SPEC.md
1. §0.1 row C4 → `| C4 | Extensions: paper trading, market overview | Market overview, news, community and AI assistant are **in scope** since 2026-11-28 (owner request, reviews/phase-7a-foundation.decision.md); paper trading stays out | Owner request |`
2. §1 Scope — replace both paragraphs with:
   - **In scope:** F1 Account · F2 Market list · F3 Candlestick chart · F4 Real-time updates · F5 Indicators · F6 Watchlist · F7 Price alerts · F8 Notifications · F9 i18n · F10 Themes · F11 Layout · F12 Operations · F13 Coin overview (becomes the symbol page in 7c) · **F14 Site shell & home (7a)** · F15 Markets, screener, heatmap (7b) · F16 Symbol page (7c) · F17 News (7d) · F18 Community (7e) · F19 AI assistant & AI features (7d, 7f). ACs of F15–F19 are added by their phase decision files.
   - **Out of scope — MUST NOT be built:** real-money trading, order entry, wallets, exchange account linking, paper trading, backtesting, drawing tools, email/Telegram/push notifications, forgot/reset password, admin pages, on-chain metrics, ETF data, analyst ratings/price targets, copying full news articles (title + source summary + link only), Pine-like scripting, ads/broker/affiliate content, infinite scroll-back of chart history, chart range shortcuts on the trading chart.
3. §2 Roles — replace the table with:
   | Feature | Guest | Logged-in user |
   |---|---|---|
   | Home, markets, screener, heatmap, symbol pages, chart, indicators, news, reading ideas/comments/profiles, search, language, theme, static pages | ✅ | ✅ |
   | Watchlist, alerts, notifications, account, posting ideas/comments/minds, likes, follows, votes, reports, AI assistant and other AI actions | ❌ → translated "Log in to use this" prompt with Login button (pages: redirect to `/login` with return-to) | ✅ |
4. §3 Routes — replace the table with (phase in brackets = when it appears; until then the route does not exist):
   | Path | Page | Access |
   |---|---|---|
   | `/` | Home (F14) | public |
   | `/chart/:symbol?tf=1h` | Supercharts: the former trade dashboard, full-screen chart shell | public |
   | `/trade/:symbol` | Redirect → `/chart/:symbol` keeping the query string | public |
   | `/coin/:symbol` | Coin overview (F13) [until 7c; then redirect → `/symbols/:symbol`] | public |
   | `/markets/crypto`, `/screener`, `/heatmap` [7b] · `/symbols/:symbol[/tab]` [7c] · `/news`, `/news/:id` [7d] · `/ideas`, `/ideas/:id`, `/ideas/new`, `/minds`, `/u/:username` [7e] | see their phases | public (posting: protected) |
   | `/about`, `/faq`, `/status`, `/contact`, `/community-rules`, `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/disclaimer` | Static pages (F14) | public |
   | `/login`, `/register` | Auth pages (logged-in users are redirected to `/`) | public |
   | `/account`, `/alerts`, `/notifications` | unchanged | protected |
   | anything else | 404 page with link home | public |
5. Rename in every existing AC: `/trade/` → `/chart/` (AC-MKT-01, AC-MKT-05, AC-MKT-06, AC-CHART-01, AC-ALERT-11, AC-UI-07, AC-COIN-01 and any other occurrence). In AC-AUTH-01 "redirected to `/trade/BTCUSDT`" → "redirected to `/`"; in AC-AUTH-04 "(default `/trade/BTCUSDT`)" → "(default `/`)".
6. AC-UI-01 → `| AC-UI-01 | Viewport 1440×900, no saved layout, `/chart/BTCUSDT` → compact chart header (44–56 px: logo linking to `/`, pair selector, language switcher, theme toggle, bell, user menu or Login/Register), market pulse bar under it, three columns: market list (left, 240 px), chart (center), Watchlist/Alerts tabs (right, 320 px); status bar at the bottom. The chart page has no site footer (see AC-UI-03). |`
7. AC-UI-03 → `| AC-UI-03 | Every site page (all pages except `/chart/*`) ends with the full footer (docs/design/v2/01-home.png): brand column with the official title (`footer-title`, vi/en as before), course line (`footer-course`), disclaimer (`footer-disclaimer`), data attribution line (Binance; plus each source added by later phases) and © year; link columns (`footer-col-*`). **Every footer link opens an existing page** (the test visits each link: none is 404, external links open in a new tab with `rel="noopener noreferrer"`). The chart page shows the disclaimer in its status bar (`statusbar-disclaimer`). No close button any more. |`
8. AC-UI-09 → `| AC-UI-09 | Site header (all site pages, 64 px): logo → `/`; search button "Search (Ctrl+K)" (AC-SITE-02); top menus **Products / Markets / Community / News** — each opens a mega-menu panel (hover or click; Esc closes; keyboard reachable) listing only pages that exist in the current phase, each item with icon + translated label + one-line description; the menu of the current section has `aria-current="page"`; right side: language, theme, bell (logged in), avatar menu or Login/Register. Below 1024 px the menus move into a menu button (drawer). Guests opening a protected item (Alerts, Notifications) go to `/login` with return-to. In 7a, Products = Supercharts (`/chart/<last symbol>`), Coin overview (`/coin/<last symbol>`), Price alerts (`/alerts`), Notifications (`/notifications`); Markets/Community/News menus appear when their first page exists. |`
9. F14 Site shell & home — `AC-SITE` (new section after F13):
   | ID | Steps → expected result |
   |---|---|
   | AC-SITE-01 | `/` (guest and user) shows, per docs/design/v2/01-home.png: hero (translated headline + subline), large search field (opens AC-SITE-02 with the typed text), buttons "Open Supercharts" → `/chart/BTCUSDT`; **Market summary** with cards for BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT (pairs missing from tickers skipped): avatar, name, pair, last price, 24h change % (AC-MKT-04 colors) and a 24h sparkline from klines `1h × 24` (colored by its own change); **Movers** with tabs Gainers / Losers: top 6 USDT pairs by 24h change % from tickers (desc / asc), each row links to `/coin/<SYMBOL>`. A mock tick on ETHUSDT updates its card price within 2 s. No section shows placeholder or sample data. |
   | AC-SITE-02 | Ctrl+K (Cmd+K on macOS) or the header search button opens a search dialog (`role="dialog"`, focus in the input). Typing `eth` lists ETHUSDT first among pairs (match on symbol, base asset, known name), plus matching pages (e.g. "Supercharts", "Price alerts"); ↑/↓ move the selection, Enter opens it (pair → `/coin/<SYMBOL>` until 7c), Esc closes and focus returns to the trigger. Empty query shows recent pairs (last 5 opened, localStorage `crypto-alert.recent-symbols`). Translated; no result → translated empty state. |
   | AC-SITE-03 | Static pages `/about`, `/faq`, `/status`, `/contact`, `/community-rules`, `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/disclaimer`: each has breadcrumb, translated `h1` and translated body (no lorem ipsum; facts about this project only), and the site footer. `/status` shows live values from `GET /api/v1/health` (DB, market-data provider, connected, last message time in the user's timezone, version) and refreshes every 30 s. `/contact` shows the project GitHub repository link (no form). |
   | AC-SITE-04 | `/trade/ETHUSDT?tf=4h` redirects to `/chart/ETHUSDT?tf=4h`; `/chart/ethusdt` → `/chart/ETHUSDT`; the chart page uses the chart shell (AC-UI-01) and never shows the site header or footer; the site pages never show the market pulse bar or the chart status bar. Back/forward between `/` and `/chart/BTCUSDT` keeps working. |
   | AC-SITE-05 | Dark theme uses the black tokens of ARCHITECTURE §11.2 (`--color-bg` = `#000000`). For `--color-text`, `--color-text-muted`, `--color-text-faint` on `--color-bg`, `--color-surface` and `--color-surface-2`, the computed contrast ratio is ≥ 4.5:1 in both themes (test reads computed CSS variables). |
10. §6 Non-functional — add rows: `| External data | Every external source is called only by the backend, cached, and has a mock provider used in tests/CI; a failing source degrades its section to a translated "temporarily unavailable" state, never a broken page. |` and `| Attribution | Each external data source is credited in the footer (and where its data is shown when its terms require it). |`. In the Compliance row replace "(visible by default; the user may close the footer)" with "(site footer on every site page; status bar on the chart page)".
11. §7 — A1 → "Guests can view all public pages (see §2); login is needed for personal and posting features." A2 → "24h volume shown = quote volume in USDT. The market list on the chart page has no column sorting; the screener (7b) has sorting." A8 → add "Deploys happen automatically from `main` via Railway's GitHub integration with **Wait for CI** (§10 ARCHITECTURE); `railway up` stays as a manual fallback." Add `| A11 | Search, recent symbols and last symbol are stored per browser (localStorage). |`.

### 3.2 CLAUDE.md
1. First paragraph: replace "a deployed web app for tracking crypto markets with real-time candlestick charts, MA/RSI/MACD, watchlist and price alerts" with "a deployed TradingView-style web app for crypto markets: market pages, real-time charts with indicators, watchlist, price alerts, news, community ideas and an AI assistant".
2. Docs table: add rows `| docs/design/v2/*.png | Approved mockups (design source since Phase 7a) |`, `| docs/DATA-SOURCES.md | External data sources, quotas, caching, attribution (from Phase 7b) |`, `| docs/AI.md | LLM provider, tools, prompts, RAG, evaluation (from Phase 7d) |`, and `| reviews/*.decision.md | Owner/coordinator decisions; they win over older docs for their phase |`.
3. Model table: routine row → "Routine phases: 0, 1, 2, 5, 6a, 6b, 7a, 7b, 7c, 7e, 8"; hard row → "Hard phases: 3, 4, 6, 7d news + AI base, 7f AI assistant".
4. Hard rules MUST, change 7 to: "Market data only through `MarketDataProvider`; every other external source (CoinGecko, Binance Futures, Fear & Greed, RSS, LLM/embeddings) only through its own provider interface in its backend module, each with a real and a **mock** implementation; tests and CI always use the mocks. Notifications only through `NotificationChannel`."
5. Hard rules MUST NOT, first line: "Let the browser call Binance" → "Let the browser call any external API (Binance, CoinGecko, RSS feeds, Gemini…) — only our backend".
6. Add MUST NOT lines: "Render user-generated content as raw HTML (no `dangerouslySetInnerHTML` on user text; sanitize on the server)." · "Copy full news articles (store/show title, source summary, link, our AI summary only)." · "Send personal data (email, password, tokens, private alerts of other users) to an LLM, or let an AI answer show numbers that did not come from a tool result." · "Show sample/placeholder data on a real page (mockup numbers are samples)."
7. Git rules: add "Deploys: merging into `main` triggers Railway's GitHub autodeploy after CI passes (Wait for CI). Never run `railway up` unless the owner asks (fallback)."

### 3.3 docs/ARCHITECTURE.md
1. §1 overview: add the two-shell frontend (site shell / chart shell) and, as "planned (7b–7f)", the backend modules of §3.5 below.
2. §7 Folder structure → replace with the target structure in §3.5 below; mark modules of later phases "(phase 7b…7f)".
3. §10 Deployment: "Deploy method" row → "Railway GitHub autodeploy from `main` (Wait for CI on, all GitHub Actions on the commit must pass). Fallback: `railway up --ci -s web` from a clean `main`, only on the owner's request."
4. §11: first paragraph → visual reference = `docs/design/v2/*.png` (v1 files are history). §11.1 table: add rows "Site header (site pages, 64 px)", "Site footer (site pages)", "`/` home (01-home.png)", "static pages", "`/chart/:symbol` (former `/trade`, 04-chart.png; chart shell: compact header, pulse bar, 3 columns, bottom panel, status bar with disclaimer)"; delete the old "Header (all pages)" and "Footer (all pages)" rows; rename `/trade/:symbol` → `/chart/:symbol` everywhere.
5. §11.2 dark values → `--color-bg #000000`, `--color-surface #0F0F0F`, `--color-surface-2 #1A1A1A`, `--color-surface-3 #242424`, `--color-border #2A2A2A`, `--color-text #E6E6E6`, `--color-text-muted #A3A3A3`, `--color-text-faint #858585` (≥ 4.5:1 on surface-2), `--color-chart-grid #1C1C1C`; accent, up, down, danger, warning unchanged; light values unchanged.
6. §11.3: add "Site pages: container max 1280 px (+32 px side padding); hub title 56–64 px / 800; section title 24–26 px / 700 with a `›` link; cards radius 16 px with 1 px border, no shadow; pill tabs (active = filled); spacing between sections 48–56 px. Chart shell keeps the dense 6a values."
7. §12: add `ADR-15 | 2026-11-28 · TradingView-style restructure (owner request): website first, chart as separate full-screen shell; new modules for market data, news, community, AI | Owner found v0.6 too simple | Phases 7a–7f + 8; routes in SPEC §3` and `ADR-16 | Railway GitHub autodeploy with Wait for CI | auto mode blocks railway up; main only receives reviewed merges | No manual deploy step`.
8. Replace every `docs/design/<file>` path by `docs/design/v1/<file>`.

### 3.4 docs/PROGRESS.md
- Status table: delete row 7; add rows 7a–7f and 8 from §2 (state "not started"; 7a "in progress" when the builder starts); delete the "Schedule" line's dates sentence and write "Schedule: see reviews/phase-7a-foundation.decision.md §2 (dates not fixed)."
- Rename the section "Phase 7 — Hardening, final deploy, demo account" to "Phase 8 — Release (former Phase 7)", keep its checklist, change "All ACs passing (93)" → "All ACs passing (all IDs in TRACEABILITY)", "(the Merge Prompt tags `v0.7` **and** `v1.0`)" → "(tags `v0.8` **and** `v1.0`)", "Production deploy from this branch (`railway up` …)" → "Production check from `main` after merge (autodeploy); seed demo data (incl. community samples) on production".
- Add sections "Phase 7b … 7f" with one line each: "Checklist and ACs: added by reviews/phase-7X-*.decision.md."
- Add section "Phase 7a — Foundation" (ACs: AC-SITE-01…05, edited AC-UI-01, AC-UI-03, AC-UI-09, AC-AUTH-01, AC-AUTH-04 + every AC renamed `/trade`→`/chart`) with the checklist of §5 below.
- "Every phase ends with" paragraph: "redeploy `main` to Railway" → "Railway autodeploys `main` after CI".

### 3.5 Target folder structure (for ARCHITECTURE §7)
Backend `src/modules/`: keep auth, users, market, realtime, alerts, notifications, watchlist, health, rate-limit, test-support; add catalog/ (7b, providers coingecko|mock), derivatives/ (7b, binance-futures|mock), sentiment/ (7b, alternative-me|mock + community votes in 7e), jobs/ (7b, @nestjs/schedule), screener/ (7b), news/ (7d, rss|mock), ai/ (7d/7f: llm/{gemini,mock}, embeddings/, tools/, insights/, rag/, assistant/, screener-nl/, moderation/, eval/), community/ (7e), search/ (7a frontend-only; backend in 7e if needed).
Frontend `src/`: `app/` (router, providers, `shells/site/` = SiteHeader + MegaMenu + SiteFooter + SearchDialog, `shells/chart/` = former dashboard layout: DashboardLayout, SidePanel, BottomPanel, MobileTabBar, PulseBar, StatusBar, compact ChartHeader); `pages/` (thin route components: home, chart, coin, alerts, notifications, account, auth, static/, errors/, later markets, screener, heatmap, symbol, news, ideas, users); `features/` (existing + later ones); `shared/ui/` (+ Card, Pill, SectionHeader, Breadcrumb, CoinAvatar, Sparkline, Dialog).
e2e `tests/`: `core/` (auth, account, i18n, theme, ops), `market/` (market, realtime), `chart/` (chart, indicators, layout, ui chart-shell tests), `alerts/` (alerts, alerts-page, alerts-panel), `notifications/` (notifications, notifications-page), `watchlist/`, `coin/`, `site/` (nav, home, search, footer, static pages, routes, tokens); later `markets/`, `symbol/`, `news/`, `community/`, `ai/`.

### 3.6 docs/TRACEABILITY.md
Add AC-SITE-01…05 (pending, 7a); keep the rest; update test file paths after the e2e move.

### 3.7 docs/PROMPTS.md
- Section e (MERGE PROMPT) step 6 → "Railway autodeploys `main` once CI on the merge commit passes. Wait (poll up to 15 min) until GET <URL>/api/v1/health returns ok with the new version/behaviour; if no new deployment appears, stop and ask the owner (fallback: owner runs `railway up --ci -s web`)."
- Section c (REVIEW PROMPT) "Check specifically" template: add "compare screens with docs/design/v2/*.png".
- Section b: template phase name examples `phase-7a-foundation`.

### 3.8 Not allowed
No other SPEC change; no change to existing AC thresholds; API.md and DATABASE.md unchanged in 7a (no new endpoint needed: home uses tickers/klines/symbols, `/status` uses health).

## 4. Data sources for later phases (for planning only; no code in 7a)
Binance spot (existing) · Binance Futures public data (OI, funding, long/short, liquidations) · CoinGecko Demo API (key, 10k calls/month, attribution required, backend cache) · alternative.me Fear & Greed · public RSS feeds of crypto news sites · Gemini API free tier (LLM + embeddings) · PostgreSQL pgvector. Keys (`COINGECKO_API_KEY`, `GEMINI_API_KEY`) are created by the owner and never committed.

## 5. Phase 7a checklist (PROGRESS)
- [ ] Doc edits of reviews/phase-7a-foundation.decision.md §3 + `git mv` design files to `docs/design/v1/` + add `docs/design/v2/*.png` + this decision (one commit `docs: open tradingview-style restructure (phase 7a)`)
- [ ] Move e2e specs into area folders (`git mv`, no test content change) + TRACEABILITY paths (`refactor(e2e): group specs by area`)
- [ ] Black dark tokens + contrast test (AC-SITE-05)
- [ ] Route restructure: chart shell at `/chart/:symbol`, `/trade` redirect, login/register default `/`, rename `/trade/`→`/chart/` in code and tests (same strictness) (AC-SITE-04, AC-AUTH-01/04, renamed ACs)
- [ ] Site shell: header with mega-menus + drawer, full footer, pulse bar/status bar only in chart shell (AC-UI-01, AC-UI-03, AC-UI-09)
- [ ] Search dialog Ctrl+K (AC-SITE-02)
- [ ] Home v1 (AC-SITE-01)
- [ ] Static pages incl. live `/status` (AC-SITE-03)
- [ ] Railway GitHub autodeploy: owner connects the service (Railway UI) — builder only documents it (ARCHITECTURE §10, PROMPTS e) and verifies after merge; no code
- [ ] Playwright for this phase's ACs, full regression, TRACEABILITY, CONTEXT testids, log line

## 6. Notes for the builder
- Keep every existing test green; when a URL or a layout moves, update the test in the same commit keeping the same strictness (e.g. `toHaveURL(/\/trade\/ETHUSDT/)` → `toHaveURL(/\/chart\/ETHUSDT/)`); never delete an assertion.
- Do not build anything from later phases (no CoinGecko, news, ideas, AI, markets page). Menus/footer list only existing pages.
- Home sparklines: one klines request per card (`1h`, limit 24) via the existing endpoint; reuse the TanStack Query key convention of frontend/CONTEXT.md.
- Mobile 390×844: site header collapses into a drawer; home single column; no horizontal scroll (extend the existing overflow tests to `/` and the static pages).
