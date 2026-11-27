# Phase 6b Review — Pages (nav, bottom panel, /alerts, /notifications, /coin, auth redesign)

Ngày review: 2026-11-28 · Reviewer: Opus 5.5 + High (read-only) · Nhánh `phase-6b-pages` @ `510efe6` (working tree sạch, không đổi nhánh)

## VERDICT: FAIL

Lý do: có 1 lỗi **Major**: test AC-NOTIF-06 chờ 5 giây trong khi SPEC yêu cầu 2 giây (assertion bị nới lỏng). Ngoài lỗi đó, code và test của phase này tốt. Phần sửa rất nhỏ (một con số trong test + một ghi chú trong TRACEABILITY), và tôi đã thử chạy với ngưỡng 2 s: app vẫn đạt.

---

## Những gì tôi đã kiểm tra

| Hạng mục | Kết quả |
|---|---|
| Docs diff | SPEC.md chỉ thêm AC-UI-10, đúng nguyên văn reviews/phase-6b-design.decision.md §2. ARCHITECTURE §11.1, PROGRESS (ACs, mục checklist, "(94)"), TRACEABILITY, frontend/CONTEXT.md đều khớp §3 của decision. API.md / DATABASE.md không đổi. |
| Backend / DB | Không có file nào trong `backend/` hay `prisma/` bị đổi. Không có migration mới, không sửa migration cũ, không `db push`. |
| CI | 3 run mới nhất: `46016230642` trên **510efe6 (HEAD) = success** (đủ các bước secrets:check --all, typecheck, lint, unit, integration, build, e2e). `46015222924` (754ad19) success. `46014011365` (210f1ba) failure ở e2e: đây là lần flaky AC-NOTIF-02 mà builder đã khai và sửa ở 754ad19. |
| `npm run check` trên máy bạn | typecheck FE/e2e OK. typecheck BE: bước `prisma generate` bị môi trường chặn (không cho xóa file, `EPERM unlink`), nên tôi chạy thẳng `tsc -p tsconfig.check.json`: OK. lint OK. Unit FE 123/123, BE 107/107. Integration + e2e không chạy được trên máy bạn vì không có Postgres/Docker. |
| Chạy lại độc lập (clone sạch từ GitHub, Postgres 16, Chrome) | Integration **90/90**. Playwright **92/92 passed** (5.7 phút). |
| Commits (22) | Đều đúng Conventional Commits. Không có `Co-Authored-By`, "Generated with" hay nhắc tới Claude/AI. Mỗi mục checklist có ít nhất một commit. |
| Scripts trong package.json | Phase này không đổi. `dotenv -e ../.env -- …` đúng cú pháp dotenv-cli 11.1.0 (tôi đã xem help trong node_modules). `nest start --watch`, `concurrently`, `tsx`, `prisma migrate dev/deploy` đều hợp lệ. |
| Secrets | `secrets:check --all` xanh trên CI. Không có `.env*` mới. |
| Live app (v0.6.1) | `GET /api/v1/health` → `db: up`, `provider: binance`, `connected: true` (version "0.0.0", đã biết, để Phase 7). `POST /api/v1/test/reset` → **404** `NOT_FOUND`. |
| i18n | vi.json và en.json đều có 296 key, cùng một tập key. Mọi chuỗi mới đều có bản dịch. Không thấy chuỗi tiếng Anh viết cứng trong component mới. |
| Token | Không có mã màu hex hay rgb thô trong component mới. Hai `style={{…}}` duy nhất là biến CSS chiều cao và vị trí tooltip (không phải màu). |
| Light theme + 390×844 | Tôi chạy app với mock provider, chụp ảnh dark/light ở 1440×900 và đo tràn ngang ở 390×844: `/alerts`, `/notifications`, `/coin/BTCUSDT`, `/login`, `/register` đều có `scrollWidth − clientWidth = 0` (cả trang lẫn `<main>`). Light theme hiển thị đúng (biểu đồ area, badge, hàng chưa đọc). |
| So với PDF thiết kế | Bố cục khớp `coin-overview.pdf`, `alerts.pdf` p.1–2, `notifications.pdf` p.1, `auth.pdf` p.3–4 và khung dưới biểu đồ của `trade.pdf`. Các chi tiết bắt buộc trong §1 đều đúng: "Khoảng cách %" màu trung tính (`text-text-muted`), badge Active = `bg-accent/15 text-accent`, Triggered = `bg-surface-3 text-text-muted`, hàng chưa đọc = `bg-accent/7` + chấm accent + chữ đậm, link "Xem biểu đồ →", ô được chọn = `bg-surface-3 border-accent`, nav header active = đậm + màu chữ. Hai chỗ lệch nhỏ ở mục 4–5 bên dưới. |

### Từng AC của Phase 6b

| AC | Test | Đánh giá |
|---|---|---|
| AC-UI-09 | nav.spec.ts | Tốt: href theo last symbol, `aria-current`, symbol lạ không được nhớ, giữ sau reload, guest → /login và quay lại sau login, menu button dưới 1024 px. Thiếu bước guest bấm "Thông báo" (Minor #6). |
| AC-UI-10 | ui.spec.ts | Đủ mọi con số của AC: 2 cột bằng nhau dưới header, nội dung ≤ 520 px canh giữa, form 440 ±1, canh giữa ngang ±2 / dọc ±40, title 28 px, input 46, nút 48 = bề rộng form, 390: ẩn panel, lề 16, không cuộn ngang. Việc đổi sang `expect.poll` giữ nguyên ngưỡng `≤ 0`. Các test AC-AUTH không bị đổi. |
| AC-ALERT-11 | alerts-panel.spec.ts | Rất đầy đủ: cột, "Chỉ cặp hiện tại" trên cả 3 tab, bấm thông báo → đã đọc, tạo alert → hiện trong ≤ 2 s, trigger → Triggered trong ≤ 2 s, kéo/phím/double-click, min 120, max 60 % cột giữa (`panel-chart` là cả cột giữa), thu gọn, reload, ẩn ở 390. |
| AC-ALERT-12 | alerts-page.spec.ts | Đủ: guest redirect, cột, badge, bộ đếm, filter, search, dialog (FAKEUSDT, điều kiện đã thỏa, target rỗng, tạo hợp lệ), xóa active và triggered, link symbol, empty state. |
| AC-NOTIF-06 | notifications-page.spec.ts | Kiểm tra `limit=100` trên **mọi** request list và thứ tự mới nhất trước (phần tử đầu = id mới nhất từ API, `data-created` không tăng). **Nhưng ngưỡng 2 s bị nới thành 5 s → Major #1.** |
| AC-COIN-01 | coin.spec.ts | Tốt (giá, %, màu, tick ≤ 2 s, sao, mở chart, link ngược từ trade, chữ thường, FAKEUSDT). Thiếu kiểm tra giá trị thay đổi tuyệt đối (Minor #7). |
| AC-COIN-02 | coin.spec.ts | Kiểm tra **từng** range: request đúng `interval`/`limit` (YTD = số ngày từ 1/1 theo timezone của guest, tối thiểu 1, tính độc lập với helper của app), `data-candle-count`, `data-direction`, close đầu/cuối so với klines lấy từ API, màu series = token up/down, logo attribution, tooltip time + price của nến đang hover. Code: `chartQuery` trả đúng bảng của AC, query `fresh` (staleTime 0) nên mỗi lần chọn range đều gọi server. |
| AC-COIN-03 | coin.spec.ts | Cả 7 ô so với `(last − first)/first` tính độc lập từ klines của API. 3M/6M/YTD được cắt từ 1d×365: endpoint trả N nến mới nhất nên `slice(-N)` của 365 nến **bằng đúng** 1d×N mà chart gọi. Test kiểm tra điều này, và unit test `tileChange` cũng có. Bấm ô → đổi range và request đúng. |
| AC-COIN-04 | coin.spec.ts | 7 dòng thống kê so với ticker và nến ngày từ API, guest xem được, desktop 2 cột cạnh nhau, 390 một cột, không cuộn ngang. |

Các test cũ bị sửa: AC-NOTIF-02 và AC-NOTIF-03 chỉ thêm `await expect(chart-root).toHaveAttribute('data-live','BTCUSDT:1h')` trước khi đẩy tick, không assertion nào bị nới. AC-UI-09/layout và AC-AUTH không bị đổi.

### Các thay đổi lệch kế hoạch mà builder đã khai (log PROGRESS)
1. Tab Alerts ở khung phải giữ danh sách + gợi ý n/20: đã được chấp nhận trong phase-6b-right-panel.decision.md, không tính là lỗi.
2. Ẩn chữ "Crypto Alert" dưới 640 px: đã được chấp nhận trong cùng decision.
3. Chờ `data-live` trong AC-NOTIF-02/03: hợp lệ. Lỗi flaky là do socket được tạo lại khi login, không phải do app.
4. Các ô hiệu suất dùng chung base query 5m×288 / 1h×168 / 4h×180 / 1d×365 rồi cắt cho 3M/6M/YTD: hợp lệ, giá trị đúng bằng công thức (xem AC-COIN-03 ở trên).
5. Token mới `text-auth-title/headline`, `input-lg`, `button-lg`, `auth-form`, `auth-content`: hợp lệ (dùng token, không viết cứng giá trị).
6. Sửa tràn ngang `/alerts` ở 390 (wrapper `relative`): hợp lệ, tôi đã đo lại = 0.
7. AC-UI-10 dùng poll cho kiểm tra tràn ngang: ngưỡng không đổi, hợp lệ.

Lệch kế hoạch **không được khai**: ngưỡng 5 s trong AC-NOTIF-06 (Major #1), và key query `['klines', symbol, interval, limit]` khác danh sách key "exact" trong frontend/CONTEXT.md (Minor #8).

---

## Issues

### 1. MAJOR · `e2e/tests/notifications-page.spec.ts` dòng 49 (+ `docs/TRACEABILITY.md` dòng 100)
**Vấn đề:** SPEC AC-NOTIF-06 ghi "a new notification (mock trigger) appears at the top **within 2 s**", và comment ngay trên dòng này cũng ghi "within 2 s". Nhưng code là `const deadline = Date.now() + 5000;`. Ghi chú trong TRACEABILITY cũng ghi "≤ 5 s". Đây là nới lỏng ngưỡng, trái với CLAUDE.md ("longer timeouts without cause"). Builder không khai điều này trong log. (So sánh: AC-ALERT-11 trong cùng phase dùng đúng `Date.now() + 2000`.)
**Nói đơn giản:** Test đang cho phép thông báo mới hiện chậm tới 5 giây, trong khi yêu cầu là 2 giây. Nếu sau này app chậm đi, test vẫn xanh và sẽ không ai phát hiện.
**Cách sửa chính xác:**
- `e2e/tests/notifications-page.spec.ts` dòng 49: đổi `const deadline = Date.now() + 5000;` thành `const deadline = Date.now() + 2000;` (giữ nguyên mọi dòng khác).
- `docs/TRACEABILITY.md` dòng 100 (AC-NOTIF-06): trong cột Notes, đổi `mock trigger → new row on top ≤ 5 s` thành `mock trigger → new row on top ≤ 2 s`.
- Chạy `npm run test:e2e -- -g "AC-NOTIF-06"`, rồi chạy full check. Ghi log line.
(Tôi đã chạy thử bản sao test với ngưỡng 2000 ms trên một bản clone riêng, `--repeat-each 3`: **3/3 pass**, nên app đã đạt yêu cầu. Chỉ cần sửa test.)

### 2. MINOR · `docs/TRACEABILITY.md` dòng 7 (Summary) và dòng 96
**Vấn đề:** Dòng Summary vẫn là của session 1: `94 ACs · passing 85 · failing 0 · pending 9 · last CI run: green on phase-6a-ui-redesign (…45692278705)`. Bảng thật sự có 92 passing và 2 pending (AC-I18N-02, AC-OPS-02, đều thuộc Phase 7). Ghi chú AC-UI-09 (dòng 96) vẫn còn câu "placeholder pages until items 3/4".
**Nói đơn giản:** Dòng tóm tắt mà bạn đọc đang ghi sai số AC đã đạt.
**Cách sửa:** Dòng 7 → `**Summary:** 94 ACs · passing 92 · failing 0 · pending 2 · last CI run: green on phase-6b-pages (2026-11-27, run 46016230642)` (hoặc số run mới nhất sau khi sửa #1). Dòng 96: xóa đoạn `/alerts and /notifications are placeholder pages until items 3/4 (/alerts and /notifications done); `.

### 3. MINOR · `docs/PROGRESS.md` dòng 19 (bảng Status)
**Vấn đề:** Hàng 6b vẫn ghi `not started`, dù phase đã xong và đang chờ review. Ở Phase 6a, builder đã ghi `in progress` rồi `built, awaiting review`.
**Nói đơn giản:** Bảng Status là chỗ duy nhất bạn đọc, nhưng nó đang báo Phase 6b chưa bắt đầu.
**Cách sửa:** Đổi cột State của hàng 6b thành `built, awaiting review`.

### 4. MINOR · `frontend/src/features/coin/CoinPage.tsx` dòng 88 (các nút chọn range)
**Vấn đề:** Chi tiết bắt buộc trong decision §1 là "range chips like the timeframe chips of the trade page". Nút trên trang trade (`TimeframeBar.tsx` dòng 22) là `h-7 rounded-chip px-2 font-mono text-row font-medium` (11 px, chữ mono). Nút trên trang coin là `h-8 rounded-input px-3 text-section` (13 px, chữ sans), nên to hơn và khác font so với PDF.
**Nói đơn giản:** Các nút 1D/1W/… trên trang Tổng quan to hơn và khác kiểu so với các nút khung giờ trên trang Biểu đồ, trong khi thiết kế yêu cầu giống nhau.
**Cách sửa:** Đổi className thành ``h-7 rounded-chip px-2 font-mono text-row font-medium ${range === r ? 'bg-surface-3 text-text' : 'text-text-muted hover:bg-surface-2'}`` (giống hệt TimeframeBar).

### 5. MINOR · `frontend/src/features/coin/CoinHeader.tsx` dòng 45
**Vấn đề:** Giá lớn dùng `text-5xl` (một cỡ chữ mặc định của Tailwind, không phải token của dự án) và được tô xanh/đỏ (`${cls}`). Trong `coin-overview.pdf`, giá lớn màu chữ thường (trắng), chỉ phần thay đổi 24h mới có màu. Tô màu theo hướng giá không vi phạm luật màu, nhưng lệch thiết kế.
**Nói đơn giản:** Con số giá to bị tô xanh/đỏ, còn thiết kế để màu trắng, và cỡ chữ không lấy từ bộ token.
**Cách sửa:** Thêm token `--text-coin-price: 48px;` vào `frontend/src/shared/theme/tokens.css` (cạnh `--text-auth-headline`). Đổi className thành `font-mono text-coin-price font-semibold leading-none text-text` (bỏ `${cls}`). Test AC-COIN-01 không phụ thuộc màu của `coin-price` (màu được kiểm tra trên `coin-change`) nên vẫn pass.

### 6. MINOR · `e2e/tests/nav.spec.ts` dòng 41–43
**Vấn đề:** AC-UI-09 ghi "Guests clicking **Alerts/Notifications** go to `/login` with return-to". Test chỉ bấm "Cảnh báo" khi là guest. "Thông báo" chỉ được kiểm tra gián tiếp bằng `page.goto('/notifications')` trong AC-NOTIF-06, không phải bằng cách bấm link nav.
**Nói đơn giản:** Chưa có test nào kiểm tra việc khách bấm "Thông báo" trên header sẽ được chuyển sang trang đăng nhập.
**Cách sửa:** Ngay trước dòng 43 (`await page.getByTestId('nav-alerts').click();`), thêm:
```ts
await page.getByTestId('nav-notifications').click();
await expect(page).toHaveURL(/\/login$/);
await page.goBack();
await expect(page.getByTestId('nav-alerts')).toBeVisible();
```

### 7. MINOR · `e2e/tests/coin.spec.ts` dòng 72
**Vấn đề:** AC-COIN-01 yêu cầu "24h change (**absolute** and %, colored)". Test chỉ kiểm tra phần % (`coin-change`), không kiểm tra `coin-change-abs`.
**Nói đơn giản:** Con số thay đổi tuyệt đối (ví dụ +1.110,24) chưa được test kiểm tra.
**Cách sửa:** Thêm helper `const signed = (v: number, d = 2) => \`${v > 0 ? '+' : v < 0 ? '−' : ''}${viPrice(Math.abs(v), d)}\`;` (giống `chart.spec.ts` dòng 149). Sau dòng 72 thêm: `await expect(page.getByTestId('coin-change-abs')).toHaveText(signed(ticker.lastPrice - ticker.openPrice, precision));`.

### 8. MINOR · `frontend/src/features/coin/useCoinData.ts` dòng 16 ↔ `frontend/CONTEXT.md` dòng 9
**Vấn đề:** CONTEXT.md ghi "Query keys (exact): … `['klines', symbol, interval]`". Trang coin dùng `['klines', symbol, interval, limit]`. Lệch này chỉ được ghi trong comment code, không có trong CONTEXT.md hay log. Hiện tại không gây lỗi: `setQueryData` của chart dùng key chính xác, còn `invalidateQueries(['klines'])` khi reconnect cũng làm mới cả trang coin, đây là điều mong muốn.
**Nói đơn giản:** Tài liệu quy ước đang nói một kiểu, code làm kiểu khác. Không hỏng gì, nhưng tài liệu nên được cập nhật cho khớp.
**Cách sửa:** Trong `frontend/CONTEXT.md` dòng 9, sau `['klines', symbol, interval]` thêm `, coin page: ['klines', symbol, interval, limit]`, và nhắc thay đổi này trong log line.

---

## Tóm tắt cho chủ dự án
- Kết luận: **FAIL**, nhưng chỉ vì **một** lỗi Major nhỏ: test của trang Thông báo cho phép thông báo mới hiện chậm 5 giây, trong khi yêu cầu là 2 giây. Tôi đã thử với 2 giây và app vẫn đạt, nên chỉ cần sửa một con số trong test và một ghi chú.
- Các trang mới (Tổng quan coin, Cảnh báo, Thông báo, khung dưới biểu đồ, trang đăng nhập/đăng ký hai cột) chạy đúng. Tôi đã tự chạy lại toàn bộ 92 test trên một bản sao sạch và tất cả đều xanh. CI trên commit mới nhất cũng xanh.
- Giao diện khớp file thiết kế, có giao diện sáng, và không bị cuộn ngang trên điện thoại (390 px). Có vài chỗ lệch nhỏ (nút chọn khung thời gian, màu số giá lớn) và vài dòng tài liệu chưa cập nhật (bảng Status vẫn ghi "not started", số AC đạt trong TRACEABILITY sai).
- Không có lỗi bảo mật, không đụng tới database hay API, không có commit nào nhắc tới AI. App đang chạy (v0.6.1) vẫn khỏe và endpoint test đã tắt.
