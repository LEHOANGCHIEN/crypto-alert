# Phase 4 Review — Indicators (`phase-4-indicators`)

VERDICT: **PASS**

Ngày review: 2026-11-25 · Nhánh `phase-4-indicators` · HEAD `d69c1cc` (trùng `origin/phase-4-indicators`, working tree sạch) · Reviewer: Opus 5.5 + High (chỉ đọc).

Không có lỗi Blocker hay Major. Có 2 lỗi Minor (xem dưới).

---

## Issues

### 1. MINOR — `e2e/tests/indicators.spec.ts` dòng 142–147 (AC-IND-05) + `frontend/src/features/chart/indicator-layers.ts` dòng 149–150
**Vấn đề:** SPEC AC-IND-05 yêu cầu histogram MACD "green ≥ 0, red < 0". Test chỉ kiểm tra màu của **cột cuối cùng** (`data-hist-last-color`). Với fixture BTCUSDT-1h, cột cuối là số âm, nên test chỉ chứng minh nhánh "đỏ < 0"; nhánh "xanh ≥ 0" không được kiểm tra ở đâu cả (cũng không có unit test cho `histPoint`). Code hiện tại đúng (`v >= 0 ? colors.up : colors.down`, dùng token `--color-up`/`--color-down`), nhưng nếu sau này ai đó làm hỏng nhánh xanh thì CI vẫn xanh.
**Cách sửa:** Trong `IndicatorLayers.publish` thêm 2 thuộc tính lấy từ `this.macd.hist.data()`: `data-hist-up-color` = màu của cột gần nhất có `value >= 0`, `data-hist-down-color` = màu của cột gần nhất có `value < 0` (rỗng nếu không có). Trong test AC-IND-05 khẳng định `data-hist-up-color` = `cssVar('--color-up')` và `data-hist-down-color` = `cssVar('--color-down')` (fixture 1000 nến chắc chắn có cả cột dương và âm). Giữ nguyên các khẳng định hiện có.
**Giải thích đơn giản:** Màu cột MACD hiện đúng, nhưng bài test chỉ kiểm tra một màu (đỏ). Nên kiểm tra thêm màu xanh để sau này không bị hỏng mà không ai biết.

### 2. MINOR — commit `3ee1a97` (`feat(chart): indicator legend on hover and live updates`)
**Vấn đề:** Commit này chỉ chứa test e2e (AC-IND-06/07) và `docs/TRACEABILITY.md`, không có code tính năng (builder đã tự khai báo trong log: code legend/live nằm ở `8569804`). Theo Conventional Commits, loại đúng phải là `test(e2e): …`. Định dạng commit vẫn hợp lệ, không có dấu hiệu AI.
**Cách sửa:** Không sửa lịch sử (cấm amend/rebase commit đã push). Chỉ ghi nhận; từ phase sau, commit chỉ chứa test thì dùng `test:`.
**Giải thích đơn giản:** Tên một commit ghi "tính năng" nhưng thực ra chỉ có bài test. Không ảnh hưởng gì đến app, không cần sửa, chỉ cần lần sau đặt tên đúng.

---

## Đánh giá các sai lệch (deviation) builder khai báo trong log PROGRESS

| # | Khai báo | Đánh giá |
|---|---|---|
| D1 | So với oracle: RSI của `technicalindicators` bị làm tròn 2 chữ số, nên giá trị oracle được dựng lại từ `AverageGain`/`AverageLoss` (chưa làm tròn) của chính thư viện oracle | **Chấp nhận.** Tôi đã xác nhận trong `node_modules/technicalindicators/lib/oscillators/RSI.js` dòng 33 có `toFixed(2)`, nên so 0,01 % với RSI làm tròn là không thể. Phần khó (làm mượt Wilder, seed SMA) vẫn do oracle tính; bước cuối `100 − 100/(1+RS)` (avgLoss = 0 → 100) đúng SPEC §4.1. Script golden làm giống hệt. |
| D2 | `technicalindicators` 3.1.0 là devDependency ở cả `frontend` và `e2e` | **Chấp nhận.** Đúng ARCHITECTURE §8 ("devDependency only"). Chỉ được import trong `oracle.test.ts` và script golden; không vào bundle production. |
| D3 | Golden tính tại index 998 (nến đã đóng cuối cùng của fixture 1000 nến) | **Chấp nhận.** Đúng SPEC AC-IND-06 ("last closed candle"); test kiểm tra `candles.length = 1000`, `candles[998].isClosed = true`, `close` khớp golden. |
| D4 | Commit `3ee1a97` chỉ chứa test AC-IND-06/07 | Xem Issue 2 (Minor). |
| D5 | Mục 8 (chủ dự án so với TradingView) để lại cho chủ dự án | **Đúng như dự kiến**, không phải lỗi. |
| D6 | Không đổi hợp đồng tài liệu (SPEC/API/DATABASE/ARCHITECTURE) | **Đúng.** `git diff main...phase-4-indicators -- docs/` chỉ có `PROGRESS.md` và `TRACEABILITY.md`. |
| D7 | Đường phân cách pane được tô màu theo token | Không thuộc AC nhưng là một phần của theme chart (ARCHITECTURE §11.2), dùng token, không có rủi ro. Không báo lỗi. |

---

## Những gì tôi đã kiểm tra

**Công thức (SPEC §4.1)** — `frontend/src/features/indicators/lib/`
- `sma.ts`: trung bình cộng n giá đóng cửa; `null` khi chưa đủ n. ✔
- `ema.ts`: α = 2/(n+1), seed = SMA của n giá trị đầu (bỏ qua `null` đứng đầu — cần cho đường Signal). ✔ (đúng hành vi `ta.ema` của Pine)
- `rsi.ts`: Wilder; giá trị đầu = SMA của 14 thay đổi đầu (tại index 14), sau đó `(prev×13 + current)/14`; `avgLoss = 0 → 100`. ✔
- `macd.ts`: MACD = EMA12 − EMA26; Signal = EMA9 (seed SMA) của MACD; Hist = MACD − Signal. ✔
- `compute.ts` cập nhật tăng dần nến cuối; tự tính lại toàn bộ khi nến trước thay đổi, có nến mới, đổi chu kỳ, hoặc nến cuối là điểm seed. Unit test chứng minh bằng tính lại toàn bộ (kể cả độ dài 2/14/15/26/27/34/35). ✔
- Tôi tự viết một bản cài đặt độc lập (ngoài repo) và đối chiếu với `e2e/fixtures/indicators.golden.json`: MA7/25/99, RSI14, MACD, Signal, Hist lệch tương đối ≤ 7·10⁻¹⁴. ✔

**Oracle & golden**
- `oracle.test.ts`: so với `technicalindicators` (SMA, EMA, AverageGain/Loss, MACD với `SimpleMAOscillator/SimpleMASignal = false` → EMA seed SMA — đã đọc mã nguồn thư viện), từ nến 250 đến 999, dung sai tương đối `1e-4` (0,01 %) + sàn tuyệt đối `1e-9` (chấp nhận được). Kiểm tra cả việc không bỏ sót điểm nào (`checked = length − 250`). ✔
- `e2e/scripts/generate-indicators-golden.mjs`: chỉ đọc fixture `BTCUSDT-1h.json` và gọi `technicalindicators`; **không import code app**. Kết quả tái tạo được và khớp file đã commit. ✔

**Playwright — 7 AC của Phase 4** (`e2e/tests/indicators.spec.ts`, mỗi AC đúng một test, tiêu đề khớp TRACEABILITY, không có `skip/only/fixme/waitForTimeout`)
- AC-IND-01: 3 đường MA 7/25/99 trên pane giá, mỗi đường một màu token khác nhau, legend có giá trị = trung bình tự tính trong test (độc lập với app). ✔
- AC-IND-02: tắt MA(25) → mất đường + legend; MA #1 = 50 → legend `MA(50)` và giá trị đúng; reload → giữ nguyên (localStorage `crypto-alert.indicators`). ✔
- AC-IND-03: `1`, `201`, `abc` → thông báo lỗi đã dịch, giữ giá trị 7, sau reload vẫn 7. ✔
- AC-IND-04: bật RSI → 2 pane, đường 70/30 nét đứt (là price line của chính series RSI), legend RSI(14); tắt → mất pane. ✔
- AC-IND-05: bật MACD → pane có MACD/Signal/Hist, legend 3 giá trị, màu histogram từ token up/down; tắt → mất pane. ✔ (xem Issue 1)
- AC-IND-06: hover đúng nến index 998, 7 giá trị legend = golden làm tròn theo số chữ số hiển thị (vi-VN, 2 chữ số). ✔
- AC-IND-07: push giá +5 % cho nến đang mở; hạn 2 s tính từ **trước** khi push; **chờ giá trị legend đổi** bằng `expect(...).toHaveText / not.toHaveText` với `timeout: left(deadline)` — không dùng sleep cố định; MA được so với giá trị tự tính; nến vẫn là nến đang mở. ✔

**MACD histogram:** `indicator-layers.ts` dòng 93 dùng `colors.up` / `colors.down` (đọc từ `--color-up` / `--color-down`), tô lại khi đổi theme. ✔

**TRACEABILITY:** 76 AC; passing 52 (45 + 7), pending 24, failing 0 — đếm lại khớp tóm tắt. ✔
**PROGRESS:** 7/8 mục đã tick (mục 8 là việc thủ công của chủ dự án), có 1 dòng log đúng định dạng. ✔

**Hợp đồng & quy tắc**
- Không đổi backend, `schema.prisma`, migration, API.md, DATABASE.md, ARCHITECTURE.md, SPEC.md. Không có `db push`. ✔
- CLAUDE.md: chuỗi UI qua i18n (khóa có ở cả `vi.json` và `en.json`); màu chỉ từ token (không có hex/inline style mới); số qua `shared/format`; xanh/đỏ chỉ cho hướng giá + histogram MACD (ARCHITECTURE §11.2 cho phép); logo attribution không bị tắt; `chart` chỉ import `indicators` qua `index.ts` công khai. ✔
- Bí mật: `secrets:check --all` OK (232 file); diff không chứa khóa/token. ✔
- Commit: 7 commit Conventional Commits, tác giả là chủ dự án; không có `Co-Authored-By`, "Generated with", hay nhắc Claude/AI (`git log main..phase-4-indicators --format=%B`). Mỗi mục checklist có ít nhất một commit. ✔
- Script trong `package.json`: Phase 4 chỉ thêm `golden` (`node scripts/...`) ở `e2e`. Các script CLAUDE.md dùng (`dev`, `start:dev`, `db:migrate`, `db:seed`, `build`, `start`) không đổi; `dotenv -e ../.env --` đúng cú pháp `dotenv-cli` 11.1.0 đã cài (đã xem `--help`); `concurrently`, `nest`, `prisma`, `tsx`, `vite` có trong `node_modules/.bin`. ✔

**CI** (GitHub API, vì máy review không có `gh`): run mới nhất `45467989924` cho commit `d69c1cc` (HEAD) — **success**, đủ các bước secrets, typecheck, lint, unit, integration, build, e2e. Run trước `45467268251` (`3ee1a97`) success; `45467121190` bị cancelled (bị run mới thay thế, bình thường). ✔

**`npm run check` trên máy review**
- `lint`: OK. Unit backend (Jest): 87/87 OK. Unit frontend (Vitest): 63/63 OK (gồm `lib.test.ts` 14, `oracle.test.ts` 8, `settings.test.ts` 11) — phải chạy `vitest run --cache=false` vì thư mục được mount không cho xóa file (EPERM khi Vitest xóa file cache tạm).
- `typecheck`: frontend + e2e OK; backend OK khi chạy `tsc -p tsconfig.check.json` trực tiếp — `prisma generate` trong script bị môi trường chặn (EPERM khi ghi đè `node_modules/.prisma/client`), không phải lỗi dự án.
- Integration + Playwright: **không chạy được** (máy review không có Docker/Postgres). Dựa vào CI run `45467989924` (đã chạy cả hai, xanh).

**App trên mạng** (chạy bản Phase 3 / v0.3, Phase 4 chỉ deploy sau merge)
- `GET /api/v1/health` (2026-11-24T19:29Z): `db: "up"`, `provider: "binance"`, `connected: true`, `lastMessageAt` mới. ✔ (`version: "0.0.0"` là mục đã hoãn sang Phase 7 — không tính lỗi.)
- `POST /api/v1/test/reset` → **404**. ✔

---

## Tóm tắt cho chủ dự án
1. Phase 4 (chỉ báo MA, RSI, MACD) **ĐẠT (PASS)**: công thức đúng SPEC, giá trị khớp thư viện kiểm chứng độc lập và khớp bản tính riêng của tôi.
2. Cả 7 bài test AC-IND-01…07 có thật, kiểm tra đúng nội dung SPEC; CI trên commit mới nhất xanh.
3. Có 2 lỗi nhỏ (Minor): test màu histogram MACD mới kiểm tra màu đỏ, chưa kiểm tra màu xanh; một commit chỉ có test nhưng ghi là "feat". Không ảnh hưởng tới việc merge.
4. App trên mạng vẫn chạy ổn (DB và Binance kết nối tốt, endpoint test bị khóa đúng).
5. Việc của bạn còn lại: tự so giá trị MA/RSI/MACD của BTCUSDT 1h với TradingView (mục 8 trong PROGRESS).
