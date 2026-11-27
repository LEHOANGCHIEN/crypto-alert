# Decision — Phase 6b design source + auth pages redesign (owner request)

Date: 2026-11-26 · Decided by: project coordinator (on behalf of the owner) · Source: owner-approved Figma design (design-first for 6b) and owner feedback on /login and /register after v0.6.1.

This is a **direct request of the project owner** (coordination rule 5). It adds to reviews/ui-polish.decision.md; where they differ, this file wins for Phase 6b.

## 1. Design source (approved by the owner on 2026-11-26)
- Figma file "Crypto Alert — UI Design": https://www.figma.com/design/7ypeXrPjWpbZRA1by7zOM8 (owner's account; the builder does not need Figma access).
- Offline copy for the builder and reviewer: PDF exports in **`docs/design/`** (one file per Figma page, 1440 px wide). Open them and match the pages below. If a file is missing, stop and ask the owner.

| PDF file · page | Figma frame | Route / AC |
|---|---|---|
| `auth.pdf` p.3 (login) and p.4 (register) | Auth → "Login — B (đã chọn)", "Register — B (đã chọn)" | `/login`, `/register` · AC-UI-10 (new) |
| `coin-overview.pdf` p.1 | Coin overview → "Coin overview — BTCUSDT" | `/coin/:symbol` · AC-COIN-01…04 |
| `alerts.pdf` p.1 (page), p.2 (dialog) | Alerts → "Alerts page", "Dialog — Cảnh báo mới" | `/alerts` · AC-ALERT-12 |
| `notifications.pdf` p.1 (page), p.2 (bell dropdown) | Notifications → "Notifications page", "Bell dropdown" | `/notifications` · AC-NOTIF-06 |
| `trade.pdf` p.1 | Trade → "Trade page — BTCUSDT (6b)" | header nav AC-UI-09, bottom panel AC-ALERT-11 |
| — (Figma only) | Foundations | tokens = ARCHITECTURE §11.2; shared logo, button, input, header, status bar |

`cover.pdf` is only the file cover. **`auth.pdf` p.1–2** are the rejected option A ("không chọn") — ignore them.

Rules for matching: layout, spacing, sizes, typography and colors from the frames (tokens only, no raw hex in components). Chart drawings in the frames are illustrations — real charts stay Lightweight Charts with the attribution logo. Numbers and texts are samples; real texts go through i18n (vi + en). Mobile (< 1024 px) is not drawn: follow existing mobile patterns, single column, no horizontal scroll. Light theme follows the tokens (Foundations has Dark/Light modes).

Details taken from the design (binding):
- Header for logged-in users: logo · nav "Biểu đồ / Tổng quan / Cảnh báo / Thông báo" (active = text color + semibold, others muted) · language · theme · bell · avatar (initial of displayName, opens the existing user menu). Guests: logo · language · theme · Đăng nhập · Đăng ký (nav links Cảnh báo/Thông báo for guests follow AC-UI-09: shown, redirect to /login).
- Alerts table "Distance %" column uses neutral text (not green/red — it is not price direction). Status badge "Active" = accent text on accent 15 % background; "Triggered" = muted text on surface-3.
- Notifications: unread row = accent 7 % background + accent dot + semibold title; each row has a "Xem biểu đồ →" link to `/trade/<SYMBOL>`.
- Coin overview: selected performance tile = surface-3 background + accent border; range chips like the timeframe chips of the trade page; "Mở biểu đồ đầy đủ ↗" secondary button top right.
- Trade page right panel (Alerts tab) shows "Active alerts n/20 · see the panel under the chart" under the form.

## 2. Auth pages redesign — new AC
Add to SPEC F11:

| ID | Steps → expected result |
|---|---|
| AC-UI-10 | Viewport 1440×900: `/login` and `/register` show two columns of equal width under the header — left a brand panel (translated headline, three translated feature lines, decorative line; content in a column ≤ 520 px centered in the panel), right the form centered both horizontally and vertically (vertical center of the form within ±40 px of the vertical center of the right column). Form width 440 px; title 28 px; inputs 46 px high; primary button 48 px high and full form width. Viewport 390×844: brand panel hidden, form full width with 16 px side margins, no horizontal scroll. All existing AC-AUTH tests still pass unchanged. |

## 3. Allowed doc edits (first commit of Phase 6b)
- docs/SPEC.md: add AC-UI-10 (text above) to F11. Nothing else.
- docs/ARCHITECTURE.md §11.1: `/login`, `/register` row → "Two columns: brand panel + centered form 440 px (AC-UI-10); mobile: form only, 16 px margin". Rows for `/coin/:symbol`, `/alerts`, `/notifications` and the trade bottom panel: add "see the PDFs in docs/design/ (reviews/phase-6b-design.decision.md §1)".
- docs/PROGRESS.md: Phase 6b ACs add AC-UI-10; checklist add item "- [ ] Auth pages redesign (AC-UI-10)" before the Playwright item; Phase 7 "All ACs passing (93)" → "(94)".
- docs/TRACEABILITY.md: add AC-UI-10 (pending, phase 6b); total 94.
- frontend/CONTEXT.md: new testids.
