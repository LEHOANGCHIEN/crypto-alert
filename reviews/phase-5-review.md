# Phase 5 Review — Watchlist (`phase-5-watchlist`)

- Ngày review: 2026-11-25 · Reviewer: Opus 5.5 + High (read-only)
- Branch head: `ecce2ff` (sạch, không có thay đổi chưa commit) · so với `main` = `7937a7c` (v0.4)
- Diff: 29 file, +777/−33 (backend watchlist module + integration test, frontend watchlist feature, e2e test + helper, PROGRESS, TRACEABILITY)

## VERDICT: PASS

Không có lỗi Blocker hoặc Major. Có 8 lỗi Minor (bên dưới), không cái nào làm sai một AC hay hợp đồng API.

---

## 1. Những gì đã kiểm tra

### 1.1 Tài liệu
- Đã đọc CLAUDE.md, SPEC.md, ARCHITECTURE.md (các mục liên quan), API.md, DATABASE.md, PROGRESS.md, TRACEABILITY.md, backend/CONTEXT.md, frontend/CONTEXT.md và tất cả `reviews/*.decision.md`.
- Diff tài liệu chỉ có `docs/PROGRESS.md` và `docs/TRACEABILITY.md`. **SPEC.md, API.md, DATABASE.md, ARCHITECTURE.md không bị sửa** → không có thay đổi hợp đồng nào làm AC dễ qua hơn.
- TRACEABILITY: 7 dòng AC-WL chuyển `pending → passing`, tiêu đề test khớp từng chữ với `e2e/tests/watchlist.spec.ts`; tổng kết 59 passing / 17 pending khớp với số dòng thực tế (đã đếm).
- PROGRESS: 5 mục checklist Phase 5 đã tick, có 1 dòng log đúng định dạng; trạng thái "built, awaiting review".

### 1.2 CI
| Run | Commit | Kết quả |
|---|---|---|
| 45480689488 | `ecce2ff` (commit mới nhất) | **success** — mọi bước xanh: secrets:check --all, typecheck, lint, unit, integration, build, Playwright e2e |
| 45479961868 | `2e35c4f` | success |
| 3 run trước | `cd95b35`, `ec62e65`, `0938ec1` | cancelled (do `cancel-in-progress` khi push liên tiếp — bình thường) |

(`gh` không có trong máy ảo review; đã đọc cùng dữ liệu qua GitHub REST API công khai của repo.)

### 1.3 `npm run check` chạy cục bộ
| Phần | Kết quả |
|---|---|
| typecheck | frontend ✓, e2e ✓, backend `tsc -p tsconfig.check.json` ✓. Bước `prisma generate` trong script backend bị môi trường chặn (thư mục mount không cho xoá file: `EPERM unlink node_modules/.prisma/client/index.js`) — không phải lỗi dự án; tsc chạy với client đã generate sẵn vẫn qua. |
| lint | ✓ (backend, frontend, e2e) |
| unit | Jest backend 13 suite / 87 test ✓ · Vitest frontend 10 file / 66 test ✓ (có `optimistic.test.ts` mới) |
| integration + e2e | **Không chạy được**: máy ảo review không có Postgres/Docker (cổng 5432 từ chối kết nối). Dựa vào CI run 45480689488 (cả hai bước xanh trên commit mới nhất). |

### 1.4 Script trong package.json
Phase 5 không đổi script nào (chỉ thêm devDependency `@prisma/client` cho e2e). Đã kiểm tra lại cú pháp các script CLAUDE.md dùng: `dotenv -e ../.env -- …` đúng cú pháp dotenv-cli 11.1.0 (đã xem `--help` trong node_modules); `concurrently -n … -c …` đúng; `build`, `start`, `db:migrate`, `db:seed` không đổi so với v0.4. Không có lỗi.

### 1.5 API.md §3.4 — đối chiếu từng điểm
| Yêu cầu | Code | Test |
|---|---|---|
| `GET /watchlist` → 200 `WatchlistItem[]` theo `createdAt` tăng dần | `watchlist.service.ts:17-19` (thêm `id asc` làm tie-break) | int-spec "GET lists seeded items…" (đúng thứ tự, chỉ 2 field `symbol`,`createdAt`, ISO có `Z`) |
| `PUT /watchlist/:symbol` → 200 `WatchlistItem`, idempotent (trả item cũ không đổi) | `add()` dòng 22-36; P2002 khi PUT song song cũng trả item cũ | int-spec: PUT 2 lần → `toEqual` y hệt (cùng `createdAt`), chỉ 1 dòng |
| Path param được viết hoa trước khi tra | `SymbolField` (`Transform` trim + upper) | `xrpusdt` → `XRPUSDT` |
| Sai định dạng → `VALIDATION_ERROR` (`INVALID_SYMBOL_FORMAT`) | `SymbolField` | `BTC-USDT` → 400 với `details[{field:'symbol',code:'INVALID_SYMBOL_FORMAT'}]` |
| Không phải cặp USDT TRADING → `SYMBOL_NOT_FOUND` (404) | `SymbolRegistry.require()` | `FAKEUSDT` và `ETHBTC` → 404 `SYMBOL_NOT_FOUND` |
| Mục thứ 51 → `WATCHLIST_LIMIT_REACHED` (409); PUT mục đã có ở mức 50 vẫn 200 | dòng 24-26 | int-spec limit: 50 mục → XRPUSDT 409; BTCUSDT (đã có) 200, vẫn 50; xoá 1 → thêm được |
| `DELETE` → 200 `{ symbol }`, idempotent, chỉ lỗi `VALIDATION_ERROR` | `remove()` dùng `deleteMany` | xoá 2 lần, xoá mục không có → 200; `a` → 400 |
| Cần đăng nhập | `@UseGuards(JwtAuthGuard)` ở cấp controller | GET/PUT/DELETE không token → 401 `UNAUTHENTICATED` |
| Tách biệt giữa user | mọi query có `where: { userId }` | int-spec isolation: B rỗng, B xoá ETHUSDT không ảnh hưởng A |

Kiểu `WatchlistItem` ở `frontend/src/shared/api/types.ts` khớp đúng API.md §2. Mã lỗi đều lấy từ API.md (`AppError`). Không trả field thừa.

### 1.6 Database
Không có thay đổi schema, không có migration mới, không sửa migration cũ, không dùng `db push`. Model `WatchlistItem` dùng đúng như DATABASE.md (unique `(userId, symbol)`).

### 1.7 Luật cứng CLAUDE.md
- i18n: mọi chuỗi mới đi qua `t()`, khoá thêm vào **cả** `vi.json` và `en.json` (test parity xanh); ESLint `no-literal-string` xanh. `errors.WATCHLIST_LIMIT_REACHED` đã có sẵn cả hai ngôn ngữ.
- Màu: chỉ dùng token (`text-warning` cho sao đầy — không dùng xanh/đỏ); không có hex hay `style` màu.
- Không có secret: chuỗi `postgresql://app:app@localhost/crypto_alert_test` là DB local dùng chung với các file test sẵn có; `secrets:check --all` xanh trên CI.
- Không có `test.skip`/`.only`/`fixme` trong e2e, backend test, frontend.
- Commit: 7 commit đều theo Conventional Commits; tác giả là `LE HOANG CHIEN`; **không có** "Co-Authored-By", "Generated with", hay nhắc tới Claude/AI (đã kiểm tra `git log main..phase-5-watchlist --format=%B`).

### 1.8 Từng AC của Phase 5 (Playwright, `e2e/tests/watchlist.spec.ts`)
| AC | Đánh giá |
|---|---|
| AC-WL-01 | Đạt. User mới → click sao ở dòng ETHUSDT → `aria-pressed=true`, dòng ETHUSDT xuất hiện với giá `3.510,25` và `+3,24%`; click sao ở header chart (`chart-star-BTCUSDT`) → cả hai sao BTCUSDT đầy, BTCUSDT được thêm **ở cuối** (`['ETHUSDT','BTCUSDT']`). Kiểm tra cả hai cách trong AC. |
| AC-WL-02 | Đạt. Xoá bằng sao đầy (ETHUSDT) và bằng nút × (SOLUSDT); dòng biến mất, sao rỗng, còn lại đúng `['BTCUSDT']`. |
| AC-WL-03 | Đạt. Thêm XRPUSDT → reload → còn; context trình duyệt mới đăng nhập cùng user → cùng danh sách đúng thứ tự. |
| AC-WL-04 | Đạt. Mock đẩy giá ETHUSDT 3600 → giá và % đổi trong hạn 2 s (deadline đặt trước khi push). |
| AC-WL-05 | Đạt. Click dòng SOLUSDT → URL `/trade/SOLUSDT?tf=1h`, chart đổi sang SOL/USDT. |
| AC-WL-06 | Đạt. Khách click sao → hộp thoại "Đăng nhập để sử dụng danh sách theo dõi" + nút Đăng nhập; sao vẫn rỗng; **không có request nào tới `/api/v1/watchlist`** (đây là kiểm tra "không lưu gì" thật sự). |
| AC-WL-07 | Đạt (xem Minor #3). User B (đăng ký mới, context riêng) thấy danh sách rỗng và sao rỗng; user A vẫn chỉ 1 dòng ETHUSDT; mục 51: helper chèn thẳng tới 50 mục vào DB test, sau đó **click sao XRPUSDT thật trên UI → PUT thật qua API → 409** → toast đúng chữ tiếng Việt của `WATCHLIST_LIMIT_REACHED`, sao vẫn rỗng, không có dòng XRPUSDT. |

### 1.9 App đang chạy (baseline Phase 4)
- `GET /api/v1/health` → `success: true`, `db: "up"`, `marketData.provider: "binance"`, `connected: true`, `lastMessageAt` mới (vài trăm ms). `version: "0.0.0"` là mục đã hoãn sang Phase 7 — không tính.
- `POST /api/v1/test/reset` → **404** `NOT_FOUND` ✓.
- `GET /api/v1/watchlist` → 404 — đúng như mong đợi vì Phase 5 chưa deploy (live vẫn là v0.4).

### 1.10 Các điểm điều phối viên yêu cầu kiểm tra riêng
- **API.md §3.4**: khớp hoàn toàn (bảng 1.5).
- **Integration test có thật sự kiểm tra limit, idempotency, cách ly user không?** Có — 7 test, mỗi cái kiểm tra trạng thái DB/response thật, không mock Prisma.
- **Optimistic add/remove có rollback khi lỗi không?** Code có (`useWatchlist.ts:28-42`: chụp `previous`, khôi phục trong `onError`, toast dịch, `invalidateQueries` trong `onSettled`). **Nhưng chưa có test nào phân biệt được rollback** — xem Minor #1.
- **AC-WL-07 chèn dòng thẳng vào DB test**: chấp nhận được. Mục thứ 51 vẫn đi qua UI + API thật. Helper dùng đúng nguồn URL mà server e2e dùng (`TEST_DATABASE_URL`, mặc định `…/crypto_alert_test`; `e2e/start-server.mjs:25`), nên nó chỉ chạm DB mà app e2e đang dùng — DB này vốn bị `/test/reset` xoá trước mỗi test. Chỉ thiếu một chốt chặn cứng — xem Minor #5. `@prisma/client` trong e2e cùng phiên bản `^6.19.3` với backend nên dùng chung client đã generate; lockfile cập nhật; `npm ci` trên CI xanh.
- **Testid phụ `chart-star-<SYMBOL>`**: hợp lý (hai nút sao cùng symbol trên một trang cần id khác nhau); AC-WL-01 kiểm tra cả hai. Chỉ thiếu cập nhật danh sách testid trong frontend/CONTEXT.md — xem Minor #6.
- **Xoá cache watchlist khi đổi user**: có `WatchlistSession` (`removeQueries(['watchlist'])` mỗi khi `user.id` đổi, gồm cả khi logout → `null`), query chỉ bật khi đã đăng nhập, `StarButton` chỉ tô sao khi `authed`. Đọc code thấy đúng, **nhưng chưa có test trong cùng một trình duyệt** — xem Minor #2.

### 1.11 Các sai lệch builder khai trong dòng log PROGRESS
| Sai lệch khai báo | Đánh giá |
|---|---|
| Sao header chart dùng testid `chart-star-<SYMBOL>` (dòng market giữ `star-<SYMBOL>`) | Chấp nhận. Ghi ở TRACEABILITY; còn thiếu ở frontend/CONTEXT.md (Minor #6). |
| AC-WL-07 chèn filler vào DB test qua `e2e/helpers/watchlist.ts`, thêm devDependency `@prisma/client` cho e2e, vì mock chỉ có 8 cặp | Chấp nhận (lý do đúng: không thể thêm 50 cặp thật qua API khi mock chỉ có 8 cặp USDT). Nên thêm chốt chặn `_test` (Minor #5). |
| "No doc contract changes" | Đúng — đã kiểm tra diff. |
| "7 integration tests" | Đúng — 7 `it(...)`. |
| "optimistic add/remove with rollback + translated toast" | Code có; toast được test; rollback chưa được test riêng (Minor #1). |
| "cache cleared on user change" | Code có; chưa có test (Minor #2). |
| "CI green (run 45479961868)" | Đúng (run của `2e35c4f`); run mới nhất 45480689488 của `ecce2ff` cũng xanh. |

---

## 2. Issues

**1. Minor — `frontend/src/features/watchlist/useWatchlist.ts:38-42` và `e2e/tests/watchlist.spec.ts:134-137`**
Rollback của optimistic update không được test nào thực sự kiểm tra. Trong AC-WL-07, sau khi PUT trả 409, các assertion `aria-pressed=false` và `toHaveCount(0)` vẫn sẽ qua **kể cả khi xoá hẳn `onError` rollback**, vì `onSettled` → `invalidateQueries` sẽ tải lại danh sách từ server và tự xoá dòng thêm tạm. `optimistic.test.ts` chỉ test hàm thuần `withItem/withoutItem`.
Sửa: thêm một Vitest cho hook (QueryClient thật + `request` mock trả `ApiError('WATCHLIST_LIMIT_REACHED')`, `queryFn` treo/không tự refetch) để khẳng định cache quay về `previous` ngay trong `onError`, trước khi refetch; tương tự cho DELETE lỗi.
> Nói đơn giản: khi thêm sao bị lỗi, app có code "trả lại như cũ", nhưng chưa có bài test nào chứng minh đoạn code đó chạy — hiện test qua được nhờ app tự tải lại danh sách.

**2. Minor — `frontend/src/features/watchlist/WatchlistSession.tsx:9-11` (không có test)**
Việc xoá cache watchlist khi đổi tài khoản trong **cùng một trình duyệt** không được test. AC-WL-03/07 chỉ dùng context trình duyệt riêng (cache trống sẵn), nên một lỗi rò dữ liệu (user A logout → user B login, B thấy sao/dòng của A trong giây đầu) sẽ không bị phát hiện. Đọc code thấy logic đúng.
Sửa: thêm một test hỗ trợ (không đặt tên AC mới, ví dụ ghi chú trong Notes của AC-WL-07) hoặc mở rộng AC-WL-07: trong cùng `page`, login demo → thấy `watchlist-row-SOLUSDT` → `logoutViaUi` → đăng ký/login user B → khẳng định `watchlist-empty` hiện và `star-BTCUSDT` có `aria-pressed=false`, đồng thời không bao giờ thấy `watchlist-row-SOLUSDT` (dùng `page.on('response')` hoặc `expect(...).toHaveCount(0)` ngay sau khi header đổi tên).
> Nói đơn giản: khi đổi tài khoản trên cùng máy, code có xoá danh sách cũ, nhưng chưa có test kiểm tra người sau không nhìn thấy danh sách của người trước.

**3. Minor — `e2e/tests/watchlist.spec.ts:113-114`**
Bước "thêm cùng một cặp hai lần" của AC-WL-07 dùng `ETHUSDT`, cặp này **đã có sẵn** trong watchlist demo (seed). Cả hai lần PUT đều đi vào nhánh "đã tồn tại", nên test không kiểm tra trường hợp thêm mới rồi thêm lại. (Integration test `watchlist.int-spec.ts:47-55` đã kiểm tra đúng trường hợp này với XRPUSDT, nên hành vi vẫn được bảo vệ.)
Sửa: đổi sang một cặp chưa có trong seed (ví dụ `XRPUSDT`) và khẳng định `panelSymbols` = `['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT']` với đúng 1 dòng XRPUSDT; sau đó đặt bước giới hạn 50 dùng một cặp khác chưa có (ví dụ `ADAUSDT` hoặc cặp mock còn lại).
> Nói đơn giản: test "thêm 2 lần vẫn 1 dòng" đang dùng một cặp đã có sẵn từ trước, nên chưa thử đúng tình huống thêm mới hai lần trên giao diện end-to-end.

**4. Minor — `backend/src/modules/watchlist/watchlist.service.ts:26-28`**
Kiểm tra giới hạn 50 là "đếm rồi mới tạo", không nằm trong transaction. Nếu một user gửi nhiều PUT (cặp khác nhau) cùng lúc khi đang có 49 mục, tất cả đều đếm được 49 và đều được tạo → vượt 50. Unique `(user_id, symbol)` chỉ chặn trùng cặp, không chặn vượt giới hạn.
Sửa: bọc đếm + tạo trong `prisma.$transaction(async (tx) => …)` và khoá dòng user trước khi đếm: `await tx.$queryRaw\`SELECT id FROM users WHERE id = ${userId} FOR UPDATE\``; giữ nguyên nhánh P2002. Không cần đổi schema.
> Nói đơn giản: nếu ai đó cố tình bấm/gửi rất nhiều yêu cầu cùng lúc, có thể lọt quá 50 cặp một chút; người dùng bình thường không gặp.

**5. Minor — `e2e/helpers/watchlist.ts:4,11`**
Helper ghi thẳng vào DB bằng `TEST_DATABASE_URL` mà không có chốt chặn nào. Hiện nó dùng đúng URL của server e2e nên an toàn trong thực tế, nhưng khác với `backend/test/helpers/env.ts:3` (có kiểm tra `_test`), helper này sẽ ghi vào bất kỳ DB nào biến môi trường trỏ tới.
Sửa: trước khi tạo `PrismaClient`, kiểm tra tên database trong URL kết thúc bằng `_test` (ví dụ `new URL(TEST_DB).pathname.endsWith('_test')`) và host là `localhost`/`127.0.0.1` hoặc đang chạy trong CI; nếu không thì `throw new Error(...)` (tiếng Anh, chỉ dành cho dev).
> Nói đơn giản: hàm test chèn dữ liệu thẳng vào database nên có thêm một "khoá an toàn" để chắc chắn không bao giờ chạm vào database thật.

**6. Minor — `frontend/CONTEXT.md:41` (mục "Testing hooks")**
Danh sách testid ổn định chỉ ghi `star-<SYMBOL>`; testid mới `chart-star-<SYMBOL>` của sao trên header chart (và các testid mới `watchlist-remove-<SYMBOL>`, `watchlist-price-<SYMBOL>`, `watchlist-change-<SYMBOL>`, `watchlist-empty`, `watchlist-login-prompt`, `watchlist-login-button`) không được thêm vào. Chỉ TRACEABILITY có ghi chú.
Sửa: thêm `chart-star-<SYMBOL>` (ghi rõ "chart header star; market row keeps `star-<SYMBOL>`") và các testid watchlist trên vào danh sách ở frontend/CONTEXT.md:41, ghi thay đổi này vào dòng log PROGRESS.
> Nói đơn giản: tài liệu quy ước cho frontend chưa cập nhật tên mới của nút sao trên biểu đồ, nên phiên làm việc sau có thể dùng nhầm tên.

**7. Minor — `frontend/src/features/watchlist/WatchlistPanel.tsx:8`**
`import { PriceCell } from "../market/PriceCell"` — feature watchlist nhập file nội bộ của feature market, trái với frontend/CONTEXT.md ("A feature never imports another feature's internals — move shared pieces to `shared/`").
Sửa: chuyển `PriceCell.tsx` sang `frontend/src/shared/ui/PriceCell.tsx` (hoặc `shared/market/`) và cập nhật import ở cả `MarketList.tsx` và `WatchlistPanel.tsx`; không đổi hành vi.
> Nói đơn giản: một thành phần dùng chung (ô giá nhấp nháy) đang nằm trong thư mục riêng của danh sách thị trường; nên đưa về thư mục dùng chung cho đúng quy tắc.

**8. Minor — commit `ec62e65`**
Hai mục checklist khác nhau ("Star buttons … Watchlist panel …" và "Guest prompt; optimistic updates with rollback on error") nằm chung một commit, trong khi CLAUDE.md yêu cầu ít nhất một commit cho mỗi mục hoàn thành. Nội dung commit vẫn đúng Conventional Commits và không có ghi công AI.
Sửa: không viết lại lịch sử (CLAUDE.md cấm rebase/amend commit đã push); chỉ cần ghi nhận, áp dụng đúng ở các phase sau.
> Nói đơn giản: hai phần việc được lưu chung một lần commit; không ảnh hưởng gì tới app, chỉ là chưa đúng thói quen đã đặt ra.

---

## Tóm tắt cho chủ dự án
- Kết quả: **PASS** — Phase 5 (danh sách theo dõi) làm đúng tài liệu API, đủ 7 bài test AC-WL-01…07, CI xanh trên commit mới nhất, không sửa SPEC hay database, không lộ bí mật, không có ghi công AI trong commit.
- Thêm/xoá sao, giá cập nhật trực tiếp, giới hạn 50 cặp, khách bị yêu cầu đăng nhập, và mỗi người chỉ thấy danh sách của mình đều đã được kiểm tra bằng test tự động.
- Có 8 điểm nhỏ (Minor): chủ yếu là thiếu test cho "trả lại như cũ khi lỗi" và "đổi tài khoản trên cùng máy", một khoá an toàn cho hàm test ghi DB, và vài chỗ tài liệu/cấu trúc thư mục chưa gọn.
- Tôi không chạy được integration và e2e trên máy ảo review (không có Postgres) nên dựa vào CI; app đang chạy (bản v0.4) vẫn khoẻ và đã tắt endpoint test.
