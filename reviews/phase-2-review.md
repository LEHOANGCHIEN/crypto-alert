# Phase 2 Review — Market list + chart (REST)

Ngày: 2026-11-24 · Reviewer: Review project (Opus 5.5 + High, chỉ đọc) · Nhánh: `phase-2-market-chart` · HEAD `a7f80ac`

**VERDICT: PASS** (không có Blocker / Major; có 4 Minor)

## 1. Đã kiểm tra những gì

| Hạng mục | Kết quả |
|---|---|
| Working tree | Sạch, chỉ có `reviews/phase-2-ui-01-bell.decision.md` chưa track (cố ý). Không đổi nhánh. |
| Diff `main...phase-2-market-chart` | 59 file. Docs chỉ đổi `docs/PROGRESS.md` và `docs/TRACEABILITY.md`. **Không đổi** `SPEC.md`, `API.md`, `DATABASE.md`, `ARCHITECTURE.md`. Không có file `backend/prisma/**` (không migration mới, không sửa migration cũ, không `db push`). |
| CI | `gh` không có trong môi trường review → đọc GitHub API công khai. Run mới nhất `45402801576` cho đúng commit `a7f80ac`: **success**; tất cả bước (secrets:check --all, typecheck, lint, unit, integration, build, Playwright) đều success. Run `45402260421` (`8f7b41e`) success; `45402052054` (`ff0f4af`) bị cancel do concurrency (bình thường). |
| `npm run check` tại máy | Typecheck backend/frontend/e2e: OK. Lint 3 workspace: OK. Jest backend: 8 suite / 54 test pass. **Không chạy được**: Vitest frontend (sandbox không cho xoá file tạm trong `node_modules` → EPERM), integration và Playwright (sandbox không có Docker/Postgres). Phần này dựa vào CI (đã xanh). `secrets:check --all`: OK (172 file). |
| Script trong `package.json` (CLAUDE.md Commands) | `dev` (concurrently), `start:dev` (`dotenv -e ../.env -- nest start --watch`), `db:migrate`, `db:seed`, `build`, `start` đều đúng cú pháp với dotenv-cli 11.1.0 và Nest CLI đã cài (đã đối chiếu `--help`). `nest-cli.json` thêm `assets` cho fixture → `dist/modules/market/providers/mock/fixtures/` khớp `__dirname` của `mock-data.ts`. |
| Commit | 10 commit, đều Conventional Commits, tác giả là git identity của chủ dự án; **không** có `Co-Authored-By`, "Generated with", hay nhắc Claude/AI. Mỗi mục checklist có ≥ 1 commit (áp dụng đúng quy tắc từ phase-1 decision R6). |
| Live app (`https://web-production-49fda79f.up.railway.app`, vẫn là build Phase 1) | `GET /api/v1/health` lúc 2026-11-24T14:00:54Z → `db: "up"`, `provider: "binance"`, `connected: true`, `lastMessageAt` mới (< 1 s), `status: "ok"`. `POST /api/v1/test/reset` → **404** `NOT_FOUND`. `GET /api/v1/test/market/stats` → 404. |
| Hợp đồng API.md §3.3 / §3.8 | `GET /market/symbols` (USDT + TRADING + spot, sort theo symbol), `GET /market/tickers` (USDT, sort `quoteVolume` desc), `GET /market/klines` (`symbol`/`interval` bắt buộc, `limit` 1–1000 mặc định 1000, tăng dần, nến cuối `isClosed:false`, lỗi `VALIDATION_ERROR`/`SYMBOL_NOT_FOUND`/`MARKET_DATA_UNAVAILABLE`), `GET /test/market/stats` đúng shape. Kiểu `SymbolInfo`/`Ticker`/`Candle` ở `frontend/src/shared/api/types.ts` khớp §2. Field codes `REQUIRED`, `INVALID_SYMBOL_FORMAT`, `INVALID_ENUM`, `OUT_OF_RANGE`, `INVALID_TYPE` đúng §1.3 (có integration test). |
| CandleCacheService (ARCHITECTURE §3.2) | Đủ cửa sổ trong DB → chỉ lấy 2 nến mới nhất; thiếu/khoảng trống → lấy cả cửa sổ và chỉ upsert nến đã đóng (`skipDuplicates`); nến đang mở không bao giờ lưu. Có unit test window/gap và integration test với DB thật (bao gồm test "xoá 1 nến giữa → refetch toàn bộ và vá bảng"). |
| MockProvider (ARCHITECTURE §8) | Đủ 8 cặp USDT + `ETHBTC`, `BTCUSDC` (bị lọc qua cùng parser với Binance). Fixture BTCUSDT-1h đúng 1000 nến thật, dịch thời gian để nến cuối là nến đang mở. Các cặp khác dùng PRNG có seed. Bộ đếm REST + `/test/market/stats`. |
| CLAUDE.md hard rules | i18n: mọi key mới có ở cả `vi.json`/`en.json`. Không hex/inline color trong component (chỉ `style` cho vị trí list ảo). Format số/ngày chỉ qua `shared/format`. Trình duyệt không gọi Binance. Attribution logo bật (`attributionLogo: true`). Xanh/đỏ chỉ cho hướng giá. Không BigInt. Không secret bị commit. Chart giữ thời gian UTC, timezone hiển thị qua `timeFormatter` + `tickMarkFormatter` (đúng frontend/CONTEXT.md). |
| PROGRESS.md / TRACEABILITY.md | 10/10 mục checklist Phase 2 được tick; có 1 log line đúng định dạng. TRACEABILITY: 16 AC Phase 2 = `passing`, tổng 38 passing / 38 pending — đúng. Ghi chú AC-UI-01 về cái chuông khớp `reviews/phase-2-ui-01-bell.decision.md`. |

## 2. Từng AC của Phase 2

| AC | Test Playwright | Đánh giá |
|---|---|---|
| AC-MKT-01 | market.spec.ts | Đủ: 4 cột (text tiếng Việt chính xác), chỉ 8 cặp USDT, `ETHBTC`/`BTCUSDC` vắng mặt, thứ tự so với API theo `quoteVolume` giảm dần. |
| AC-MKT-02 | market.spec.ts | Đủ: `eth` → chỉ ETHUSDT; `zzz` → thông báo rỗng đã dịch; xoá → đủ 8 cặp. |
| AC-MKT-04 | market.spec.ts | Đủ: `+3,24%` class `text-up`, `−5,10%` (U+2212, đúng SPEC) class `text-down`, `0,00%` màu trung tính. |
| AC-MKT-05 | market.spec.ts | Đạt cho trường hợp URL đã có `?tf=`; xem **Issue 1** (trường hợp mặc định không có `?tf=`). |
| AC-MKT-06 | market.spec.ts | Đủ: "Không tìm thấy cặp giao dịch", link về BTCUSDT, không có `pageerror`. |
| AC-CHART-01 | chart.spec.ts | Đủ: canvas, symbol/giá/% đổi, `#tv-attr-logo` hiển thị. |
| AC-CHART-02 | chart.spec.ts | Đủ: 6 nút, `1h` mặc định, bấm `15m` → request mới, URL `?tf=15m`, reload vẫn `15m`. |
| AC-CHART-03 | chart.spec.ts | Đủ: response 1000 phần tử, tăng dần, chỉ nến cuối `isClosed:false`, số nến render = 1000. |
| AC-CHART-04 | chart.spec.ts | Đủ: lần 1 `limit 1000`, lần 2 `limit ≤ 2` theo bộ đếm mock. |
| AC-CHART-05 | chart.spec.ts | Đủ: hover → giờ + O/H/L/C đúng định dạng vi của đúng nến; rời chuột → nến mới nhất. |
| AC-CHART-06 | chart.spec.ts | Legend đúng timezone `Asia/Ho_Chi_Minh` cho khách; trục thời gian chỉ có unit test, xem **Issue 2**. |
| AC-PROF-05 | account.spec.ts | Đủ: cùng một nến, đổi sang `UTC` → legend sớm hơn đúng 7 giờ. |
| AC-I18N-04 | i18n.spec.ts | Đủ: giá/%/volume (`900 Tr` / `900M`) và ngày giờ theo vi và en, giờ en so với `Intl` độc lập. |
| AC-THEME-02 | theme.spec.ts | Rất chặt (đọc pixel canvas thật); nhưng chưa kiểm tra màu chữ của chart, xem **Issue 3**. |
| AC-UI-01 | layout.spec.ts | Đủ theo decision `phase-2-ui-01-bell`: 3 cột 320/flex/340 cùng hàng, tab Watchlist/Alerts, logo, ngôn ngữ, theme, Login/Register (khách), footer. Thiếu chuông được decision cho phép. |
| AC-UI-02 | layout.spec.ts | Đủ: 390×844, thanh tab dưới 4 tab đúng tên, mỗi tab chỉ hiện panel của nó, không cuộn ngang ở cả 4 tab. |

Không có `test.skip`/`fixme`/`only`, `retries: 0`, không tăng timeout bất thường.

## 3. Đánh giá các deviation builder khai trong log PROGRESS

| Deviation | Kết luận |
|---|---|
| Thu hẹp locator "Đăng nhập" về `header` trong AC-AUTH-07, AC-I18N-01 và helper `logoutViaUi` (vì panel bên phải giờ cũng có nút "Đăng nhập") | **Chấp nhận.** Đây là thay đổi chặt hơn, không yếu đi: SPEC AC-AUTH-07 nói chính *header* phải hiện Login/Register. Không đổi gì khác trong 3 test đó. (Dòng kiểm "Đăng ký" trong AC-AUTH-07 vẫn chưa gắn `header`, nhưng hiện chỉ header có link đó nên vẫn đúng; giữ nguyên như Phase 1 recheck.) |
| "No doc contract changes" | **Đúng** — chỉ PROGRESS/TRACEABILITY đổi. |
| Deps `lightweight-charts` 5.3, `@tanstack/react-virtual` | **Chấp nhận** — đúng stack ARCHITECTURE §1/§3.1. |
| "checked live against Binance locally" | Không kiểm chứng được từ sandbox (không có Postgres, không ra Binance). Code `BinanceRestClient` có unit test parser; live app vẫn là Phase 1 nên `/market/*` sẽ được kiểm khi deploy sau merge. |

## 4. Issues

1. **Minor** — `frontend/src/features/market/MarketList.tsx:43-45` + `e2e/tests/market.spec.ts:67-68` (AC-MKT-05).
   Khi URL không có `?tf=` (trường hợp mặc định, ví dụ mở `/trade/BTCUSDT`), bấm dòng ETHUSDT dẫn tới `/trade/ETHUSDT` **không có** `?tf=1h`, trong khi SPEC AC-MKT-05 ghi URL phải là `/trade/ETHUSDT?tf=<current tf>`. Test chỉ thử trường hợp đã có `?tf=15m` nên không bắt được.
   *Nói đơn giản:* Biểu đồ vẫn mở đúng khung 1h, nhưng địa chỉ trên thanh URL thiếu phần `?tf=1h` mà SPEC yêu cầu. Sửa: luôn ghép `?tf=<khung hiện tại>` (dùng `parseInterval`), và thêm vào test AC-MKT-05 một bước mở `/trade/BTCUSDT` (không có tf) → bấm ETHUSDT → URL kết thúc bằng `?tf=1h`.

2. **Minor** — `e2e/tests/chart.spec.ts:133-138` (AC-CHART-06); wiring ở `frontend/src/features/chart/CandleChart.tsx:85`.
   SPEC nói *trục thời gian* và legend đều theo timezone người dùng. Test e2e chỉ kiểm legend; trục thời gian chỉ được kiểm gián tiếp bằng unit test `formatTickMark` (format.test.ts), không có gì chứng minh chart thật sự dùng `tickMarkFormatter` với timezone đúng.
   *Nói đơn giản:* Code hiện tại có làm đúng, nhưng nếu sau này ai đó lỡ xoá dòng gắn timezone cho trục thời gian thì không test nào báo đỏ. Sửa (rẻ): `CandleChart` ghi `data-timezone` (timezone đang dùng cho formatter) lên `chart-root`; AC-CHART-06 kiểm `Asia/Ho_Chi_Minh` cho khách (và có thể AC-PROF-05 kiểm `UTC` sau khi đổi). Coordinator có thể chấp nhận unit test hiện có nếu thấy đủ.

3. **Minor** — `frontend/src/features/chart/chart-theme.ts:42-47` + `e2e/tests/theme.spec.ts:60-104` (AC-THEME-02).
   SPEC: theme sáng áp dụng cho chart gồm "background, grid, **text**". Code có đổi màu chữ (`layout.textColor` từ `--color-text-muted`), nhưng `publishChartColors` không công bố màu chữ và test không kiểm nó.
   *Nói đơn giản:* Nền và lưới của biểu đồ đã được kiểm kỹ, riêng màu chữ trên biểu đồ thì chưa có test. Sửa: thêm `el.dataset.chartText = c.text` và trong AC-THEME-02 kiểm `data-chart-text` bằng token `--color-text-muted` ở cả theme tối và sáng.

4. **Minor (bảo mật / tính sẵn sàng)** — `backend/src/modules/market/market.controller.ts:27`, `candle-cache.service.ts:35`.
   `GET /market/klines` là public và không giới hạn tần suất. Ai đó có thể gọi liên tục với nhiều cặp × khung thời gian chưa có cache → server gọi Binance REST nhiều lần (nguy cơ Binance chặn IP của server bằng 418/429 → cả app báo `MARKET_DATA_UNAVAILABLE`) và bảng `candles` phình to (tối đa ~2000 cặp × 6 khung × 999 dòng). BRIEF/SPEC không bắt buộc rate-limit cho market, nên không chặn PASS.
   *Nói đơn giản:* Người lạ có thể "spam" trang biểu đồ khiến Binance tạm chặn server. Rủi ro thấp với quy mô đồ án; nên xử lý trong đợt bảo mật Phase 7 (ví dụ throttle theo IP cho `/market/klines`, hoặc gộp các request trùng (symbol, interval) đang chạy). Coordinator quyết định có làm hay để Phase 7.

## 5. Ghi chú cho coordinator (không phải issue)
- `reviews/phase-2-ui-01-bell.decision.md` đang untracked: nhớ yêu cầu builder commit nó cùng các file review Phase 2 (như R5/R7 ở các phase trước).
- Nghĩa vụ Phase 6 trong decision về chuông (mở rộng test AC-UI-01, xoá ghi chú TRACEABILITY) cần reviewer Phase 6 kiểm.
- Lần chạy Vitest trong sandbox review để lại thư mục tạm `node_modules/.vitest-cache.tmp-*` (~200 KB, git bỏ qua, vô hại; một thư mục tương tự đã có từ trước). Có thể xoá tay hoặc để `npm ci` lần sau dọn.

## Tóm tắt cho chủ dự án
- Phase 2 **ĐẠT (PASS)**: danh sách thị trường, biểu đồ nến, khung thời gian, legend, timezone, đổi theme và bố cục desktop/mobile đều có test Playwright thật cho đủ 16 AC, và CI xanh cho commit mới nhất.
- Builder không sửa SPEC hay các file hợp đồng (API/DATABASE/ARCHITECTURE), không có commit nhắc AI, không lộ secret; app đang chạy trên Railway vẫn khoẻ và endpoint test bị tắt đúng.
- Có 4 lỗi nhỏ (Minor): URL thiếu `?tf=1h` khi đổi cặp ở khung mặc định, 2 chỗ test chưa kiểm đủ (trục thời gian, màu chữ biểu đồ), và nên chống "spam" API biểu đồ ở Phase 7.
- Bạn có thể cho merge Phase 2; coordinator quyết định sửa 4 lỗi nhỏ ngay hay để sau.
