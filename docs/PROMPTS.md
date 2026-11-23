# PROMPTS — ready to paste into Claude Code

How to use: (1) start Claude Code in the project folder, (2) run `/model` and select the model + effort on the SETTINGS line, (3) turn Plan mode ON/OFF as stated (Shift+Tab cycles modes), (4) paste the whole block **including** the SETTINGS line, replacing `<…>` placeholders. When Claude Code shows a plan in Plan mode, approve it to let it start.

| When | Prompt | Settings |
|---|---|---|
| Very first session | a. KICKOFF | Sonnet 5.5 + Medium, Plan ON |
| Start or continue phase N | b. PHASE START | see table inside b |
| Phase checklist done + CI green | c. PHASE REVIEW (new session) | Opus 5.5 + High, Plan ON |
| Review said PASS | e. MERGE | Sonnet 5.5 + Medium, Plan OFF |
| Review said FAIL | the fix prompt printed by the review | same as phase |
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

Finish only when the Definition of Done in CLAUDE.md is met: npm run check passes, CI is green on phase-0-scaffold, the deployed /api/v1/health shows provider "binance" and connected true, docs/PROGRESS.md (ticks + dated log line with last commit hash) and docs/TRACEABILITY.md are updated. End your reply with "Cách kiểm tra thủ công" (numbered, simple Vietnamese) and tell me the next step is the PHASE REVIEW PROMPT for phase 0 in a new session with Opus 5.5 + High.
```

---

## b. PHASE START PROMPT (template)

Settings per phase (copy the matching SETTINGS line):

| Phase | SETTINGS line |
|---|---|
| 0 scaffold (any session after KICKOFF) | `SETTINGS: Sonnet 5.5 + Medium, Plan mode ON` |
| 1 auth · 2 market+chart · 5 watchlist · 7 release | `SETTINGS: Sonnet 5.5 + Medium, Plan mode ON` |
| 3 real-time · 4 indicators · 6 alerts | `SETTINGS: Opus 5.5 + High, Plan mode ON` (near the weekly quota limit → Sonnet 5.5 + Medium for everything except Phase Review) |

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

Finish with the Definition of Done from CLAUDE.md: npm run check passes, CI green on the branch, docs/PROGRESS.md ticked + one dated log line (model + effort, summary, last commit hash, CI status), docs/TRACEABILITY.md updated. End with "Cách kiểm tra thủ công" in simple Vietnamese (numbered steps in the browser, what I should see), the list of AC IDs now passing, and the next step (continue this phase, or run the PHASE REVIEW PROMPT in a new session with Opus 5.5 + High).
```

---

## c. PHASE REVIEW PROMPT

```text
SETTINGS: Opus 5.5 + High, Plan mode ON

You are an independent reviewer in a fresh session. This session is READ-ONLY: do not edit, create or delete any file, do not commit, push, merge or change branches' content, and do not ask to exit Plan mode — just output the report. You may only read files and run read-only or test commands (git status, git log, git diff, gh run list/view, npm run check, npm run test:e2e). Run them on branch phase-<N>-<name> (git switch is allowed only if the working tree is clean).

Review Phase <N> on branch phase-<N>-<name>.

1. Read CLAUDE.md, docs/SPEC.md, docs/ARCHITECTURE.md, docs/API.md, docs/DATABASE.md, docs/PROGRESS.md, docs/TRACEABILITY.md, backend/CONTEXT.md, frontend/CONTEXT.md.
2. Look at the changes: git diff main...phase-<N>-<name> --stat, then read the changed files. Also run git diff main...phase-<N>-<name> -- docs CLAUDE.md backend/CONTEXT.md frontend/CONTEXT.md; any change to docs/SPEC.md, or any contract change that makes an AC easier to pass, is a Major issue.
3. Check CI: gh run list --branch phase-<N>-<name> --limit 3 (latest run must be green and for the latest commit). Run npm run check locally.
4. For every AC ID listed for Phase <N> in docs/PROGRESS.md:
   - a Playwright test exists whose title starts with that ID;
   - the test really checks what SPEC.md says (not a trivial or skipped test, no weakened assertions);
   - TRACEABILITY.md status is correct.
5. Check the contracts and rules: routes, field names, event names and error codes exactly as API.md; schema and migrations per DATABASE.md (no db push, no edited migrations, no BigInt); CLAUDE.md hard rules (no hard-coded UI strings, codes not messages from backend, tokens only for colors, no secrets committed, no password hashes returned, attribution logo on, nothing out of scope); PROGRESS.md checklist and log line present; Git rules (branch name, Conventional Commits, no force-push).
6. Output, in this exact order:
   VERDICT: PASS or FAIL  (PASS only if there are no Blocker or Major issues)
   Issues: numbered list. Each issue: severity (Blocker / Major / Minor), file and line, what is wrong, and a 1–2 sentence explanation in simple Vietnamese for a non-programmer.
   Tóm tắt cho chủ dự án: 3–5 lines in simple Vietnamese (what works, what does not, what to do next).
   Kiểm tra thủ công đề nghị: 3–6 numbered browser checks in simple Vietnamese.
   If FAIL: one English fix prompt in a code block that I can paste into a new coding session. It must start with the SETTINGS line of this phase from docs/PROMPTS.md (Plan mode ON), list every Blocker and Major issue with file paths, and require the Definition of Done from CLAUDE.md.
   If PASS: tell me to run the MERGE PROMPT for phase <N> (Sonnet 5.5 + Medium, Plan mode OFF).
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
5. Create annotated tag v0.<N> on the merge commit ("Phase <N> complete") and push the tag. For Phase 7 also create and push tag v1.0.
6. Redeploy main to Railway (railway up from a clean checkout of main) and check GET /api/v1/health on the live URL (status ok, provider binance, connected true).
7. On main, append to docs/PROGRESS.md the merge log line: "- YYYY-MM-DD · MERGED into main · merge <short-hash> · tag v0.<N> · CI green · deployed", set the phase state to "done" in the Status table, commit "docs: log phase <N> merge", push.
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
