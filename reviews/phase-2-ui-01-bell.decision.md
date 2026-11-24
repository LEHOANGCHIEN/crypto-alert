# Decision — Phase 2: AC-UI-01 header bell and user menu

Date: 2026-11-24 · Decided by: project coordinator (on behalf of the owner), after the Phase 2 build, before the Phase 2 review.

## Problem
docs/SPEC.md AC-UI-01 (assigned to Phase 2) lists a header "bell" and "user menu".
The bell belongs to the notifications feature (AC-NOTIF-01…04, PROGRESS Phase 6 checklist: "bell badge (9+), notifications panel"), which does not exist in Phase 2.
The Phase 2 AC-UI-01 test (e2e/tests/layout.spec.ts) checks logo, language switcher, theme toggle, Login/Register (guest) and footer, and TRACEABILITY.md notes that the bell is built in Phase 6.

## Decision
- Phase 2: AC-UI-01 is accepted WITHOUT the bell assertion. Building a placeholder bell now is not required and must not be requested.
- "user menu": docs/ARCHITECTURE.md §UI (header row) specifies "user menu or Login/Register". Checking Login/Register for a guest satisfies AC-UI-01 for Phase 2; the logged-in user menu is already covered by AC-AUTH-07 (data-testid user-menu).
- Phase 6 obligation: when the bell is built, extend the existing AC-UI-01 test (do not create a second test with that ID) to log in and assert the header bell is visible, and remove the "bell is built in Phase 6" note from TRACEABILITY.md. The Phase 6 reviewer must check this.

## Authorized doc edits
None. docs/SPEC.md is NOT changed.

## For the reviewer
Do not count the missing bell assertion in AC-UI-01 as a Blocker/Major in Phase 2. Still verify everything else AC-UI-01 and AC-UI-02 require (three columns at 1440×900 with Watchlist/Alerts tabs; 390×844 single column with bottom tabs Markets / Chart / Watchlist / Alerts, each tab shows its panel, no horizontal page scroll).
