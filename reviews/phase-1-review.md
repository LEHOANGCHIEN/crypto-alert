# Phase 1 — Review (Auth & account)

Ngày: 2026-11-24 · Nhánh: `phase-1-auth` · Commit mới nhất: `c3758c7` · Người review: Review project (chỉ đọc)

## VERDICT: FAIL

Lý do: có 1 lỗi **Major** (#1 — múi giờ mặc định `Asia/Ho_Chi_Minh` bị chính backend coi là không hợp lệ, nên trang Tài khoản không lưu được phần Tuỳ chọn). Không có Blocker. Các mục còn lại là Minor.

## Những gì đã kiểm tra

| Hạng mục | Kết quả |
|---|---|
| Docs diff | Chỉ API.md §3.1, DATABASE.md §refresh_tokens, ARCHITECTURE.md §6 (đúng phạm vi `reviews/phase-1-refresh-token.decision.md`, đúng nội dung quy tắc) + PROGRESS/TRACEABILITY. **SPEC.md, CLAUDE.md, CONTEXT.md không đổi.** |
| CI | Run `45250874420` cho commit mới nhất `c3758c7`: **success** (secrets, typecheck, lint, unit, integration, build, e2e đều xanh). Run cho `71a4ca2` cũng xanh. |
| `npm run check` trên máy review | typecheck ✅ (backend chạy `tsc` trực tiếp vì `prisma generate` không được ghi vào `node_modules` trong môi trường chỉ-đọc), lint ✅, unit ✅ (Jest 12/12, Vitest 16/16). **Integration và Playwright không chạy được** (máy review không có Docker/Postgres) → dựa vào CI. |
| Playwright | Đủ 17 test cho AC-AUTH-01…10, AC-PROF-01…04, AC-I18N-03, AC-I18N-05, AC-THEME-03; mỗi ID đúng 1 test; không có `skip`/`only`/`fixme`. TRACEABILITY đúng (22 passing / 54 pending / 76). |
| Refresh token (theo decision) | Code đúng quy tắc: token **đã rotate** dùng lại trong < 10 s → cấp token mới, không thu hồi gì; sau 10 s → thu hồi **toàn bộ**; token bị thu hồi do logout/đổi mật khẩu (`replaced_by_id IS NULL`) → chỉ `REFRESH_TOKEN_INVALID` + xoá cookie. Integration test có (a), (b) và nhánh "đổi mật khẩu → phiên B 401, phiên A vẫn dùng được". Rotation dùng `updateMany … revokedAt: null` nên hai request đồng thời không cùng thắng. |
| Bảo mật auth | argon2id (mặc định của `argon2`: m=64 MiB, t=3, p=4 — đạt khuyến nghị OWASP); login sai email vẫn chạy verify giả (không lộ email qua thời gian); JWT HS256 cố định thuật toán cả sign lẫn verify, secret ≥ 32 ký tự; cookie `HttpOnly; SameSite=Lax; Path=/api/v1/auth; Max-Age=604800`, `Secure` theo `COOKIE_SECURE`; token lưu SHA-256; rate limit dùng chung bucket register+login theo `req.ip`, có `Retry-After`, test reset xoá bộ đếm. Không trả `passwordHash` (dùng `userPublicSelect`). |
| Hợp đồng API | Route, field, mã lỗi, status code của §3.1/§3.2 khớp; types FE copy đúng §2; đủ bản dịch `errors.*` + `validation.*` cho vi và en, hai file khoá giống nhau; không thấy chuỗi hard-code. |
| DB | Không có migration mới, không đổi schema (đúng: phase này không cần). |
| Secrets / commit | `secrets:check --all` OK; chỉ `.env.example` được commit. 5 commit đều theo Conventional Commits, **không** có `Co-Authored-By`, "Generated with", hay nhắc Claude/AI. |
| App live | `GET /api/v1/health` → `db: up`, `provider: binance`, `connected: true`. `POST /api/v1/test/reset` → **404 NOT_FOUND**. (App live vẫn là Phase 0; không test tính năng auth trên URL live.) |

## Issues

### 1. MAJOR — Múi giờ mặc định `Asia/Ho_Chi_Minh` bị backend từ chối → trang Tài khoản không lưu được Tuỳ chọn
- **File:** `backend/src/common/validators.ts:42-44` (`isValidTimezone` chỉ chấp nhận tên trong `Intl.supportedValuesOf('timeZone')` + `'UTC'`); `frontend/src/features/account/AccountPage.tsx:14,143` (danh sách chọn cũng lấy từ `Intl.supportedValuesOf`); `frontend/src/app/usePreferenceActions.ts:35` (nút Lưu gửi cả `timezone`); nguồn gốc ở `docs/API.md:83` (định nghĩa `INVALID_TIMEZONE` = "không có trong `Intl.supportedValuesOf('timeZone')`").
- **Sai ở đâu:** `Intl.supportedValuesOf('timeZone')` chỉ trả tên "chuẩn" theo CLDR. Đã kiểm tra trên Node 22 (máy chạy backend) và Chrome 156: danh sách **không có** `Asia/Ho_Chi_Minh` (chỉ có `Asia/Saigon`) và không có `UTC`. Trong khi đó SPEC §4, DATABASE.md (`user_settings.timezone` default) và seed đều dùng `Asia/Ho_Chi_Minh`. Hậu quả:
  - Người dùng mặc định (kể cả tài khoản demo) bấm "Lưu" ở phần Tuỳ chọn trên `/account` → `PATCH /users/me/settings` gửi `timezone: "Asia/Ho_Chi_Minh"` → **400 `VALIDATION_ERROR` / `INVALID_TIMEZONE`** → hiện toast lỗi, không lưu được ngôn ngữ/giao diện/múi giờ ở trang này.
  - Ô chọn múi giờ không có dòng `Asia/Ho_Chi_Minh` nên hiển thị sai (dòng đầu danh sách) trong khi giá trị thật là Hồ Chí Minh.
  - Mục checklist Phase 1 "Account page: … preferences (language, theme, timezone select)" bị đánh dấu xong nhưng không hoạt động; không có test nào (integration hay e2e) bấm nút Lưu tuỳ chọn hoặc gửi `Asia/Ho_Chi_Minh`, nên CI không phát hiện. AC-PROF-05 (phase sau) chắc chắn sẽ vướng lỗi này.
  - Đây cũng là mâu thuẫn giữa hai tài liệu: API.md §1.3 (định nghĩa hợp lệ) vs SPEC §4 / DATABASE.md (giá trị mặc định không thoả định nghĩa đó).
- **Giải thích đơn giản:** Hệ thống tự đặt múi giờ mặc định là "Hồ Chí Minh", nhưng bộ kiểm tra lại không nhận cái tên này là hợp lệ. Vì vậy ai bấm "Lưu" ở mục Tuỳ chọn trong trang Tài khoản đều bị báo lỗi.
- **Cách sửa chính xác:**
  1. Backend `isValidTimezone`: coi là hợp lệ nếu `new Intl.DateTimeFormat('en-US', { timeZone: v })` không ném lỗi (chấp nhận mọi tên IANA, kể cả alias như `Asia/Ho_Chi_Minh`, `UTC`); giữ kiểu string và độ dài ≤ 64.
  2. Frontend `AccountPage`: danh sách chọn phải chứa giá trị hiện tại của người dùng và `Asia/Ho_Chi_Minh` (vd. `new Set(['UTC', 'Asia/Ho_Chi_Minh', settings.timezone, ...Intl.supportedValuesOf('timeZone')])`, sắp xếp).
  3. `docs/API.md` §1.3 dòng `INVALID_TIMEZONE`: đổi thành "Not a valid IANA timezone (rejected by `Intl.DateTimeFormat`)" — cần decision cho phép sửa API.md.
  4. Thêm integration test: `PATCH /users/me/settings` với `{ timezone: 'Asia/Ho_Chi_Minh' }` → 200 và `{ locale, theme, timezone }` đầy đủ → 200; thêm test (integration hoặc Vitest) cho `isValidTimezone('Asia/Ho_Chi_Minh') === true`, `'Mars/Base' === false`.

### 2. MINOR — Test AC-AUTH-03 không kiểm tra lỗi hiện "trước khi submit"
- **File:** `e2e/tests/auth.spec.ts:23-38`.
- **Sai ở đâu:** SPEC AC-AUTH-03 nói lỗi trường "appear before submit". Test điền cả 4 ô rồi bấm submit (dòng 33) **sau đó** mới kiểm tra lỗi, nên không chứng minh lỗi xuất hiện trước khi bấm. Code thực tế có hiện lỗi khi rời ô (blur), chỉ là test không kiểm tra.
- **Giải thích đơn giản:** Tính năng có vẻ đúng, nhưng bài test chưa kiểm tra đúng câu chữ của yêu cầu.
- **Cách sửa:** Trước dòng `submit-register').click()`, thêm `await page.getByTestId('field-email').blur()` (hoặc focus ô khác) và `expect(page.getByTestId('error-email')).toHaveText('Email không hợp lệ.')`, tương tự ít nhất cho `error-password`; giữ phần kiểm tra sau submit và `registerCalls === 0`.

### 3. MINOR — Test AC-AUTH-07 không kiểm tra nút "Đăng ký" sau khi logout
- **File:** `e2e/tests/auth.spec.ts:100-111` (dùng `logoutViaUi` ở `e2e/helpers/auth.ts:27`, chỉ kiểm tra link Đăng nhập).
- **Sai ở đâu:** SPEC: "header shows Login/Register buttons". Test chỉ kiểm tra nút Login.
- **Giải thích đơn giản:** Sau khi đăng xuất, header phải có cả "Đăng nhập" và "Đăng ký"; test mới kiểm một nút.
- **Cách sửa:** Trong test AC-AUTH-07 thêm `await expect(page.getByRole('link', { name: 'Đăng ký' })).toBeVisible();`.

### 4. MINOR (bảo mật cấu hình) — Production không bị chặn nếu thiếu `COOKIE_SECURE=true` / `TRUST_PROXY_HOPS=1`
- **File:** `backend/src/config/env.ts:13,20,25` (chỉ có ràng buộc production cho `ENABLE_TEST_ENDPOINTS`); quy trình merge trong `docs/PROGRESS.md:23` không nhắc đặt biến.
- **Sai ở đâu:** Phase 1 là phase đầu tiên hai biến này có tác dụng thật khi deploy sau merge. Nếu Railway để mặc định: `COOKIE_SECURE=false` → cookie refresh thiếu cờ `Secure` (ARCHITECTURE §10.1 yêu cầu `true` in prod); `TRUST_PROXY_HOPS=0` → mọi người dùng có chung IP của proxy Railway → 10 lần đăng nhập sai của bất kỳ ai sẽ chặn đăng nhập/đăng ký của **tất cả** mọi người trong 1 phút. Tôi không xem được biến môi trường trên Railway nên không biết đã đặt chưa.
- **Giải thích đơn giản:** Trên máy chủ thật cần bật hai công tắc bảo mật; hiện code không tự kiểm tra, nên nếu quên bật thì app vẫn chạy nhưng kém an toàn và có thể khoá đăng nhập của mọi người.
- **Cách sửa:** Thêm vào `envSchema` một `.refine` nữa: khi `NODE_ENV=production` thì bắt buộc `COOKIE_SECURE=true`; và trước khi merge Phase 1, hướng dẫn chủ dự án (tiếng Việt) kiểm tra/đặt trên Railway: `COOKIE_SECURE=true`, `TRUST_PROXY_HOPS=1`.

### 5. MINOR — File decision chưa được commit
- **File:** `reviews/phase-1-refresh-token.decision.md` (untracked).
- **Sai ở đâu:** Log PROGRESS ghi các sửa API/DATABASE/ARCHITECTURE là "owner-approved", nhưng văn bản cho phép chưa có trong repo (decision Phase 0 R7: thư mục `reviews/` được commit).
- **Giải thích đơn giản:** Giấy cho phép sửa tài liệu đang chỉ nằm trên máy, chưa lưu vào Git.
- **Cách sửa:** Commit file này (vd. `docs: add phase 1 refresh-token decision`) cùng lượt sửa tiếp theo.

### 6. MINOR — Số commit ít hơn số mục checklist; một commit gộp nhiều việc
- **File:** lịch sử `main..phase-1-auth` (4 commit code cho 11 mục checklist; `71a4ca2` gộp đổi logic refresh-token + sửa 3 tài liệu + toàn bộ e2e test).
- **Sai ở đâu:** CLAUDE.md Git rules: "at least one commit per completed checklist item".
- **Giải thích đơn giản:** Nên lưu mỗi phần việc thành một lần commit riêng để dễ quay lại khi có lỗi. Không cần sửa lịch sử cũ (bị cấm), chỉ cần làm đúng từ phase sau.
- **Cách sửa:** Không sửa lịch sử; áp dụng từ Phase 2 trở đi.

### 7. MINOR — Feature `account` import phần nội bộ của feature `auth`
- **File:** `frontend/src/features/account/AccountPage.tsx` (import `../auth/auth.store` và `../auth/messages`).
- **Sai ở đâu:** `frontend/CONTEXT.md`: "A feature never imports another feature's internals — move shared pieces to `shared/`".
- **Giải thích đơn giản:** Hai phần của giao diện đang "mượn" code của nhau trực tiếp, trái quy ước sắp xếp thư mục của dự án.
- **Cách sửa:** Chuyển `features/auth/messages.ts` sang `shared/i18n/` (vd. `shared/i18n/errorText.ts`) và chuyển store phiên đăng nhập sang `shared/auth/` (hoặc xuất qua một file `features/auth/index.ts` nếu coordinator chấp nhận đó là API công khai của feature).

## Đánh giá các sai lệch builder khai báo (log PROGRESS)

| Sai lệch | Đánh giá |
|---|---|
| Sửa API.md §3.1, DATABASE.md §refresh_tokens, ARCHITECTURE.md §6 (quy tắc reuse chỉ cho token đã rotate) | **Chấp nhận.** Đúng phạm vi và đúng nội dung `reviews/phase-1-refresh-token.decision.md`; SPEC không đổi; không làm AC dễ qua hơn. Code + test khớp quy tắc (xem bảng trên). |
| `@nestjs/jwt` "pinned 11.0.2" vì bản 12 là ESM-only | **Chấp nhận.** Đã kiểm tra npm: `@nestjs/jwt@12.x` có `"type": "module"`; backend là CommonJS (Nest 11). Bản 11.0.2 hỗ trợ peer `@nestjs/common ^11`. Ghi chú nhỏ: `backend/package.json` dùng `^11.0.2` (không phải pin cứng) — vẫn không thể nhảy lên 12, lockfile khoá 11.0.2, nên không cần sửa. |

Ghi chú ngoài phạm vi (không tính lỗi): `npm audit --omit=dev` báo 4 mức high, đều nằm trong chuỗi Prisma CLI (`prisma`, `@prisma/config`, `effect`, `deepmerge-ts`), không phải package do Phase 1 thêm. `package-lock.json` thay đổi lớn là do npm sắp xếp lại vị trí cài đặt; mọi gói vẫn lấy từ `registry.npmjs.org`.

## Tóm tắt cho chủ dự án

- Phase 1 (đăng ký, đăng nhập, đăng xuất, đổi mật khẩu, trang Tài khoản) gần như hoàn chỉnh: CI xanh, đủ 17 bài test tự động, bảo mật mật khẩu và token đúng yêu cầu, các sửa tài liệu khớp quyết định của bạn.
- **Chưa đạt (FAIL)** vì một lỗi: múi giờ mặc định "Hồ Chí Minh" bị máy chủ coi là sai, nên nút "Lưu" ở mục Tuỳ chọn trong trang Tài khoản luôn báo lỗi.
- Ngoài ra có vài lỗi nhỏ: hai bài test chưa kiểm tra đủ câu chữ yêu cầu, file quyết định chưa được lưu vào Git, và cần bật `COOKIE_SECURE=true`, `TRUST_PROXY_HOPS=1` trên Railway trước khi merge.
- App đang chạy trên Railway vẫn khoẻ (database và Binance đều kết nối), đường dẫn test bị tắt đúng như yêu cầu.
