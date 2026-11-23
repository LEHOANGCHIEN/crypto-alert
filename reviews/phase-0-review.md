# Phase 0 Review — Crypto Alert (`phase-0-scaffold`)

Ngày review: 2026-11-24 · Commit được review: `0697487` (HEAD = `origin/phase-0-scaffold`) · Người review: chỉ đọc, không sửa code/tài liệu.

## VERDICT: FAIL

Có 1 lỗi **Major** (cấu hình deploy Railway). Mọi thứ khác của Phase 0 đạt yêu cầu. Sau khi sửa lỗi #1, Phase 0 có thể PASS.

---

## Issues

### 1. Major — `railway.json` (toàn file) · `package.json` dòng 15 · `docs/ARCHITECTURE.md` §10 dòng 223
**Vấn đề.** Cấu hình deploy nằm trong `railway.json` (Config as Code). Railway đã ngừng hỗ trợ cách này: file chỉ còn được đọc cho các service cũ đến **2026-12-01** (hạn cứng), và service tạo mới không thể dùng nó nữa. Service của dự án được tạo vào tháng 11/2026, nên rất có thể `railway.json` **đã bị bỏ qua ngay bây giờ**. Bằng chứng: health trên URL thật trả về `"version": "0.0.0"`. Đây là version của `package.json` ở thư mục gốc, nên app đang chạy bằng script `start` ở root (`npm start`), không phải bằng `startCommand` trong `railway.json` (nếu chạy theo `railway.json` thì version sẽ là `0.1.0`). Vì vậy `healthcheckPath: /api/v1/health` và restart policy trong `railway.json` gần như chắc chắn cũng không có tác dụng. Mục checklist "`railway.json` (build + start + healthcheck)" trong PROGRESS.md được đánh dấu xong, nhưng thực tế không chạy như mô tả.

**Hậu quả (nói đơn giản):** Railway không kiểm tra app còn sống hay không trước khi chuyển sang bản mới, và không tự khởi động lại theo cài đặt mong muốn. Sau ngày 1/12, mọi thiết lập trong `railway.json` chắc chắn mất hết. Bản deploy cuối (Phase 7, 6–7/12) và các lần redeploy sau mỗi lần merge đều rơi vào sau hạn này.

**Có phải chuyển ngay không?** Có. Phải chuyển ngay trong lần sửa Phase 0, trước 2026-12-01, vì dự án kéo dài đến ~10/12.

**Chuyển sang đâu (khuyến nghị, đơn giản nhất cho dự án 2 tuần):**
1. Giữ script `start` ở root (`cd backend && npx prisma migrate deploy && node dist/main.js`). Nó đang hoạt động và Railpack tự dùng nó.
2. Đặt trong **Railway service settings** (dashboard): Build Command `npm run build`; Start Command `npm start`; **Healthcheck Path `/api/v1/health`**, timeout 120; Restart Policy `On Failure`, tối đa 5 lần.
3. Trên trang deployment details của Railway, kiểm tra xem service có đang lưu "Config File path" hay không. Nếu có, xoá path đó trước (hoặc chạy `railway config migrate cutover`), **rồi mới** xoá `railway.json` và push. Xoá file khi path vẫn còn sẽ gây lỗi build.
4. Cập nhật ARCHITECTURE.md §10 (hàng Start/Deploy) và mục checklist trong PROGRESS.md cho đúng cách mới, rồi redeploy. Kiểm tra lại `/api/v1/health` (binance, connected true), và xác nhận trên trang deployment details rằng healthcheck path đang có hiệu lực.

Phương án thay thế: Infrastructure as Code (`.railway/railway.ts`, tạo bằng `railway config migrate`, rồi `railway config plan` / `railway config apply`). Cách này đúng hướng Railway khuyến nghị và giữ cấu hình trong repo, nhưng thêm công cụ và thêm bước, dễ sai với người mới. Chỉ chọn nếu muốn cấu hình nằm trong Git.

### 2. Minor — `docs/ARCHITECTURE.md` §10 dòng 222 (và ADR-01 dòng 308) mâu thuẫn với `backend/src/configure-app.ts` dòng 34–47
**Vấn đề.** Tài liệu ghi frontend được phục vụ bằng `@nestjs/serve-static`. Code thực tế dùng middleware Express (`express.static` + fallback trả `index.html`, bỏ qua `/api/` và `/socket.io`). Cách làm trong code chạy đúng: trên URL thật, `/abc` trả về trang SPA, còn `/api/v1/nope` trả về envelope `NOT_FOUND`. Nhưng CLAUDE.md yêu cầu sửa ARCHITECTURE.md khi có mâu thuẫn, và việc này chưa làm; độ lệch chỉ được ghi trong log của PROGRESS.md.

**Nói đơn giản:** Tài liệu mô tả một cách làm, code làm cách khác. Người đọc tài liệu sau này (hoặc AI ở phase sau) có thể làm theo tài liệu và gây nhầm lẫn.

**Cách sửa:** Đổi câu ở §10 thành "Express static middleware + SPA fallback in `configure-app.ts`". Trong ADR-01, bỏ chữ "serve-static" hoặc ghi rõ lý do đổi.

### 3. Minor — `backend/package.json` dòng 49 · commit `822baa0`
**Vấn đề.** Commit `822baa0` có tiêu đề "move prisma CLI to runtime dependencies", nhưng commit đó chỉ thêm `railway.json`. `prisma` vẫn nằm trong `devDependencies`. Trong khi đó, lệnh start khi chạy thật lại gọi `npx prisma migrate deploy`. Hiện tại deploy vẫn chạy vì Railpack giữ lại dev dependencies. Nếu một ngày bước cài đặt bỏ dev dependencies, `npx` sẽ tự tải bản Prisma mới nhất (7.x). Bản đó không tương thích với cấu hình hiện tại: chính Prisma đang cảnh báo rằng `package.json#prisma` sẽ bị bỏ ở bản 7.

**Nói đơn giản:** Tiêu đề commit nói đã làm một việc mà thực ra chưa làm, và việc đó vẫn còn là một rủi ro nhỏ khi deploy.

**Cách sửa:** Chuyển `prisma` (cùng phiên bản `^6.19.3`) sang `dependencies` của backend, đúng như commit đã ghi, trong một commit mới (không sửa commit cũ).

---

## Đã kiểm tra và đạt

| Hạng mục | Kết quả |
|---|---|
| Working tree | Sạch (chỉ có thư mục `reviews/` chưa track); không đổi nhánh, không commit/push |
| `docs/SPEC.md` | **Không bị sửa** (diff chỉ chạm `docs/PROGRESS.md`, `docs/TRACEABILITY.md`) |
| CI | 3 run gần nhất đều `success`. Run mới nhất `45228135446` ứng với đúng HEAD `0697487`; tất cả bước (secrets, typecheck, lint, unit, integration, build, Playwright) đều thành công; có artifact `playwright-report` |
| `npm run check` local | Môi trường review không chạy hết được: sandbox chặn xoá file khi `prisma generate`/Vitest ghi cache, và không có Postgres. Phần chạy được: backend `tsc` OK, lint toàn bộ OK, Jest backend 12/12 pass, `secrets:check --all` OK (93 file). Phần còn lại dựa vào CI xanh ở trên. Không coi đây là lỗi của dự án |
| AC-OPS-01 | `ops.spec.ts`: kiểm tra envelope, `db: "up"`, provider `binance`/`mock`, `connected: true`, `lastMessageAt` < 60 s. Đúng SPEC |
| AC-I18N-01 | `i18n.spec.ts`: trình duyệt đặt `en-US` nhưng giao diện vẫn là tiếng Việt, `lang="vi"`, có kiểm tra cả text thật. Đúng SPEC |
| AC-THEME-01 | `theme.spec.ts`: `data-theme="dark"` và màu nền thật là `#0F1115` (token). Đúng SPEC |
| AC-UI-03 | `layout.spec.ts`: tiêu đề chính xác + dòng môn học giữ nguyên tiếng Việt ở cả hai ngôn ngữ, câu miễn trừ được dịch. Đúng SPEC |
| AC-UI-04 | `layout.spec.ts`: `/abc` → trang 404 (lấy chữ từ i18n, có trong cả `vi.json`/`en.json`), bấm link về `/trade/BTCUSDT`. Đúng SPEC |
| Chất lượng test | Không có `skip`/`only`/`fixme`, không nới lỏng assertion; tên test khớp đúng TRACEABILITY.md; TRACEABILITY ghi 5 passing / 71 pending, đúng thực tế |
| DATABASE.md | `schema.prisma` **giống hệt** §3; migration `init` có đủ raw SQL của §3.1; seed khớp §6 |
| API.md | Envelope §1.1, 19 mã lỗi §1.2, mã lỗi field §1.3, kiểu `Health` §2/§3.7, test-support §3.8 (chỉ bật khi `ENABLE_TEST_ENDPOINTS=true` **và** provider `mock`; app không khởi động nếu bật cờ này ở production) |
| `.env.example` | Đủ toàn bộ biến của ARCHITECTURE §10.1 |
| Bí mật | Chỉ track `.env.example`; `.env` bị ignore; không có khoá thật trong repo |
| Commit | 19 commit đúng Conventional Commits; tác giả là git của chủ dự án; không có `Co-Authored-By`, "Generated with", hay nhắc tới Claude/AI |
| App thật | `GET /api/v1/health` → 200, `db: "up"`, `provider: "binance"`, `connected: true`, `lastMessageAt` mới (cách < 1 s); `POST /api/v1/test/reset` → **404** `NOT_FOUND` |

## Đánh giá các thay đổi builder tự khai báo

| Thay đổi | Đánh giá |
|---|---|
| Nest 11 thay vì 12 | **Chấp nhận.** BRIEF/docs không bắt buộc phiên bản Nest; Nest 11 dùng được bình thường. Không cần sửa |
| Middleware Express thay vì `@nestjs/serve-static` | **Chấp nhận về kỹ thuật** (đã kiểm tra trên app thật), nhưng phải cập nhật tài liệu → issue #2 |
| Script `start` ở root cho Railpack | **Chấp nhận và nên giữ.** Thực tế đây chính là lệnh đang khởi động app trên Railway, và là nền cho cách cấu hình mới ở issue #1 |
| `railway.json` (Config as Code, hết hạn 2026-12-01) | **Phải chuyển ngay**, trước 1/12 (dự án chạy đến ~10/12) → issue #1. Khuyến nghị: service settings trên Railway + script `start` ở root; phương án thay thế là `.railway/railway.ts` |

## Tóm tắt cho chủ dự án

1. Phần nền của Phase 0 (database, API, đa ngôn ngữ, giao diện tối, 5 bài test tự động, CI) đều làm đúng và đang chạy. App thật trên Railway kết nối được Binance.
2. Có một lỗi cần sửa trước khi merge: file cấu hình Railway (`railway.json`) gần như chắc chắn đang không được dùng, và sẽ bị Railway bỏ hẳn từ ngày 1/12.
3. Cách sửa đơn giản: đặt lệnh build/start và đường dẫn kiểm tra sức khoẻ `/api/v1/health` trong phần cài đặt của service trên Railway, rồi xoá `railway.json` đúng thứ tự.
4. Hai lỗi nhỏ (tài liệu chưa cập nhật, `prisma` chưa được chuyển như commit đã ghi) nên sửa luôn trong cùng lượt.
5. Sau khi sửa, chạy lại review Phase 0. Nếu không còn lỗi lớn thì có thể merge và gắn tag `v0.0`.
