# PROMPTS — ready to paste into Claude Code

How to use: (1) start Claude Code in the project folder, (2) run `/model` and select the model + effort on the SETTINGS line, (3) turn Plan mode ON/OFF as stated (Shift+Tab cycles modes), (4) paste the whole block **including** the SETTINGS line, replacing `<…>` placeholders. When Claude Code shows a plan in Plan mode, approve it to let it start.

| When | Prompt | Settings |
|---|---|---|
| Very first session | a. KICKOFF | Sonnet 5.5 + Medium, Plan ON |
| Start or continue phase N | b. PHASE START | see table inside b |
| Phase checklist done + CI green | c. PHASE REVIEW — paste into the Claude Code project 'Đồ án chuyên ngành - Review', not the builder | Opus 5.5 + High, ask before edits (not Auto) |
| Review said PASS | e. MERGE | Sonnet 5.5 + Medium, Plan OFF |
| Review said FAIL | coordinator writes reviews/phase-<N>-review.decision.md; paste into the builder: Read reviews/phase-<N>-review.decision.md and apply the Fix instructions block exactly | as written in the decision |
| Same bug failed 2–3 times | d. STUCK BUG | Opus 5.5 + Extra, Plan OFF (it stops and waits for "OK fix"); near quota limit → Sonnet 5.5 + Medium |
| Something broke, go back | f. ROLLBACK | Sonnet 5.5 + Medium, Plan OFF (it stops and waits for your choice) |

In a review session, if Claude Code asks to leave Plan mode, answer **No** — reviews must stay read-only.

**Quota rule:** near the weekly quota limit (`/usage`) → Sonnet 5.5 + Medium for everything except Phase Review (including STUCK BUG); Plan mode stays as written.

---

## a. KICKOFF PROMPT

```text
SETTINGS: Sonnet 5.5 + Medium, Plan mode ON

You are starting a new project. Before doing anything else, read these files completely: CLAUDE.md, docs/SPEC.md, docs/ARCHITECTURE.md, docs/API.md, docs/DATABASE.md, docs/PROGRESS.md, docs/TRACEABILITY.md, backend/CONTEXT.md, frontend/CONTEXT.md. They are the source of truth; do not invent requirements.

Then do ONLY Phase 0 from docs/PROGRESS.md, in checklist order:
1. Git setup first: git init on main, complete .gitignore, first commit containing only the docs ("docs: initial project documentation"), create a PUBLIC GitHub repo with gh and push main, then create and push branch phase-0-scaffold. If gh is not installed or not logged in, stop and give me step-by-step instructions in simple Vietnamese, then wait.
2. Continue with the remaining Phase 0 items on branch phase-0-scaffold. Commit after each checklist item using Conventional Commits and push. Run npm run secrets:check before every commit. Never force-push, rewrite history, or delete branches/tags.
3. For steps that need me (Railway account, railway login, choosing region Singapore, entering secret values), give me exact numbered instructions in simple Vietnamese and wait for my reply.
4. Do not implement anything from later phases.

In Plan mode, first show me a short plan of the Phase 0 items (in English) plus a 3-line summary in Vietnamese of what I will have at the end. After I approve, execute.

Finish only when the Definition of Done in CLAUDE.md is met: npm run check passes, CI is green on phase-0-scaffold, the deployed /api/v1/health shows provider "binance" and connected true, docs/PROGRESS.md (ticks + dated log line with last commit hash) and docs/TRACEABILITY.md are updated. End your reply with "Cách kiểm tra thủ công" (numbered, simple Vietnamese) and tell me the next step is the PHASE REVIEW (section c) in the Review project.
```

---

## b. PHASE START PROMPT (template)

Settings per phase (copy the matching SETTINGS line). Branch name examples: `phase-7a-foundation`, `phase-7b-market-data`.

| Phase | SETTINGS line |
|---|---|
| 0 scaffold (any session after KICKOFF) | `SETTINGS: Sonnet 5.5 + Medium, Plan mode ON` |
| 1 auth · 2 market+chart · 5 watchlist · 6a · 6b · 7a · 7b · 7c · 7e · 8 release | `SETTINGS: Sonnet 5.5 + Medium, Plan mode ON` |
| 3 real-time · 4 indicators · 6 alerts · 7d · 7f | `SETTINGS: Opus 5.5 + High, Plan mode ON` (near the weekly quota limit → Sonnet 5.5 + Medium for everything except Phase Review) |

```text
SETTINGS: <paste the SETTINGS line for phase N from the table above>

Work on Phase <N> only.

1. Read completely: CLAUDE.md, docs/SPEC.md, docs/ARCHITECTURE.md, docs/API.md, docs/DATABASE.md, docs/PROGRESS.md, docs/TRACEABILITY.md, backend/CONTEXT.md, frontend/CONTEXT.md.
2. Read-only checks: git status, current branch, whether tag v0.<N-1> exists (Phase <N-1> merged), whether branch phase-<N>-<name from PROGRESS.md> exists and which checklist items are already ticked. If N = 0: skip the v0.<N-1> tag check; branch phase-0-scaffold must already exist (created by KICKOFF); never run git init or create the GitHub repo again.
3. In Plan mode, show: the git steps you will take, the remaining checklist items of Phase <N>, the AC IDs they cover, and how each AC will be tested in Playwright. Add a 3-line Vietnamese summary for me. Wait for my approval.
4. After approval, git first: if the working tree is dirty, commit it; if the phase branch exists, switch to it and continue from the first unticked item; otherwise create it from an up-to-date main and push it. If v0.<N-1> is missing, stop and tell me in Vietnamese. If N = 0: skip the v0.<N-1> tag check; branch phase-0-scaffold must already exist (created by KICKOFF); never run git init or create the GitHub repo again.
5. Implement item by item. After each item: run the relevant tests, npm run secrets:check, commit (Conventional Commits), push. Write a Playwright test for every AC of this phase, titled with its AC ID, and update docs/TRACEABILITY.md in the same commit.
6. Do not touch features of other phases. Never edit docs/SPEC.md (AC steps, thresholds, scope, IDs): if an AC looks wrong or impossible, stop, explain in simple Vietnamese and wait for me. You may edit API.md, DATABASE.md or ARCHITECTURE.md only to resolve a contradiction (choose the option most consistent with API.md/DATABASE.md), in the same commit, and you must list every doc change in the PROGRESS.md log line.
7. If the same bug survives 2 fix attempts, stop and tell me in Vietnamese to use the STUCK BUG PROMPT.
8. If the session gets long, finish the current item, commit, log, and stop.

Finish with the Definition of Done from CLAUDE.md: npm run check passes, local smoke run passes (db:migrate, db:seed, npm run dev + /api/v1/health), CI green on the branch, docs/PROGRESS.md ticked + one dated log line (model + effort, summary, last commit hash, CI status), docs/TRACEABILITY.md updated. End with "Cách kiểm tra thủ công" in simple Vietnamese (numbered steps in the browser, what I should see), the list of AC IDs now passing, and the next step (continue this phase, or the PHASE REVIEW (section c) in the Review project).
```

---

## c. PHASE REVIEW PROMPT — paste into the Claude Code project "Đồ án chuyên ngành - Review" (NOT the builder)

Settings: Opus 5.5 + High, ask before edits (not Auto). Replace `<N>`, `<name>` (from PROGRESS.md) and `<URL>` (deployed URL from PROGRESS.md). For a recheck after a decision, use the Recheck block written in `reviews/phase-<N>-review.decision.md` instead.

```text
Review Phase <N> of crypto-alert on branch phase-<N>-<name> (folder ~/Projects/crypto-alert). Read-only: do not edit, commit, push, or switch branches if the working tree is dirty. The only file you may create is reviews/phase-<N>-review.md.

1. Read CLAUDE.md, docs/SPEC.md, docs/ARCHITECTURE.md, docs/API.md, docs/DATABASE.md, docs/PROGRESS.md, docs/TRACEABILITY.md, backend/CONTEXT.md, frontend/CONTEXT.md, and any reviews/*.decision.md files.
2. git diff main...phase-<N>-<name> --stat, then read the changed files and the docs diff. A change to docs/SPEC.md not authorized by a reviews/*.decision.md file, or a contract change that makes an AC easier to pass, is Major.
3. CI: gh run list --branch phase-<N>-<name> --limit 3 (latest run green and for the latest commit). Run npm run check; if the environment blocks part of it, say which part and rely on CI.
4. For every AC ID listed for Phase <N> in docs/PROGRESS.md: a Playwright test titled with that ID exists, really checks what SPEC.md says (no trivial, skipped or weakened assertions), and TRACEABILITY.md is correct.
5. Compare screens with docs/design/v2/*.png. Contracts and rules: API.md routes/fields/events/error codes; DATABASE.md schema and migrations (no db push, no edited migrations); CLAUDE.md hard rules; no secrets committed; PROGRESS.md checklist + log line; Conventional Commits; no commit message contains "Co-Authored-By", "Generated with", or mentions Claude/AI (git log main..phase-<N>-<name> --format=%B). Scripts in the root and workspace package.json files that CLAUDE.md Commands relies on (dev, start:dev, db:migrate, db:seed, build, start) must use valid syntax for the CLI tools actually installed (check the tool's own help/source in node_modules); a broken local script is Major.
6. Live app: GET <URL>/api/v1/health → db up, provider binance, connected true; POST <URL>/api/v1/test/reset → 404.
7. Assess every deviation the builder declared in the PROGRESS.md log line.

Write reviews/phase-<N>-review.md:
VERDICT: PASS or FAIL (PASS only if no Blocker or Major issues)
Issues: numbered; each with severity (Blocker / Major / Minor), file and line, what is wrong, and 1–2 sentences in simple Vietnamese.
Tóm tắt cho chủ dự án: 3–5 lines in simple Vietnamese.
Do not write a fix prompt; the project coordinator writes the decision file.
```

---

## d. STUCK BUG PROMPT

Near the weekly quota limit → Sonnet 5.5 + Medium for everything except Phase Review (so use `SETTINGS: Sonnet 5.5 + Medium, Plan mode OFF` here).

```text
SETTINGS: Opus 5.5 + Extra, Plan mode OFF

The following bug has survived 2–3 fix attempts: <describe what I see in the browser or paste the failing test name / CI error>.

Stop patching. Work like this:
1. Read CLAUDE.md, docs/PROGRESS.md and the docs sections relevant to this bug (SPEC, API, DATABASE, ARCHITECTURE, CONTEXT files).
2. git status: if the working tree is dirty, commit it as "chore: wip before bug investigation" and push. Do not revert previous attempts yet.
3. Read git log -10 and the diffs of the previous fix attempts to understand what was tried and why it did not work.
4. Reproduce the bug with an automated test that FAILS now (prefer a unit or integration test; use a Playwright test if it is UI behaviour; if it maps to an AC, use that AC's test). Run it and show the failure.
5. Commit the failing test ("test: reproduce <bug>") and push. Then STOP and explain in simple Vietnamese for a non-programmer: what the bug is, the real root cause, why earlier fixes failed, and the smallest correct fix. Also give a short English plan. Do not change application code until I reply "OK fix".
6. After I reply "OK fix": implement the fix, remove leftovers from failed attempts if they are wrong, make the new test pass without weakening any test, run npm run check, npm run secrets:check, commit ("fix: <what>"), push, and confirm CI is green.
7. Add a dated log line to docs/PROGRESS.md (model Opus 5.5 + Extra, bug, root cause in one line, commit hash). End with "Cách kiểm tra thủ công" in simple Vietnamese.
```

---

## e. MERGE PROMPT (only after the review verdict is PASS)

```text
SETTINGS: Sonnet 5.5 + Medium, Plan mode OFF

The Phase Review for Phase <N> returned VERDICT: PASS. Merge it safely:
1. git status must be clean on phase-<N>-<name>; latest CI run on that branch must be green for the latest commit (gh run list --branch phase-<N>-<name> --limit 1). If not, stop and explain in Vietnamese.
2. git switch main && git pull --ff-only.
3. git merge --no-ff phase-<N>-<name> -m "chore: merge phase <N> <name>" and push main. If there is a conflict, stop and explain in Vietnamese; do not resolve by deleting work.
4. Wait for CI on main to be green (gh run watch). If red, stop and tell me to use the ROLLBACK or STUCK BUG prompt.
5. Create the annotated tag named in the phase decision (7a→v0.7.1, 7b→v0.7.2, 7c→v0.7.3, 7d→v0.7.4, 7e→v0.7.5, 7f→v0.7.6, 8→v0.8 and v1.0) on the merge commit and push it.
6. Railway autodeploys `main` once CI on the merge commit passes. Wait (poll up to 15 min) until GET <URL>/api/v1/health returns ok with the new version/behaviour; if no new deployment appears, stop and ask the owner (fallback: owner runs `railway up --ci -s web`).
7. On main, append to docs/PROGRESS.md the merge log line: "- YYYY-MM-DD · MERGED into main · merge <short-hash> · tag <tag> · CI green · deployed", set the phase state to "done" in the Status table, commit "docs: log phase <N> merge", push.
Never force-push, rewrite history, or delete branches or tags. End with a 3-line Vietnamese summary and the next prompt to use (PHASE START PROMPT for phase <N+1>, with its settings).
```

---

## f. ROLLBACK PROMPT

```text
SETTINGS: Sonnet 5.5 + Medium, Plan mode OFF

Something is broken and I want to go back to an earlier working state. Do it safely, without rewriting history.
1. Read CLAUDE.md (Git rules) and docs/PROGRESS.md.
2. git status: if the working tree is dirty, commit it as "chore: wip before rollback" and push, so nothing is lost.
3. Show me, in simple Vietnamese, a table of the last 15 commits on the current branch and on main (short hash, date, Conventional Commit message explained in plain words) and all tags (v0.N) with the phase each one marks, plus the CI status of each tag's commit (gh run list). Recommend the best restore point and explain why in 2–3 Vietnamese sentences.
4. STOP and wait for me to reply with the tag or commit I choose. Change nothing else before that.
5. Restore using ONLY safe methods, and tell me in Vietnamese which one you chose:
   - to undo recent work on a branch: git revert the unwanted commits (git revert -m 1 <merge> for merge commits), creating new commits;
   - to inspect or restart from an old point: create a new branch, e.g. git switch -c restore-from-<tag> <tag>, and push it.
   Never use git reset --hard on pushed commits, git push --force, rebase, or delete branches/tags.
6. Run npm run check, npm run secrets:check, push, and confirm CI is green on the affected branch. If main was changed, redeploy main to Railway and check /api/v1/health.
7. Add a dated log line to docs/PROGRESS.md ("ROLLBACK to <tag/commit> via <revert/new branch> · commit <hash> · CI green"), commit "docs: log rollback", push. End with "Cách kiểm tra thủ công" in simple Vietnamese.
```
