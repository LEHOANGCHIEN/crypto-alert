# Decision — Phase 7a review (VERDICT: FAIL, 2 Major + 7 Minor) + owner feedback from the manual check

Date: 2026-11-28 · Decided by: project coordinator (on behalf of the owner) · Source: reviews/phase-7a-review.md + owner's manual check (social links in the footer, breadcrumb too small).

## Rulings — review issues
| # | Issue | Ruling |
|---|---|---|
| 1 | MAJOR: 390×844 overflow checks on site pages measure `documentElement`, but the site scrolls inside `site-shell` → they can never fail | **Fix now.** In home.spec, static.spec and nav.spec (and any other site-page overflow check) also assert `site-shell.scrollWidth − site-shell.clientWidth ≤ 0` (keep the `documentElement` check). Run at 390×844 for `/`, all 9 static pages, and the guest header (Login/Register visible). If the new check fails, fix the layout — never by `overflow-x-hidden` on the shell. |
| 2 | MAJOR: no disclaimer on `/chart/*` below 1024 px (status bar hidden) | **Fix now.** Below 1024 px show a compact disclaimer line on the chart page (e.g. one 10–11 px line above the bottom tab bar, testid `chart-disclaimer-mobile`, translated). Add to the AC-UI-03 test a 390×844 step: `/chart/BTCUSDT` shows the disclaimer and has no horizontal scroll. |
| 3 | Minor: arbitrary values (`max-w-[1280px]`, `grid-cols-[1.4fr_2.6fr]`, `max-h-[70vh]`, `text-4xl`) | **Fix now**: tokens in tokens.css (`--container-site: 1280px`, a hub/static title size token, footer grid and dialog max-height tokens or equivalent utilities) + ARCHITECTURE §11.3. |
| 4 | Minor: AC-UI-01 "status bar at the bottom" check too loose | **Fix now**: `expect(Math.round(status.y + status.height)).toBe(900)`; fix the indentation. |
| 5 | Minor: AC-SITE-01 avatar and AC-UI-09 logged-in bell/user menu not asserted | **Fix now**: assert the avatar in every `summary-card-*`; after the return-to login in the AC-UI-09 test assert `site-header` contains the bell and `user-menu`. |
| 6 | Minor: doc edits outside decision §3 (PROMPTS b settings table, PROMPTS e tag sentence, PROGRESS Phase 8 lost "smoke-check each feature on the live URL") | PROMPTS b table: **accepted**. PROGRESS Phase 8: **restore** "smoke-check each feature on the live URL". PROMPTS e step 5 → "Create the annotated tag named in the phase decision (7a→v0.7.1, 7b→v0.7.2, 7c→v0.7.3, 7d→v0.7.4, 7e→v0.7.5, 7f→v0.7.6, 8→v0.8 and v1.0) on the merge commit and push it." and step 7 "tag v0.<N>" → "tag <tag>". |
| 7 | Minor: ARCHITECTURE out of sync with code (header heights, SearchDialog location, `app/pages/`, no `Dialog`); AC-UI-03 test lives in chart/ | **Fix now**: update ARCHITECTURE §7/§11.3 to the real code (chart header 48, site header 64; `shared/search/`; `app/pages/`; remove `Dialog` or add it if created). Move the AC-UI-03 test into `e2e/tests/site/` (TRACEABILITY path). |
| 8 | Minor: SPEC AC-UI-08 still says "above the footer" | **SPEC edit allowed (only this):** in AC-UI-08 replace "A status bar above the footer shows" with "A status bar at the bottom of the chart page (desktop) shows". |
| 9 | Minor: flaky AC-ALERT-12 (click on a re-rendered element) | **Fix now** at the root: wait for the stable state (the row/button after the list query settles, e.g. the response or a `data-*` attribute) before clicking. No retries, no longer timeouts, no `force: true`. |
| D | Declared deviations (chart header 48 px, `coin-names` → `shared/market`, new helpers, AC-NOTIF-06 waits on `site-shell[data-connected]`, black theme colours in tests) | All **accepted** as assessed by the review. |

## Owner requests (manual check, 2026-11-28)
### O1. Social links in the footer and on /contact
- New config file `frontend/src/shared/config/social.ts` exporting an ordered list `{ id, label, url }` — the ONLY place these links live:
  1. `facebook` · Facebook · https://www.facebook.com/hoangchien.le.7777/
  2. `github` · GitHub · https://github.com/LEHOANGCHIEN
  3. `linkedin` · LinkedIn · https://www.linkedin.com/in/l%C3%AA-chi%E1%BA%BFn-b42a6522a/
  4. `instagram` · Instagram · https://www.instagram.com/le_hoang_chien/
  5. `x` · X · https://x.com/le_hoang_chienn
  6. `reddit` · Reddit · https://www.reddit.com/user/lehoangchien/
  7. `threads` · Threads · https://www.threads.com/@le_hoang_chien
- Footer brand column: a row of icon links under the course/disclaimer lines (testid `footer-social`, each `footer-social-<id>`); `/contact` shows the same list with icon + label (testid `contact-social-<id>`). Each link: `target="_blank"`, `rel="noopener noreferrer"`, translated `aria-label` ("<label> của Lê Hoàng Chiến" / "<label> of Lê Hoàng Chiến"), icon 20 px, colour `text-muted` → `text` on hover/focus, focus ring as usual, ≥ 32 px hit area.
- Icons: use the open-licensed `simple-icons` package (CC0; add it as a frontend dependency, import only the 7 icons used). If an icon is not in the package (e.g. LinkedIn may be missing), use a neutral generic link/globe icon for that entry — never hand-draw a brand logo. Mention the licence in README later (Phase 8).
- **SPEC edit allowed (only this):** in AC-UI-03 after "data attribution line (…) and © year;" insert "a row of the owner's social links from one config file (`footer-social`; each external link `target="_blank"` + `rel="noopener noreferrer"` + translated aria-label), also listed on `/contact`;". The AC-UI-03 test checks: 7 links in `footer-social` with exactly the URLs of the config, target/rel, aria-label; `/contact` lists the same 7.
### O2. Breadcrumb too small
- Shared Breadcrumb component (all pages that have one): 15 px, weight 500 (token), parent items `text-muted` with underline on hover/focus, current item `text` with `aria-current="page"`, separator `›` (aria-hidden), 16–24 px gap below the breadcrumb before the `h1` (token). AC-SITE-03 test: assert the current item has `aria-current="page"` and the computed font-size is 15 px.

## Fix instructions (builder, one session)
SETTINGS: Sonnet 5.5 + Medium, Plan mode ON (show a short plan, then auto mode).
On branch phase-7a-foundation (untracked: reviews/phase-7a-review.md and this file; never stage AGENTS.md):
1. Issues 1 + 2 → `fix(frontend): real overflow checks on site pages and mobile chart disclaimer` (code + tests).
2. Issue 3 → `refactor(frontend): replace arbitrary values with tokens`.
3. Issues 4, 5, 9 → `test(e2e): tighten AC-UI-01/AC-SITE-01/AC-UI-09 and fix AC-ALERT-12 flake`.
4. O1 (+ SPEC AC-UI-03 sentence, test, TRACEABILITY note, CONTEXT testids) → `feat(frontend): owner social links in footer and contact page`.
5. O2 → `feat(frontend): larger breadcrumb`.
6. Issues 6, 7, 8 → `docs: sync architecture, prompts, progress and spec after 7a review` (incl. moving the AC-UI-03 test to `site/` if not done in 4).
7. `git add reviews/phase-7a-review.md reviews/phase-7a-review.decision.md` → `docs: add phase 7a review and decision`.
8. `npm run check` + local smoke run; stop every server (3000/5173/5555/3100 free). Push; wait for CI green on the latest commit; update the TRACEABILITY summary run id if needed (`docs: update traceability ci run`), push. One dated PROGRESS log line. Do NOT merge. End with a 3-line Vietnamese summary + "Cách kiểm tra thủ công" for O1, O2 and issue 2 (390×844).
If any new overflow check fails and the layout fix survives 2 attempts, stop and tell me in Vietnamese.

## Recheck (NEW chat in the Review project, Opus 5.5 + High, ask before edits)
```text
Recheck Phase 7a of crypto-alert on branch phase-7a-foundation (folder ~/Projects/crypto-alert). Read-only; the only file you may create is reviews/phase-7a-recheck.md.
1. Read reviews/phase-7a-review.md and reviews/phase-7a-review.decision.md.
2. For each of the 9 issues and the owner requests O1, O2 verify the fix in git diff 35b593d..HEAD: exactly as ruled, nothing weakened, SPEC changed only in the two allowed sentences (AC-UI-03 social row, AC-UI-08 wording), no unrelated changes. Issue 1: the new checks measure site-shell and would fail on real overflow; issue 9: no retries/timeouts/force.
3. O1: the 7 URLs in frontend/src/shared/config/social.ts equal the decision exactly; target/rel/aria-label; icons from simple-icons or a neutral fallback (no hand-drawn brand logos).
4. CI: latest run green and for the latest commit. Run what npm run check you can; rely on CI for the rest.
5. Commit messages: Conventional Commits, no AI attribution.
Write reviews/phase-7a-recheck.md: VERDICT: PASS or FAIL; one line per item (fixed / not fixed + reason); new problems only if Blocker/Major; 2–3 lines of summary in simple Vietnamese.
```

## Merge (builder, after the recheck says PASS)
SETTINGS: Sonnet 5.5 + Medium, Plan mode OFF, auto mode. Prompt: "Read reviews/phase-7a-review.decision.md and run its Merge block."
0. `git add reviews/phase-7a-recheck.md` → `docs: add phase 7a recheck`, push, wait for CI green.
1–7. Run docs/PROMPTS.md section e with N=7a, branch phase-7a-foundation, merge message `chore: merge phase 7a foundation`, tag **v0.7.1** ("Phase 7a complete"). Step 4: if CI on main is red, stop and show me the failing test — do not revert. Step 6 (autodeploy, never run `railway up`): poll up to 15 min until the live site serves the 7a build — GET https://web-production-49fda79f.up.railway.app/ returns HTML whose main JS asset contains the string `crypto-alert.recent-symbols`; then GET /api/v1/health (ok, binance, connected true), POST /api/v1/test/reset → 404. If the new build does not appear in 15 min, stop and tell the owner in Vietnamese to open Railway → web → Deployments and send a screenshot. Step 7: merge log line under the Phase 7a log, Phase 7a state "done".
Do not change docs/SPEC.md beyond the two sentences above. Do not weaken any existing assertion.
