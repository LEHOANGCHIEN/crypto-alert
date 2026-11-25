# Phase 6 Review — Alerts + notifications (`phase-6-alerts`)

Ngày review: 2026-11-25 · Reviewer: Opus 5.5 + High (chỉ đọc) · HEAD nhánh: `5d991a0` (trùng `origin/phase-6-alerts`, working tree sạch)

VERDICT: **PASS**

Không có lỗi Blocker hay Major. Có 1 lỗi Minor (tài liệu).

---

## Issues

### 1. MINOR · `frontend/CONTEXT.md` dòng 41 ("Testing hooks") · danh sách testid của Phase 6 chưa đủ
- **Vấn đề:** Dòng log trong PROGRESS ghi "frontend/CONTEXT.md testid list" đã được cập nhật. Thực tế danh sách vẫn thiếu các testid mới mà code Phase 6 có và các test Playwright đang dùng: `alert-row-symbol`, `alert-row-condition`, `alert-row-target`, `alert-created-at`, `alert-triggered-price`, `alert-triggered-at` (`AlertList.tsx`), `alerts-loading` (`AlertsPanel.tsx`), `notification-text`, `notification-symbol`, `notification-condition`, `notification-target`, `notification-triggered-price`, `notification-time` (`NotificationsPanel.tsx`). Ở Phase 5, lỗi cùng loại (#6) đã được xử lý là "Fix now".
- **Hậu quả:** Không làm hỏng chức năng hay test nào. Nhưng nếu phiên sau đổi tên các testid này mà không biết test đang dùng chúng thì test sẽ hỏng.
- **Cách sửa:** Thêm đúng các id trên (tên lấy chính xác từ code) vào dòng "Stable `data-testid`" trong `frontend/CONTEXT.md`. Chỉ sửa tài liệu.
- **Giải thích đơn giản:** Danh sách "mã nhận diện" của các nút và ô mà test tự động dùng chưa ghi đủ những mã mới của phần cảnh báo và thông báo. App vẫn chạy đúng; đây chỉ là việc bổ sung ghi chú để sau này không ai sửa nhầm.

---

## Những gì đã kiểm tra (để coordinator đối chiếu)

### Bước 1–2: Tài liệu và diff
- Đã đọc CLAUDE.md, SPEC, ARCHITECTURE (§3.3, §3.4, §5, §8, §9), API, DATABASE, PROGRESS, TRACEABILITY, hai file CONTEXT và các file `reviews/*.decision.md` (gồm `phase-2-ui-01-bell.decision.md` và `phase-5-review.decision.md`).
- `git diff main...phase-6-alerts`: 66 file. **`docs/SPEC.md` không đổi.** `DATABASE.md` và `ARCHITECTURE.md` không đổi. Không có migration mới hoặc migration bị sửa (`backend/prisma` không nằm trong diff). Không có `db push`.
- File AGENTS.md (chưa được track) không có trong working tree. Theo ghi chú, tôi bỏ qua.

### Bước 3: CI và `npm run check`
- CI (GitHub API): run `45639358403` cho commit mới nhất `5d991a0`: **success**. Các bước đều xanh: migrate DB test, secrets:check --all, typecheck, lint, unit, integration, build, Playwright. Run trước đó (`45638142138`, `abc9673`) cũng success. Run `45637355816` bị *cancelled*, do commit mới hơn đẩy lên (concurrency), không phải lỗi.
- Chạy local trong môi trường review:
  - typecheck: frontend và e2e OK; backend `tsc -p tsconfig.check.json` OK. Riêng bước `prisma generate` bị môi trường của tôi chặn (`EPERM unlink` trong `node_modules/.prisma`, máy review không cho xóa file). Đây không phải lỗi của dự án; CI chạy bước này xanh.
  - lint: OK.
  - unit: backend Jest 107/107, frontend Vitest 98/98. Khớp đúng con số trong log.
  - integration và Playwright: **không chạy được** vì máy review không có Postgres (cổng 5432 đóng, không có docker). Tôi dựa vào CI cho phần này (90 integration và 74 Playwright đều xanh trên `5d991a0`).

### Bước 4: Từng AC của Phase 6 (AC-ALERT-01…10, AC-NOTIF-01…05)
- Mỗi ID có đúng 1 test Playwright (cả repo có 74 tiêu đề `test('AC-…`, không trùng ID). Không có `.skip`, `.only` hay `.fixme`.
- Nội dung từng test khớp SPEC:
  - ALERT-01 kiểm tra prefill (symbol, "Above", giá hiện tại), dòng Active hiện symbol, điều kiện, target, giờ tạo.
  - ALERT-02 kiểm tra rỗng, 0, số âm, hơn 8 chữ số thập phân (không có request nào gửi đi), và 422 `ALERT_CONDITION_ALREADY_MET` đã dịch cho cả 4 trường hợp.
  - ALERT-03 và ALERT-04 kiểm tra toast đúng chữ, dòng Triggered, badge +1, tất cả trong 5 s tính từ lúc push. ALERT-03 có thêm bước reload.
  - ALERT-05 ghi lại mọi toast từng hiện, dùng alert "sentinel", và kiểm tra API thấy đúng 1 thông báo.
  - ALERT-06 xóa alert rồi vượt ngưỡng: không có toast, không có thông báo. Alert đã Triggered cũng xóa được.
  - ALERT-07 kiểm tra 409 và lỗi đã dịch.
  - ALERT-08 kiểm tra B không thấy alert của A, B xóa alert của A nhận 404 `ALERT_NOT_FOUND`, B không nhận gì khi alert của A kích hoạt.
  - ALERT-09 kiểm tra reload worker trả về 3, sau đó alert vẫn kích hoạt.
  - ALERT-10 kiểm tra không có stream `dogeusdt@`.
  - NOTIF-01 kiểm tra badge 1, `9+` và ẩn khi về 0.
  - NOTIF-02 kiểm tra thứ tự, chữ, symbol, điều kiện, target, giá kích hoạt, giờ theo múi giờ của user, và dấu hiệu chưa đọc.
  - NOTIF-03 kiểm tra click thì đánh dấu đã đọc, badge −1, mở chart; mark all; trạng thái giữ sau reload.
  - NOTIF-04 kiểm tra đăng xuất, alert kích hoạt, đăng nhập lại thấy toast "Bạn có 2 thông báo chưa đọc", badge 2, danh sách có thông báo mới.
  - NOTIF-05 kiểm tra 2 tab cùng nhận toast trong 5 s; đọc ở tab 1 thì tab 2 cập nhật, mark all ở tab 2 thì tab 1 cập nhật, trong 5 s.
- TRACEABILITY: 15 AC Phase 6 đều `passing`, đúng file và tiêu đề. Tổng 76 / 74 passing / 2 pending (AC-I18N-02 và AC-OPS-02 thuộc Phase 7). Đúng.

### Bước 5: Hợp đồng và quy tắc
- API.md §3.5/§3.6/§4.3: route, field, event (`notification:new`, `notification:read`), mã lỗi đều khớp. Kiểu `Alert`, `Notification` và `NotificationList` khớp §2 (integration test so sánh chính xác các field).
- DATABASE.md: payload `ALERT_TRIGGERED` có cấu trúc, không chứa câu chữ. Xóa alert thì `alert_id` thành NULL, thông báo được giữ (có test). Seed không đổi.
- CLAUDE.md hard rules: chuỗi hiển thị đều qua i18n (vi và en có đủ `notifications.*`, `errors.ALERT_*`, `errors.NOTIFICATION_NOT_FOUND`). Backend chỉ trả mã lỗi (`AppError`). Màu chỉ lấy từ token (`danger` là màu cam, không phải đỏ). Không có secret (`secrets:check --all` OK, 296 file).
- PROGRESS: checklist 9/9 đã tick, có 1 dòng log đúng định dạng.
- Commit: 13 commit đều theo Conventional Commits, tác giả là danh tính của chủ dự án. **Không có** "Co-Authored-By", "Generated with", Claude hay AI trong `git log main..phase-6-alerts --format=%B`.
- Script trong package.json (root và workspace) không đổi ở phase này. `dotenv -e ../.env --` đúng cú pháp của `dotenv-cli` 11.1.0 đã cài (đã xem `--help`). `concurrently`, `nest` và `tsx` đều có.

### Bước 6: App live (vẫn là bản Phase 5)
- `GET /api/v1/health`: `status ok`, `db up`, `provider binance`, `connected true`. `version "0.0.0"` là mục đã hoãn sang Phase 7, không tính là lỗi.
- `POST /api/v1/test/reset`: **tôi chưa gửi được request này.** Công cụ an toàn của môi trường review chặn nó vì là thao tác có thể phá dữ liệu. Thay vào đó, tôi kiểm tra một route khác của cùng module test, chỉ đọc: `GET /api/v1/test/market/stats` trả **404 `NOT_FOUND`**. Mọi route `/test/*` nằm trong cùng `TestSupportModule`, module này chỉ được nạp khi `testEndpointsEnabled()` đúng (`app.module.ts`). Vì vậy kết quả trên cho thấy các route test không tồn tại trên production. Nếu muốn kiểm tra đúng bước 6, bạn tự chạy: `curl -i -X POST https://web-production-49fda79f.up.railway.app/api/v1/test/reset` và phải thấy `404`.

### Kiểm tra riêng (a)–(h)
- **(a) AlertWorker (ARCHITECTURE §5):** OK.
  - Lúc khởi động: `onApplicationBootstrap` đăng ký PriceBus rồi `reload()`.
  - Tạo và xóa alert cập nhật index ngay sau khi ghi DB thành công. `pending` xử lý trường hợp tạo hoặc xóa trong lúc đang reload.
  - Kích hoạt: một transaction gồm `updateMany where {id, status:'ACTIVE'}` và tạo notification; chỉ gửi đi khi `count === 1`.
  - Có in-flight guard theo id của alert.
  - Sau khi restart, alert đã TRIGGERED không được nạp lại, nên không có thông báo trùng. User offline vẫn có dòng thông báo chờ trong DB.
  - Một kênh gửi bị lỗi chỉ được ghi log, không hoàn tác việc kích hoạt.
  - Integration test chứng minh: 20 tick đồng thời chỉ tạo đúng 1 thông báo; 3 lần `trigger()` song song (kiểm tra ở mức DB) chỉ tạo đúng 1 thông báo; alert đã xóa không kích hoạt; reload dựng lại index; alert tạo ngay sau reload vẫn được theo dõi.
- **(b) POST /alerts:** thứ tự kiểm tra đúng như API.md: validation (DTO) → `symbols.require` → đếm ACTIVE ≥ 20 → `tickers.get` (không có thì `MARKET_DATA_UNAVAILABLE`) → `isConditionMet` (422). Integration test kiểm tra từng mã lỗi của field, `SYMBOL_NOT_FOUND` (kể cả `ETHBTC`), 422 cho ABOVE và BELOW, limit đứng trước "already met", validation và symbol đứng trước limit. Riêng nhánh `MARKET_DATA_UNAVAILABLE` tôi xác nhận bằng cách đọc code (mock luôn có giá nên không có test riêng). Tôi không coi đây là lỗi.
- **(c) Hai chỗ sửa API.md:**
  - `OUT_OF_RANGE` khi > 1e15: cột `DECIMAL(24,8)` chỉ chứa tối đa 16 chữ số phần nguyên. Không có giới hạn này thì giá quá lớn sẽ gây lỗi 500. Đây là sửa chỗ hở thật sự giữa API.md và DATABASE.md. Không làm AC nào dễ qua hơn; frontend dùng cùng giới hạn này.
  - `notification:read` gửi tới room `user:{id}`: trước đây §3.6 ghi "other sockets", trái với bảng §4.3 (`user:{id}`). Đây là mâu thuẫn thật, nay đã khớp §4.3. AC-NOTIF-05 vẫn kiểm tra tab còn lại nên không dễ hơn. Code của tab gửi request áp dụng event một cách idempotent.
- **(d) Commit `c7ef830`:** 6 assertion trong account, auth và watchlist chỉ đổi `getByTestId('toast')` thành `appToast(page)` (bỏ qua toast `data-kind="notification"`). Chữ mong đợi và số lượng (`toHaveText`, `toHaveCount(0)`, `toBeVisible`) giữ nguyên. Không assertion nào yếu đi.
- **(e) NotificationChannel:** có interface, token `NOTIFICATION_CHANNELS` (factory trả về mảng các kênh) và `InAppChannel`. Worker chỉ gọi `NotificationsService.dispatch`. `notification:read` là event đồng bộ trạng thái đọc, không phải gửi thông báo. Hai phần bổ sung (đồng bộ lại thông báo bị lỡ khi socket kết nối, toast tóm tắt khi mở app) đã được ghi sẵn trong API.md §4.3 và ARCHITECTURE §3.4 trên `main`. Lần kết nối đầu (khi chưa có mốc so sánh) chỉ tải lại dữ liệu, không hiện toast riêng từng thông báo. Vì vậy AC-NOTIF-04 vẫn ra đúng toast "Bạn có N thông báo chưa đọc" (test đã kiểm tra chính xác chữ).
- **(f) Nghĩa vụ từ `phase-2-ui-01-bell.decision.md`:** test AC-UI-01 có sẵn được mở rộng (không tạo test thứ hai cùng ID): khách thì không có chuông; sau khi đăng nhập thì header có `bell` và `user-menu`. Ghi chú "bell is built in Phase 6" đã bị xóa khỏi TRACEABILITY. Đúng như quyết định.
- **(g) Cách ly giữa user:** list, đọc và đọc tất cả đều lọc theo `userId`. Alert hoặc thông báo của user khác trả về 404 giống như không tồn tại. `notification:new` và `notification:read` chỉ gửi tới `user:{id}`. Integration test có socket của user khác nhận 0 event. Frontend reset cache `alerts` và `notifications` khi đổi user, và socket kết nối lại dưới dạng khách khi đăng xuất.
- **(h) Không có sleep cố định trong test Phase 6.** Các `waitForTimeout(6000)` và `setTimeout` còn lại là từ phase cũ (do AC yêu cầu chờ token hết hạn) hoặc là timeout và vòng chờ trạng thái. Các giới hạn 5 s (ALERT-03, 04, 09, 10, NOTIF-05) đều tính từ `deadline` đặt ngay trước `pushTick`.

### Bước 7: Các điểm builder tự khai trong log
| Điểm khai | Đánh giá |
|---|---|
| `PriceField` với `TOO_MANY_DECIMALS` | Chấp nhận. Đúng mã lỗi của API.md §1.3, có unit test `decimalPlaces`. |
| `/test/reset` gọi reload worker | Chấp nhận. API.md §3.8 đã ghi sẵn "reload alert worker". |
| Toast tóm tắt khi đăng nhập hoặc mở app; đồng bộ lại thông báo lỡ khi socket kết nối | Chấp nhận. Có trong ARCHITECTURE §3.4 và API.md §4.3; không phá AC-NOTIF-04. |
| AC-UI-01 thêm kiểm tra chuông | Chấp nhận. Đúng decision file. |
| Assertion toast cũ loại toast thông báo | Chấp nhận. Không yếu đi (xem (d)). |
| API.md §3.5 (1e15) và §3.6 (room `user:{id}`) | Chấp nhận (xem (c)). |
| frontend/CONTEXT.md cập nhật testid | Chưa đủ, xem Issue #1 (Minor). |
| Số test (107, 98, 90, 74) | Unit khớp với lần chạy local của tôi; integration và Playwright khớp CI xanh. |

---

## Tóm tắt cho chủ dự án
- Phase 6 (cảnh báo giá và thông báo) **đạt (PASS)**: 15 tiêu chí AC-ALERT và AC-NOTIF đều có test tự động thật, CI xanh ở commit mới nhất.
- Phần quan trọng nhất là "mỗi cảnh báo chỉ kêu 1 lần". Phần này được làm đúng (khóa trong database và có test với 20 tick đồng thời). Người đăng xuất vẫn nhận thông báo khi đăng nhập lại. User này không thấy cảnh báo hay thông báo của user khác.
- Chỉ có 1 lỗi nhỏ: danh sách "mã nhận diện cho test" trong `frontend/CONTEXT.md` còn thiếu vài mã mới. Đây chỉ là ghi chú, không ảnh hưởng app.
- Tôi chưa gửi được lệnh thử `POST /test/reset` lên app live vì công cụ chặn. Bạn có thể tự chạy lệnh `curl` ghi ở Bước 6 và phải thấy `404`.
