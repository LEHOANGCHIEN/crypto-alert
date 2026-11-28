# Phase 7a recheck — `phase-7a-foundation`

Ngày: 2026-11-28 · Reviewer: Opus 5.5 + High (read-only) · Phạm vi: `git diff 35b593d..de1bae8` (8 commit) · HEAD = `origin/phase-7a-foundation` = `de1bae8`, working tree sạch.

## VERDICT: PASS

Không có Blocker/Major. Mọi mục trong `reviews/phase-7a-review.decision.md` đã làm đúng như quyết định.

## Từng mục

| # | Kết quả |
|---|---|
| 1 | **Đã sửa.** Helper mới `e2e/helpers/overflow.ts` đo cả `documentElement` **và** `site-shell.scrollWidth − site-shell.clientWidth ≤ 0`; dùng ở `home.spec` (`/`), `static.spec` (đủ 9 trang, có `/status`), `nav.spec` (header khách 390×844 có Đăng nhập + Đăng ký, và `/alerts` ở 390). `SiteShell` vẫn `overflow-auto` (không thêm `overflow-x-hidden`), không wrapper nào trong site shell/home/static che tràn ngang → nếu có tràn thật, `site-shell` sẽ cuộn và test sẽ đỏ. |
| 2 | **Đã sửa.** `DashboardLayout.tsx`: dòng `chart-disclaimer-mobile` (`lg:hidden`, `text-meta` 10 px, key dịch `statusBar.disclaimer`) ngay trên tab bar. Test AC-UI-03 có bước 390×844 `/chart/BTCUSDT`: disclaimer hiển thị, đúng chữ, status bar ẩn, không cuộn ngang. |
| 3 | **Đã sửa.** Token mới trong `tokens.css` (`--container-site`, `--text-page-title`, `--spacing-dialog`, …) + utility `grid-cols-footer` trong `index.css`; `HomePage`, `SiteFooter`, `SearchDialog`, `Hero`, `StaticPage` hết giá trị tùy ý; ARCHITECTURE §11.3 cập nhật. (2 giá trị `grid-cols-[…]` còn lại ở MarketList/WatchlistPanel đã có từ trước trên `main`, ngoài phạm vi issue.) |
| 4 | **Đã sửa.** `expect(Math.round(status.y + status.height)).toBe(900)`; thụt lề đã sửa. |
| 5 | **Đã sửa.** AC-SITE-01 kiểm `summary-avatar-<SYMBOL>` trong từng `summary-card-*`; AC-UI-09 sau khi đăng nhập (return-to) kiểm `site-header` có `bell` và `user-menu`. |
| 6 | **Đã sửa.** PROMPTS e bước 5 và bước 7 đúng nguyên văn decision; PROGRESS Phase 8 đã khôi phục "smoke-check each feature on the live URL"; bảng PROMPTS b giữ nguyên (đã được chấp nhận). |
| 7 | **Đã sửa.** ARCHITECTURE §7/§11.3 khớp code (chart header 48, site header 64, `shared/search/`, `app/pages/`, bỏ `Dialog`, thêm `config/`, `SocialLinks`); test AC-UI-03 chuyển sang `e2e/tests/site/footer.spec.ts`, TRACEABILITY đổi đường dẫn. |
| 8 | **Đã sửa.** SPEC AC-UI-08 đúng câu "A status bar at the bottom of the chart page (desktop) shows". SPEC chỉ đổi 2 câu được phép (AC-UI-03 thêm câu social đúng chỗ, đúng nguyên văn; AC-UI-08). |
| 9 | **Đã sửa tận gốc.** `AlertsPage` có `data-fetching`; test chờ `alerts-page[data-fetching="false"]` trước mỗi click lọc/xóa/symbol. Không retry, không tăng timeout, không `force: true`; `playwright.config.ts` không đổi. |
| O1 | **Đã làm.** `frontend/src/shared/config/social.ts`: 7 mục đúng thứ tự, id/label/URL khớp decision từng ký tự. Footer (`footer-social`, `footer-social-<id>`) và `/contact` (`contact-social-<id>`, icon + label) đọc cùng một danh sách; mỗi link `target="_blank"`, `rel="noopener noreferrer"`, aria-label dịch ("<label> của Lê Hoàng Chiến" / "<label> of Lê Hoàng Chiến"), icon 20 px, `text-muted` → `text` khi hover/focus, vùng bấm ≥ 32 px. Icon lấy từ `simple-icons` 16.38.1 (CC0-1.0, chỉ import 6 icon, `sideEffects: false`); LinkedIn không có trong gói (đã kiểm `index.d.ts`) nên dùng icon "link" chung — không có logo vẽ tay. Test AC-UI-03 kiểm đủ 7 URL, target/rel/aria-label (en + vi), cỡ vùng bấm, và 7 link trên `/contact`. Hàng icon đặt ngay dưới dòng môn học (trên dòng nguồn dữ liệu/disclaimer) — chấp nhận được. |
| O2 | **Đã làm.** `Breadcrumb` dùng chung: 15 px / 500 (token `--text-breadcrumb`, `--font-weight-breadcrumb`), mục cha `text-muted` gạch chân khi hover/focus, mục hiện tại `text` + `aria-current="page"`, dấu `›` `aria-hidden`, khoảng cách 20 px (`--spacing-breadcrumb-gap`). Test AC-SITE-03 kiểm `aria-current`, font-size 15 px, weight 500 và dấu `›` trên cả 9 trang. |

## CI và kiểm tra cục bộ
- CI run `46130385773` trên `de1bae8` (commit mới nhất) = **success**, đủ bước secrets, typecheck, lint, unit, integration, build, e2e.
- Tại máy review: typecheck FE + e2e OK, BE OK (`tsc -p tsconfig.check.json`), lint OK, unit FE 135/135, BE 107/107, `vite build` OK. Integration và Playwright không chạy được ở đây (không có PostgreSQL/trình duyệt) → dựa vào CI.

## Commit
8 commit đều theo Conventional Commits, tác giả là owner, không có `Co-Authored-By`, "Generated with" hay nhắc Claude/AI. Không đổi `backend/`, `docs/API.md`, `docs/DATABASE.md`, `.github/`, `playwright.config.ts`; không có thay đổi ngoài phạm vi decision.

## Vấn đề mới (Blocker/Major)
Không có.

## Tóm tắt cho chủ dự án
1. Builder đã sửa đủ 9 lỗi và làm xong 2 yêu cầu của bạn (link mạng xã hội ở footer và trang Liên hệ, breadcrumb to hơn); CI xanh trên commit mới nhất.
2. Bài test "điện thoại không bị kéo ngang" giờ đo đúng khung cuộn, và trang biểu đồ trên điện thoại đã có dòng miễn trừ trách nhiệm.
3. Có thể chạy bước Merge trong decision (tag v0.7.1).
