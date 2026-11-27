# Decision — Phase 6b: right-panel Alerts tab keeps its lists

Date: 2026-11-27 · Decided by: project coordinator (on behalf of the owner) · Context: Phase 6b session 1, builder deviation note.

`trade.pdf` p.1 shows the right-panel Alerts tab with only the form and the hint "Active alerts n/20 · see the panel under the chart". The builder kept the existing Active/Triggered lists under the form and added the hint, because AC-ALERT-01…06 assert those lists in the right panel.

## Ruling
- **Accepted as built.** The right-panel Alerts tab keeps its Active/Triggered lists, plus the n/20 hint. This is a deliberate deviation from `trade.pdf` p.1 (coordination rule 3: simpler fix, no test rewrites, no AC changes). Reviewers must not flag it.
- **Also accepted:** on screens below 640 px the header hides the "Crypto Alert" text and keeps only the logo icon, so the header fits 390 px (mobile is not drawn in the design).
- No doc edits. The builder commits this file on `phase-6b-pages` (`docs: add 6b right-panel decision`).
