# Review — Phase 3 (Real-time relay)

Ngày: 2026-11-25 · Reviewer: Opus 5.5 + High (chỉ đọc) · Branch: `phase-3-realtime` · HEAD `4cfd3d2` · so với `main`

VERDICT: **PASS** (0 Blocker · 0 Major · 4 Minor)

## Đã kiểm tra

| Hạng mục | Kết quả |
|---|---|
| Working tree | Sạch, đang ở `phase-3-realtime`, khớp `origin/phase-3-realtime` |
| Decision files | Không có `reviews/phase-3-*.decision.md`. Các decision cũ (docs-review-1 M7 caps, không rate-limit event theo socket; phase-2-ui-01-bell) được tôn trọng |
| Thay đổi docs | Chỉ `docs/PROGRESS.md` (tick checklist + 1 dòng log) và `docs/TRACEABILITY.md` (7 AC → passing). **Không sửa** SPEC.md / API.md / DATABASE.md / ARCHITECTURE.md / CLAUDE.md / CONTEXT.md |
| CI | 3 run gần nhất: `45444795312` (HEAD `4cfd3d2`) **success**, `45443985412` (`b0a80bc`) success, `45442432939` (`64b2a42`) failure — đã được sửa ở commit sau. Run mới nhất chạy đủ: secrets check, typecheck, lint, unit, integration, build, Playwright |
| `npm run check` cục bộ | typecheck FE + e2e OK; BE `tsc -p tsconfig.check.json` OK (bước `prisma generate` bị sandbox chặn ghi đè file trong `node_modules/.prisma` — lỗi môi trường); lint OK; Jest BE 13 suite / 84 test OK; Vitest FE 5 file / 27 test OK. **Integration + Playwright không chạy được** (VM review không có Postgres) → dựa vào CI xanh |
| Scripts | `dev` (concurrently), `start`, `build`, `db:migrate`, `db:seed`, `start:dev` dùng `dotenv -e ../.env -- …` — đúng cú pháp dotenv-cli 11.1.0 đang cài (`cli.js`: `-e <path>` + `-- command`). Phase 3 không đổi script nào |
| Commits | 13 commit, đều Conventional Commits, tác giả `LE HOANG CHIEN`; không có `Co-Authored-By`, "Generated with", Claude hay AI. Mỗi mục checklist có ≥ 1 commit |
| Bí mật | `secrets:check --all` OK (207 file); không có `.env*` trong diff |
| DATABASE | Không đổi schema, không migration mới, không sửa migration cũ, không `db push` |
| Quy tắc CLAUDE.md | Dữ liệu thị trường chỉ qua `MarketDataProvider` (không file nào ngoài `providers/` import `ws`/Binance); FE không gọi Binance; test endpoints vẫn chỉ mount khi `ENABLE_TEST_ENDPOINTS=true` **và** `MARKET_DATA_PROVIDER=mock`; i18n key mới có ở cả `vi.json` và `en.json` (`market.status.*`, `connection.reconnecting`); màu chỉ qua token (`bg-warning`, `bg-up/20`, `bg-down/20`) |
| Hợp đồng API.md §4 | Handshake (`auth.token`, guest, `connect_error` với `data.code` UNAUTHENTICATED/TOKEN_EXPIRED, join `user:{id}`, `market:status` ngay khi connect), tên event/room, payload `tickers:update`/`kline:update`/`market:status`, ack envelope §1.1, `SUBSCRIPTION_LIMIT_REACHED` (3rd kline sub trên 1 socket), `MARKET_DATA_UNAVAILABLE` (stream thứ 201), `VALIDATION_ERROR`/`SYMBOL_NOT_FOUND` — đều đúng, có integration test (`realtime.int-spec.ts`). Server `pingInterval 10000`/`pingTimeout 5000`; client reconnect 1 s → 10 s, `transports: ['websocket','polling']` |
| Test endpoints §3.8 | `tick`, `close-candle`, `disconnect`, `stats.upstreamStreams` (sắp xếp, `!miniTicker@arr` đứng đầu) đúng body/kết quả |
| ARCHITECTURE §4 | Combined stream `/stream?streams=!miniTicker@arr` ✓ · hàng đợi gửi ≤ 4 msg/s (sliding window) ✓ · backoff 1 s→30 s ±20 % + reset sau 60 s ✓ · watchdog 30 s ✓ · reconnect chủ động 23 h ✓ · resubscribe khi mở lại ✓ · gap recovery (REST 2 nến/stream → `kline:update` + upsert nến đóng) ✓. Unit test có cho tất cả, trừ phần nêu ở Issue 4 |
| SubscriptionManager | Ref-count, grace 5 s, cap 2/socket và 200 upstream (stream đang trong grace vẫn tính), `releaseAll` khi socket ngắt — có unit test |
| Live app | `GET /api/v1/health` → `db: "up"`, `provider: "binance"`, `connected: true`, `lastMessageAt` mới (cùng thời điểm `time` của server). `POST /api/v1/test/reset` → **404** `NOT_FOUND`. `/socket.io` → 404 (đúng như dự kiến: live vẫn là bản Phase 2) |

### Từng AC của Phase 3 (PROGRESS.md: AC-MKT-03, AC-RT-01…06)

| AC | Test (đúng 1 test, tiêu đề khớp TRACEABILITY) | Nhận xét |
|---|---|---|
| AC-MKT-03 | `market.spec.ts` · `AC-MKT-03 live ticker updates row` | Chờ `data-live` (đã subscribe) rồi mới push; kiểm giá, % thay đổi, volume trong **2 s tính từ lúc push** (`left(deadline)`); flash xanh (`data-flash=up` + `bg-up/20`) rồi đỏ (`down` + `bg-down/20`), flash tự tắt. Đạt |
| AC-RT-01 | `realtime.spec.ts` · `AC-RT-01 open candle updates live` | BTCUSDT 1m; close/high/low của nến cuối + giá header trong 2 s; số nến và openTime không đổi. Đạt |
| AC-RT-02 | `AC-RT-02 closed candle starts a new one` | Nến mới xuất hiện trong 2 s, nến trước giữ O/H/L/C cuối. Đạt |
| AC-RT-03 | `AC-RT-03 subscriptions follow the viewed chart` | 1h → 15m → ETHUSDT; poll stats đến đúng `["!miniTicker@arr","ethusdt@kline_15m"]` (so khớp tuyệt đối). Đạt |
| AC-RT-04 | `AC-RT-04 shared upstream subscription ref-count` | 2 tab → 1 stream; đóng 1 tab → lấy mẫu > 7 s (qua grace 5 s) luôn còn 1; đóng cả 2 → chỉ còn ticker stream trong **10 s**. Đạt |
| AC-RT-05 | `AC-RT-05 browser reconnect banner and resync` | `setOffline(true)` → banner dịch trong **5 s**; nến đóng trong lúc offline được tải lại sau khi online (chờ response klines thật), live tiếp tục trong 2 s. Đạt |
| AC-RT-06 | `AC-RT-06 upstream disconnect badge and recovery` | Badge "Dữ liệu thị trường bị trễ" trong **5 s**, banner kết nối không hiện, badge tự tắt, tick tiếp tục trong 2 s. Đạt |

Không có `waitForTimeout`/sleep cố định, `test.skip`, `only`, hay assertion bị nới trong test Phase 3; các test cũ không bị sửa yếu đi. TRACEABILITY đúng (45 passing / 31 pending).

## Issues

1. **Minor** — `docs/API.md:262` (§3.8 `POST /test/reset`) và `docs/PROGRESS.md:130` (log Phase 3).
   Code mới (`backend/src/modules/test-support/test-support.controller.ts:36-50`) cho reset còn ngắt mọi Socket.IO client, xoá toàn bộ kline subscription (unsubscribe upstream ngay) và xoá trạng thái batch ticker, nhưng cột "Effect" của API.md vẫn là mô tả cũ; dòng log lại ghi "No doc contract changes". Đây là thay đổi hành vi endpoint (chỉ dùng cho test), không làm AC nào dễ đạt hơn — chỉ giúp các test không ảnh hưởng nhau.
   Fix: (cần decision cho phép sửa API.md) thêm vào cột Effect của `POST /test/reset`: "disconnect all Socket.IO clients, drop all kline subscriptions (upstream unsubscribed immediately) and the pending/last-sent `tickers:update` state"; sửa dòng log Phase 3 để liệt kê thay đổi doc này.
   *Tiếng Việt đơn giản:* Nút "reset" dùng cho test giờ làm thêm vài việc mà tài liệu API chưa ghi. Chỉ cần ghi bổ sung vào tài liệu cho khớp.

2. **Minor** — `backend/src/modules/realtime/realtime.service.ts:22` và `frontend/src/shared/socket/socket.ts:53-57`.
   Chú thích nói "clients reconnect on their own" là sai: `server.disconnectSockets(true)` gây lý do `io server disconnect`, và socket.io-client 4.8 **không** tự kết nối lại trong trường hợp này (xem `node_modules/socket.io-client/build/esm/socket.js` dòng 155-172); `socket.active` thành `false`, nên cả listener đổi token (`socket.ts:87`, `if (!s.active) return`) cũng không nối lại. Hệ quả: tab nào đang mở khi gọi `/test/reset` (ví dụ khi chạy app với mock để thử tay) sẽ kẹt banner "Mất kết nối, đang kết nối lại…" mãi đến khi tải lại trang. Production không bị (không có test endpoint); e2e không bị (reset chạy trước khi mở trang).
   Fix: trong handler `'disconnect'` của `socket.ts`, nhận tham số `reason`; nếu `reason === 'io server disconnect'` và `navigator.onLine` thì gọi `s.connect()`. Sửa chú thích ở `realtime.service.ts`. Thêm 1 unit/integration test nhỏ nếu rẻ.
   *Tiếng Việt đơn giản:* Khi bấm reset trong chế độ thử nghiệm, trang web đang mở không tự kết nối lại. Chỉ ảnh hưởng lúc thử, không ảnh hưởng bản chạy thật.

3. **Minor** — `backend/src/modules/market/providers/binance/binance-ws.client.ts:108` (`open()`).
   Watchdog 30 s chỉ được bật sau sự kiện `open`; `new WebSocket(url)` không có `handshakeTimeout`. Nếu kết nối tới Binance bị treo ở bước bắt tay (TCP/TLS không trả lời), client chờ đến khi hệ điều hành tự huỷ (có thể ~2 phút hoặc lâu hơn) thay vì kết nối lại sau ≤ 30 s như ARCHITECTURE §4 "Watchdog: no message for 30 s → force reconnect". Trong thời gian đó badge "trễ" hiện và không có giá mới.
   Fix: tạo socket với `new WebSocket(url, { handshakeTimeout: this.watchdogMs })` (option có sẵn của `ws`), hoặc gọi `this.armWatchdog()` ngay trong `open()` trước khi chờ `open`; thêm unit test với server giả nhận TCP nhưng không hoàn tất handshake (hoặc dùng URL tới một cổng không trả lời) để chứng minh có lần kết nối lại.
   *Tiếng Việt đơn giản:* Nếu lúc kết nối lại tới Binance bị "treo", hệ thống có thể chờ lâu hơn 30 giây mới thử lại. Ít khi xảy ra, sửa nhanh.

4. **Minor** — `backend/src/modules/market/providers/binance/binance-ws.client.spec.ts` (thiếu test).
   ARCHITECTURE §4 "Reconnect" có 2 hành vi chưa có unit test: (a) backoff tăng dần qua các lần thất bại liên tiếp của client (1 s → 2 s → 4 s…; hiện chỉ test bước đầu và hàm `backoffDelay` riêng lẻ), (b) đặt lại backoff về 1 s sau 60 s kết nối khỏe (`healthyTimer`, dòng 123). Code hiện tại đúng khi đọc, nhưng nếu sau này bị sửa sai sẽ không test nào bắt được.
   Fix: thêm 2 test với fake upstream: đóng server liên tiếp và đo khoảng cách giữa các lần thử (dùng `random: () => 0.5` để không jitter); khởi tạo client với `healthyResetMs` nhỏ (vd 200 ms), để kết nối sống qua ngưỡng rồi ngắt, kiểm tra lần thử tiếp theo quay về ~1 s.
   *Tiếng Việt đơn giản:* Phần "chờ lâu dần rồi đặt lại" khi mất kết nối Binance đã làm đúng nhưng chưa có bài kiểm tra tự động riêng. Nên thêm để sau này không bị hỏng mà không ai biết.

Không có Blocker hay Major. Các mục tôi đã cân nhắc nhưng **không** báo: không có giới hạn tần suất event theo socket (decision docs-review-1 M7 đã quyết định bỏ); việc re-sync notifications/alerts khi socket connect (ARCHITECTURE §3.4) thuộc Phase 6; chuông trong AC-UI-01 thuộc Phase 6 (phase-2-ui-01-bell.decision.md).

## Tóm tắt cho chủ dự án

- Phase 3 (giá và nến cập nhật trực tiếp, banner "đang kết nối lại", badge "dữ liệu bị trễ") **ĐẠT**: 7 bài kiểm tra AC đều có thật, kiểm đúng giới hạn 2 s / 5 s / 10 s, CI xanh trên commit mới nhất.
- Không sửa SPEC, không đổi database, không có bí mật bị lộ, commit không nhắc tới AI. Bản đang chạy trên Railway vẫn khỏe (Binance kết nối được, endpoint test bị tắt đúng).
- Có 4 lỗi nhỏ (Minor): tài liệu API chưa ghi việc "reset" ngắt kết nối; trang không tự nối lại sau reset trong chế độ thử; thiếu giới hạn thời gian khi kết nối Binance bị treo; thiếu 2 bài kiểm tra cho phần chờ-lâu-dần.
- Các lỗi nhỏ này không chặn việc merge; điều phối viên quyết định sửa ngay hay để sau.
