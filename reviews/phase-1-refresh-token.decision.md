# Decision — Phase 1 mid-phase: refresh-token reuse detection

Date: 2026-11-24 · Decided by: project owner (via coordinator), during Phase 1 build.

## Problem
docs/DATABASE.md said presenting ANY revoked refresh token revokes all of the user's tokens ("reuse detection").
docs/SPEC.md AC-PROF-04 requires that logging out / changing password on one session does not break other sessions in the way that rule would.
The two documents conflicted; SPEC.md is the arbiter.

## Decision
- Reuse detection (revoke ALL of the user's refresh tokens) applies ONLY when a token that was ROTATED (replaced_by_id IS NOT NULL) is presented again after the 10 s grace window.
- A token revoked by logout or change-password → respond 401 REFRESH_TOKEN_INVALID only; other sessions are unaffected.

## Authorized doc edits
- docs/DATABASE.md §refresh_tokens, docs/API.md §3.1, docs/ARCHITECTURE.md §6 — updated to the rule above.
- docs/SPEC.md: NOT changed (none needed).

## For the reviewer
These doc edits are authorized and are not a contract weakening. Still verify: the code implements exactly this rule (rotated-token reuse after 10 s → revoke all; within 10 s → behaves as documented in API.md; logout/password-revoked → REFRESH_TOKEN_INVALID only), and tests cover both branches.
