# Phase 7a review — `phase-7a-foundation`

Ngày: 2026-11-28 · Reviewer: Opus 5.5 + High (read-only) · HEAD nhánh: `35b593d` · So với `main`: 11 commit, 124 file.

## VERDICT: FAIL

Lý do: 2 lỗi Major (xem #1, #2). Phần còn lại của phase làm tốt: doc edits đúng decision §3, route/redirect, shell, search, home, static pages, token đen và test contrast đều đạt.

## Đã kiểm tra

| Mục | Kết quả |
|---|---|
| Working tree | sạch, đúng nhánh `phase-7a-foundation`, trùng `origin` |
| CI | run `46124302020` trên `35b593d` (commit mới nhất) = **success**; có đủ bước secrets, typecheck, lint, unit, integration, build, e2e (kiểm qua GitHub REST API công khai) |
| `npm run check` tại máy review | typecheck FE + e2e OK; typecheck BE OK khi chạy `tsc -p tsconfig.check.json` trực tiếp (bước `prisma generate` bị chặn vì node_modules chỉ-đọc trong môi trường review); lint OK; unit BE 107/107, FE 135/135 OK. **Integration và Playwright không chạy được** (không có PostgreSQL và trình duyệt Playwright) → dựa vào CI |
| Doc diff | SPEC.md khớp đúng từng câu §3.1 (C4, §1, §2, §3, đổi `/trade`→`/chart`, AC-AUTH-01/04, AC-UI-01/03/09, AC-SITE-01…05, §6, §7). CLAUDE.md khớp §3.2. ARCHITECTURE khớp §3.3. TRACEABILITY khớp §3.6. Design v1/v2 + 3 file decision đổi đường dẫn đúng §1. API.md, DATABASE.md, backend/ **không đổi** |
| AC ↔ test | 97 test Playwright, mỗi AC đúng 1 test, tên/file khớp TRACEABILITY 100 % (đối chiếu tự động); không có `.skip/.only/.fixme`; 2 AC pending (I18N-02, OPS-02) thuộc Phase 8 |
| Assertion bị xóa/sửa trong e2e | chỉ là đổi `/trade`→`/chart`, đích login → `/`, di chuyển file, cập nhật màu nền đen, và viết lại AC-UI-01/03/09 theo text mới. Không thấy assertion nào bị bỏ mà không có thay thế (xem #4 về một chỗ yếu hơn) |
| Commit | Conventional Commits; không có `Co-Authored-By`, "Generated with", hay nhắc Claude/AI; tác giả là owner |
| Secrets | `secrets:check --all` OK (411 file); không file `.env` mới |
| Live app (v0.6.2) | `GET /api/v1/health` → `status ok`, `db up`, `provider binance`, `connected true` (version `0.0.0` — đã biết, hoãn tới Phase 8). `POST /api/v1/test/reset` → **404** `NOT_FOUND` ✅ |
| Redirect | `/trade/:symbol` giữ `location.search` và viết hoa; `/chart/ethusdt` → `/chart/ETHUSDT`; không còn link `/trade` nào trong frontend/backend/e2e (trừ redirect và test AC-SITE-04) |
| i18n | vi.json/en.json cùng bộ khóa (đếm tự động); trang tĩnh có đủ vi + en, nội dung đúng sự thật dự án (cookie `refresh_token` Path `/api/v1/auth` 7 ngày khớp API.md) |
| AC-SITE-02 | test có Ctrl+K, nút header, focus trả về trigger khi Esc, ↑/↓ (có vòng), Enter cho pair và page, recents trong `crypto-alert.recent-symbols`, empty state vi/en; giới hạn 5 recents có unit test |
| AC-SITE-03 | `/status` so với chính response `/health` của trang; làm mới 30 s kiểm bằng `page.clock` (29 s chưa gọi, 31 s gọi lại) — không dùng sleep ✅ |
| AC-SITE-05 | đọc CSS variable đã tính, 3 màu chữ × 3 nền, cả dark và light, ngưỡng 4,5:1; nền body = `rgb(0,0,0)` ✅ |
| AC-UI-03 | test thu mọi `<a>` trong footer: link ngoài phải `_blank` + `rel="noopener noreferrer"`, link trong được mở thật và không ra 404 ✅ |
| Giao diện vs mockup | 7a chưa deploy và không chạy được ở máy review, nên tôi so **code** với `01-home.png` / `04-chart.png`: hero (tiêu đề 56 px/800, ô tìm kiếm bo tròn, nút "Mở siêu biểu đồ"), thẻ Tóm tắt thị trường (avatar, tên, cặp, giá, %, sparkline), Biến động với pill tabs (active = tô đặc), card bo 16 px viền 1 px không bóng, footer nhiều cột, token đen — khớp. Không thấy phần của phase sau (không CoinGecko, news, ideas, AI, markets). Menu và footer chỉ liệt kê trang có thật. Không có dữ liệu mẫu trên trang thật |

## Issues

### 1. MAJOR — Kiểm tra "không cuộn ngang ở 390×844" trên trang site không thể fail
- **File:** `frontend/src/app/shells/site/SiteShell.tsx:17` (div `site-shell` có `h-full … overflow-auto`) cùng với `e2e/tests/site/home.spec.ts:119`, `e2e/tests/site/static.spec.ts:71`, `e2e/tests/site/nav.spec.ts:123`.
- **Vấn đề:** `html/body/#root` cao 100 %, và cả trang site nằm trong `site-shell` có `overflow-auto` (cả hai chiều). Mọi phần tử tràn ngang sẽ cuộn **bên trong** div này, nên `document.documentElement.scrollWidth` luôn bằng `window.innerWidth`. Ba test mới chỉ đo `documentElement`, nên luôn đạt dù trang tràn ngang. Header site (logo, tìm kiếm, nút menu, ngôn ngữ, theme, Đăng nhập/Đăng ký) và footer 2 cột ở 390 px hiện **không được kiểm tra thật** ở đâu cả (test coin đo thêm `main`, nhưng header/footer nằm ngoài `main`). Decision §6 yêu cầu mở rộng test overflow sang `/` và trang tĩnh — phần mở rộng này hiện vô hiệu.
- **Sửa:** trong 3 test trên, đo thêm (hoặc thay bằng) phần tử cuộn thật: `site-shell.scrollWidth - site-shell.clientWidth ≤ 0` (hoặc dùng `overflow-y-auto overflow-x-hidden`… nhưng như vậy sẽ che lỗi, nên ưu tiên đo đúng phần tử); chạy lại ở 390×844 cho `/`, 9 trang tĩnh, và trang có header khách (Đăng nhập/Đăng ký); sửa layout nếu test mới đỏ.
- **Nói đơn giản:** Bài kiểm tra "trên điện thoại không bị kéo ngang" đang đo nhầm chỗ nên lúc nào cũng xanh. Cần đo đúng khung cuộn của trang để biết thật sự có lỗi hay không.

### 2. MAJOR — Trang biểu đồ trên màn hình < 1024 px không hiện câu miễn trừ trách nhiệm
- **File:** `frontend/src/app/shells/chart/StatusBar.tsx:36` (`hidden … lg:flex`), `ChartShell.tsx` không có footer; SPEC §6 Compliance ("disclaimer … status bar on the chart page"), AC-UI-03.
- **Vấn đề:** Ở v0.6.2 footer (có disclaimer) hiện trên mọi trang kể cả dashboard mobile. Ở 7a trang `/chart/*` bỏ footer và chỉ đặt disclaimer trong status bar, nhưng status bar bị ẩn dưới 1024 px → ở 390×844 trang biểu đồ **không còn disclaimer** ở đâu. Test AC-UI-03/AC-UI-08 chỉ kiểm ở desktop nên không phát hiện.
- **Sửa:** hiển thị `statusbar-disclaimer` (hoặc một dòng disclaimer gọn) trên trang chart ở < 1024 px (ví dụ dòng nhỏ phía trên thanh tab dưới), và thêm vào test AC-UI-03 một bước ở 390×844: `/chart/BTCUSDT` có disclaimer hiển thị và vẫn không cuộn ngang (AC-UI-02).
- **Nói đơn giản:** Trên điện thoại, trang biểu đồ mất dòng "Thông tin chỉ mang tính tham khảo…", trong khi SPEC bắt buộc phải có. Cần cho dòng này hiện cả trên điện thoại.

### 3. Minor — Giá trị hiển thị không qua token
- **File:** `frontend/src/app/pages/HomePage.tsx:12` và `app/shells/site/SiteFooter.tsx:50` (`max-w-[1280px]`), `SiteFooter.tsx:50` (`grid-cols-[1.4fr_2.6fr]`), `shared/search/SearchDialog.tsx:117` (`max-h-[70vh]`), `features/home/Hero.tsx:11` và `features/static/StaticPage.tsx:13` (`text-4xl`, cỡ chữ mặc định của Tailwind, không phải token).
- **Vấn đề:** CLAUDE.md hard rule 6 và frontend/CONTEXT.md §Styling ("no arbitrary values") — trên `main` không có giá trị kiểu này.
- **Sửa:** thêm token (ví dụ `--container-site: 1280px`, cỡ chữ tiêu đề trang tĩnh/hero mobile) vào `tokens.css` + ARCHITECTURE §11.3 và dùng utility tương ứng.
- **Nói đơn giản:** Vài kích thước được gõ thẳng số thay vì lấy từ bảng token chung, trái quy tắc của dự án; sửa nhỏ, không ảnh hưởng chức năng.

### 4. Minor — Test AC-UI-01 kiểm "status bar ở đáy" quá lỏng
- **File:** `e2e/tests/chart/layout.spec.ts:107` (`status.y + status.height ≤ 901`).
- **Vấn đề:** Điều kiện này đúng với mọi vị trí trong cửa sổ, không chứng minh status bar nằm ở đáy (AC-UI-01: "status bar at the bottom"). Assertion cũ (so với footer) không còn ý nghĩa, nhưng bản thay thế yếu hơn.
- **Sửa:** `expect(Math.round(status.y + status.height)).toBe(900)` (hoặc `≥ 899`). Dòng trên còn thụt lề sai (8 dấu cách).
- **Nói đơn giản:** Bài test chỉ kiểm "thanh trạng thái nằm đâu đó trong màn hình", nên kiểm chặt là nó nằm sát đáy.

### 5. Minor — Vài phần của AC chưa được test kiểm
- `e2e/tests/site/home.spec.ts:42`: AC-SITE-01 yêu cầu thẻ có **avatar**; code có `CoinAvatar` nhưng test không kiểm (comment còn ghi "avatar-less"). Sửa: kiểm avatar hiển thị trong mỗi `summary-card-*`.
- `e2e/tests/site/nav.spec.ts`: AC-UI-09 nêu header site có **bell (khi đăng nhập)** và avatar menu; test chỉ kiểm trạng thái khách. Sửa: sau khi đăng nhập ở bước return-to, kiểm `site-header` chứa `bell` và `user-menu`.
- **Nói đơn giản:** Hai chi tiết nhỏ (biểu tượng coin, chuông thông báo trên header trang web) có làm nhưng chưa có bài test chứng minh.

### 6. Minor — Một số sửa đổi tài liệu nằm ngoài decision §3
- `docs/PROMPTS.md:48–49`: đổi bảng SETTINGS ở section b (§3.7 chỉ cho thêm ví dụ tên nhánh). Nội dung hợp lý (khớp CLAUDE.md §3.2.3) nhưng không được liệt kê.
- `docs/PROMPTS.md:125`: đổi câu tag ("For Phase 8 also … v1.0 (and v0.8)") — không có trong §3.7. Ngoài ra bước này vẫn ghi tag `v0.<N>`, trong khi decision §2 quy định 7a → `v0.7.1` (với N=7a sẽ ra `v0.7a`).
- `docs/PROGRESS.md:303`: dòng Phase 8 bị bỏ mất ý "smoke-check each feature on the live URL" khi thay câu theo §3.4.
- Không phải SPEC và không làm AC dễ hơn → Minor. Sửa: coordinator chấp nhận hoặc bảo khôi phục; thêm lại "smoke-check each feature on the live URL" vào dòng Phase 8; ghi rõ tag cho 7a–7f trong Merge Prompt.
- **Nói đơn giản:** Builder sửa thêm vài câu trong tài liệu hướng dẫn mà decision không cho phép; không hại, nhưng cần bạn/coordinator duyệt, và một ý kiểm tra live ở Phase 8 bị mất.

### 7. Minor — ARCHITECTURE không khớp code
- `docs/ARCHITECTURE.md:324` §11.3 "Fixed heights: header 56" — code: chart header 48 (`--spacing-header`), site header 64.
- `docs/ARCHITECTURE.md:46,188`: SearchDialog ghi trong `app/shells/site/`, code ở `shared/search/` (dùng chung cho cả hai shell). `:190` ghi `pages/` ở gốc `src/`, code ở `app/pages/` (frontend/CONTEXT.md ghi đúng). `:200` liệt kê `Dialog` trong `shared/ui` nhưng không có file này.
- Test AC-UI-03 (footer site) nằm ở `e2e/tests/chart/layout.spec.ts`, trong khi §3.5 xếp footer vào `site/`.
- **Sửa:** cập nhật ARCHITECTURE §7/§11.3 theo code (được phép vì là đồng bộ mô tả, ghi vào log PROGRESS) và chuyển test AC-UI-03 sang `site/` (cập nhật TRACEABILITY).
- **Nói đơn giản:** Bản thiết kế kiến trúc mô tả hơi khác so với code thật; cần chỉnh cho khớp để các phase sau không bị nhầm.

### 8. Minor — SPEC AC-UI-08 còn câu mâu thuẫn (cần coordinator quyết)
- `docs/SPEC.md:230`: AC-UI-08 "A status bar **above the footer**…", nhưng AC-UI-01/AC-UI-03 (đã sửa) nói trang chart **không có footer**. Builder không được sửa SPEC nên không phải lỗi của builder.
- **Sửa:** coordinator cho phép đổi thành "A status bar at the bottom of the chart page…".
- **Nói đơn giản:** Một câu cũ trong SPEC vẫn nhắc "footer" ở trang biểu đồ, giờ không còn đúng; cần một quyết định nhỏ để sửa.

### 9. Minor — Test chập chờn AC-ALERT-12 đã khai báo nhưng chưa xử lý
- `docs/PROGRESS.md:265` (log 7a): "One flaky AC-ALERT-12 click on a full run (element re-rendered)". TRACEABILITY vẫn ghi `passing`, trong khi chính đầu file TRACEABILITY quy định `flaky` phải sửa trước review.
- CI xanh và chạy lại đều đạt nên chỉ Minor. Sửa: tìm nguyên nhân (thường là click vào phần tử bị render lại — chờ phần tử ổn định/hết loading trước khi click), không tăng timeout hay thêm retry.
- **Nói đơn giản:** Có một bài test thỉnh thoảng đỏ rồi tự xanh; nên sửa tận gốc để CI không đỏ bất ngờ lúc merge.

## Đánh giá các deviation trong log PROGRESS
- **Chart header token 48 px** (trong khoảng 44–56 px của AC-UI-01; test kiểm khoảng này): chấp nhận; chỉ cần cập nhật ARCHITECTURE (#7).
- **`coin-names` chuyển sang `shared/market`**: chấp nhận (dùng chung cho search, home, chart; không đổi nội dung, unit test đi theo).
- **Helper `loginToChart`/`registerToChart`, `openProductsMenu`**: chấp nhận — vẫn kiểm `user-menu` hiển thị sau khi vào chart; AC-AUTH-01/04 kiểm đích `/` riêng.
- **AC-NOTIF-06 chờ `site-shell[data-connected]` thay cho text status bar**: chấp nhận — cả hai cùng lấy từ `connection.store.connected`; trang site không còn status bar.
- **Màu trong test theme đổi sang bảng đen**: đúng decision §3.3.5.
- **AC-UI-01/03/09 viết lại**: đúng text AC mới, chặt ít nhất bằng bản cũ (trừ #4).
- **Flaky AC-ALERT-12**: xem #9.
- **Railway autodeploy**: chỉ tài liệu, không chạy `railway up` — đúng §5. Live app trả lời bình thường.

## Tóm tắt cho chủ dự án
1. Phase 7a gần như hoàn chỉnh: trang chủ mới, menu kiểu TradingView, tìm kiếm Ctrl+K, 9 trang tĩnh, `/status`, nền đen, `/trade` tự chuyển sang `/chart`; CI xanh, tài liệu sửa đúng decision.
2. Chưa merge được vì 2 lỗi Major: (a) bài test "điện thoại không bị kéo ngang" trên trang web đang đo nhầm chỗ nên luôn xanh; (b) trên điện thoại, trang biểu đồ mất dòng miễn trừ trách nhiệm mà SPEC bắt buộc.
3. Các lỗi Minor còn lại là chỉnh nhỏ: vài kích thước gõ số trực tiếp, vài bài test kiểm chưa đủ chặt, tài liệu kiến trúc lệch code, một test chập chờn.
4. Bản đang chạy trên Railway (v0.6.2) vẫn khỏe, endpoint test đã bị tắt đúng.
5. Bước tiếp: coordinator viết `reviews/phase-7a-review.decision.md`, builder sửa, rồi chạy Recheck.
