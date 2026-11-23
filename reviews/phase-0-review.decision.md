# Phase 0 — Decision (coordinator)

Date: 2026-11-24 · Review: `reviews/phase-0-review.md` (VERDICT: FAIL, 1 Major + 2 Minor) · Branch: `phase-0-scaffold`

## Rulings

| # | Item | Ruling |
|---|---|---|
| R1 | Issue 1 (Major) `railway.json` is Config as Code, deprecated; not read for services created after 2026-08-28, hard cutoff 2026-12-01 | **FIX.** Move settings to Railway service settings (dashboard) + root npm scripts; delete `railway.json`. Do NOT use `.railway/railway.ts` (IaC) — more tooling, more risk. |
| R2 | Issue 2 (Minor) ARCHITECTURE §10 / ADR-01 say `@nestjs/serve-static` | **FIX** (docs only). |
| R3 | Issue 3 (Minor) `prisma` still in devDependencies | **FIX** (new commit, never amend). |
| R4 | Owner request: footer fully translated in English | **DO.** Owner decision. SPEC edits below are AUTHORIZED by this decision. |
| R5 | Owner request: footer close button | **DO.** Owner decision. SPEC edits below are AUTHORIZED by this decision. |
| R6 | `docs/PROMPTS.md` section c prints a fix prompt and forbids writing files; the project now reviews in a separate Claude Code project and the coordinator writes decision files | **FIX** (rewrite c + top table). |
| R7 | `reviews/` folder untracked | **Commit it** (owner does not hide it). |
| — | Nest 11, Express static middleware, root `start` script | Accepted. Keep. |

## Fix instructions

```text
SETTINGS: Sonnet 5.5 + Medium, Plan mode ON

You are the builder. Work on branch phase-0-scaffold. Read CLAUDE.md, docs/SPEC.md, docs/ARCHITECTURE.md, docs/PROGRESS.md, docs/TRACEABILITY.md, docs/PROMPTS.md, frontend/CONTEXT.md, reviews/phase-0-review.md and this file. Apply the items below exactly, in order. This decision AUTHORIZES the docs/SPEC.md edits listed in item 4 (and only those). Never force-push, rewrite history, or amend old commits. Run npm run secrets:check before every commit. Conventional Commits; no Co-Authored-By / "Generated with" / mention of Claude or AI in any commit, tag or PR.

1. Prisma (review issue 3): in backend/package.json move "prisma" (same version ^6.19.3) from devDependencies to dependencies. npm install to update package-lock.json. Commit "fix(backend): move prisma CLI to runtime dependencies".

2. Docs (review issue 2): in docs/ARCHITECTURE.md §10 "Topology" row replace "(`@nestjs/serve-static`, SPA fallback to `index.html`)" with "(Express static middleware + SPA fallback to `index.html` in `backend/src/configure-app.ts`; `/api` and `/socket.io` excluded)". In ADR-01 replace "serve-static" with "static file serving". Commit "docs: describe SPA serving as Express middleware".

3. Railway config (review issue 1). Railway Config as Code (railway.json) is deprecated and is not read for this service; hard cutoff 2026-12-01. Target: build and start come from the root npm scripts ("build" and "start") which Railpack uses automatically; healthcheck and restart policy live in the Railway service settings.
   a. STOP and give the owner these steps in simple Vietnamese, then wait for "xong":
      - Railway → project fearless-growth → service web → tab Settings.
      - Section "Config-as-code" (menu on the right): if a config file path (e.g. railway.json) is set, remove it/clear the field. If nothing is set, do nothing.
      - Section "Deploy": Healthcheck Path = /api/v1/health. Restart policy = On Failure, max retries 5. Leave Custom Start Command and Build Command EMPTY (Railpack uses npm run build / npm start).
      - Click the purple "Deploy"/"Apply changes" bar at the top.
      Tell the owner to send a screenshot if any field cannot be found; do not guess UI names beyond these.
   b. After "xong": git rm railway.json. In docs/ARCHITECTURE.md §10 "Start" row write: "Root `npm start` = `cd backend && npx prisma migrate deploy && node dist/main.js` (Railpack runs root `npm run build` then `npm start`). Healthcheck `GET /api/v1/health` and restart policy On Failure ×5 are set in Railway service settings (dashboard). No railway.json/railway.toml: Railway Config as Code is deprecated (cutoff 2026-12-01)." In docs/PROGRESS.md Phase 0 checklist, change the text "`railway.json` (build + start + healthcheck `/api/v1/health`)" to "Railway service settings (healthcheck `/api/v1/health`, restart On Failure ×5) + root build/start scripts (no railway.json)" and keep it ticked. Commit "chore(deploy): replace railway.json with Railway service settings".
   c. Push, then railway up from this branch. Check https://web-production-49fda79f.up.railway.app/api/v1/health → db up, provider binance, connected true. Ask the owner (Vietnamese) to open the latest deployment in Railway and confirm it shows the healthcheck on /api/v1/health succeeded.

4. Footer (owner request; SPEC edits authorized):
   a. docs/SPEC.md edits, exactly:
      - Row "Official title (use exactly, Vietnamese, in UI footer and README)": rename the label to "Official title, Vietnamese (use exactly; README and Vietnamese UI footer)". Keep the value.
      - Add a row right after it: | Official title, English (English UI footer) | **Building a Web Application for Cryptocurrency Market Tracking with Real-Time Technical Charts and Price Alerts** |
      - Add a row after the Disclaimer row: | Course line (footer, translated) | vi: "Đồ án chuyên ngành — UIT" / en: "Specialized Project — UIT" |
      - AC-I18N-02: replace the test sentence part "no visible text contains Vietnamese diacritics except the two footer lines with `data-testid` `footer-title` and `footer-course` (the official title and "Đồ án chuyên ngành — UIT", shown in Vietnamese in both languages)" with "no visible text contains Vietnamese diacritics (no exceptions)".
      - AC-UI-03 becomes: "Footer is visible by default. vi: Vietnamese official title, vi disclaimer, "Đồ án chuyên ngành — UIT". en: English official title, en disclaimer, "Specialized Project — UIT" (testids `footer-title`, `footer-course` and the existing disclaimer testid). Footer has a close button (`data-testid="footer-close"`, translated aria-label); clicking it hides the footer; after reload it stays hidden (stored in localStorage, same for guests and logged-in users)."
      - Compliance row: "disclaimer in footer" → "disclaimer in footer (visible by default; the user may close the footer)".
   b. Implement: i18n keys for title and course per language (no hard-coded strings), close button with token colors only, localStorage key in the same style as the theme preference. Keep AC-UI-01 ("footer visible" on first visit) passing.
   c. Update e2e tests: AC-UI-03 test checks both languages' exact texts, close, reload → still hidden. AC-I18N-02 is a later phase: do not write it now, only keep the SPEC wording. Update docs/TRACEABILITY.md. Commit "feat(frontend): translate footer and add close button".

5. docs/PROMPTS.md (process change):
   a. In the top table: row "Phase checklist done + CI green" → prompt "c. PHASE REVIEW — paste into the Claude Code project 'Đồ án chuyên ngành - Review', not the builder", settings "Opus 5.5 + High, ask before edits (not Auto)". Row "Review said FAIL" → prompt "coordinator writes reviews/phase-<N>-review.decision.md; paste into the builder: Read reviews/phase-<N>-review.decision.md and apply the Fix instructions block exactly", settings "as written in the decision".
   b. Replace the whole section "## c. PHASE REVIEW PROMPT" with the text between the BEGIN-C and END-C markers at the end of this file (without the markers).
   c. In PHASE START (b) final sentence and KICKOFF (a) final sentence, replace "run the PHASE REVIEW PROMPT in a new session with Opus 5.5 + High" / "the next step is the PHASE REVIEW PROMPT ... with Opus 5.5 + High" with "the next step is the PHASE REVIEW (section c) in the Review project".
   Commit "docs: route phase reviews through the Review project".

6. git add reviews/ (all files, including this decision). Commit "docs: add review and decision records".

7. Definition of Done: npm run check passes, push, CI green on phase-0-scaffold for the latest commit, redeployed health OK (item 3c), docs/PROGRESS.md gets one dated log line: model + effort, "applied reviews/phase-0-review.decision.md", list of doc changes (SPEC: title rows, course row, AC-I18N-02, AC-UI-03, compliance; ARCHITECTURE §10 + ADR-01; PROMPTS c + table), last commit hash, CI status. End with "Cách kiểm tra thủ công" in simple Vietnamese (footer EN/VI texts, close + reload, health URL) and tell the owner the next step is the Recheck in the Review project. Do not merge.
```

## Recheck (paste into the Review project after the builder finishes)

```text
Recheck Phase 0 of crypto-alert on branch phase-0-scaffold (~/Projects/crypto-alert). Read-only; the only file you may create is reviews/phase-0-recheck.md.
Read reviews/phase-0-review.md and reviews/phase-0-review.decision.md. For each item 1–7 of the decision's Fix instructions, verify it was done exactly (git log/diff main...phase-0-scaffold, files, CI via gh run list --branch phase-0-scaffold --limit 3, npm run check where the environment allows). The docs/SPEC.md edits listed in decision item 4a are authorized — check they match the decision word for word; any other SPEC change is Major. Check the live app https://web-production-49fda79f.up.railway.app: /api/v1/health → db up, provider binance, connected true; POST /api/v1/test/reset → 404; footer EN/VI texts and close button behave as the new AC-UI-03 says; railway.json is gone. Check commit messages have no Co-Authored-By / "Generated with" / Claude / AI.
Write: VERDICT: PASS or FAIL (PASS only if no Blocker/Major), Issues (numbered, severity, file:line, 1–2 sentences simple Vietnamese), Tóm tắt cho chủ dự án (3–5 lines Vietnamese). Do not write a fix prompt.
```

BEGIN-C
## c. PHASE REVIEW PROMPT — paste into the Claude Code project "Đồ án chuyên ngành - Review" (NOT the builder)

Settings: Opus 5.5 + High, ask before edits (not Auto). Replace `<N>`, `<name>` (from PROGRESS.md) and `<URL>` (deployed URL from PROGRESS.md). For a recheck after a decision, use the Recheck block written in `reviews/phase-<N>-review.decision.md` instead.

```text
Review Phase <N> of crypto-alert on branch phase-<N>-<name> (folder ~/Projects/crypto-alert). Read-only: do not edit, commit, push, or switch branches if the working tree is dirty. The only file you may create is reviews/phase-<N>-review.md.

1. Read CLAUDE.md, docs/SPEC.md, docs/ARCHITECTURE.md, docs/API.md, docs/DATABASE.md, docs/PROGRESS.md, docs/TRACEABILITY.md, backend/CONTEXT.md, frontend/CONTEXT.md, and any reviews/*.decision.md files.
2. git diff main...phase-<N>-<name> --stat, then read the changed files and the docs diff. A change to docs/SPEC.md not authorized by a reviews/*.decision.md file, or a contract change that makes an AC easier to pass, is Major.
3. CI: gh run list --branch phase-<N>-<name> --limit 3 (latest run green and for the latest commit). Run npm run check; if the environment blocks part of it, say which part and rely on CI.
4. For every AC ID listed for Phase <N> in docs/PROGRESS.md: a Playwright test titled with that ID exists, really checks what SPEC.md says (no trivial, skipped or weakened assertions), and TRACEABILITY.md is correct.
5. Contracts and rules: API.md routes/fields/events/error codes; DATABASE.md schema and migrations (no db push, no edited migrations); CLAUDE.md hard rules; no secrets committed; PROGRESS.md checklist + log line; Conventional Commits; no commit message contains "Co-Authored-By", "Generated with", or mentions Claude/AI (git log main..phase-<N>-<name> --format=%B).
6. Live app: GET <URL>/api/v1/health → db up, provider binance, connected true; POST <URL>/api/v1/test/reset → 404.
7. Assess every deviation the builder declared in the PROGRESS.md log line.

Write reviews/phase-<N>-review.md:
VERDICT: PASS or FAIL (PASS only if no Blocker or Major issues)
Issues: numbered; each with severity (Blocker / Major / Minor), file and line, what is wrong, and 1–2 sentences in simple Vietnamese.
Tóm tắt cho chủ dự án: 3–5 lines in simple Vietnamese.
Do not write a fix prompt; the project coordinator writes the decision file.
```
END-C
