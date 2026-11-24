# Phase 1 — Recheck (Auth & account)

Ngày: 2026-11-24 · Nhánh: `phase-1-auth` · Commit mới nhất: `02f8a20` (6 commit mới kể từ `c3758c7`) · Người review: Review project (chỉ đọc)

## VERDICT: PASS

Không có Blocker hay Major. Cả 7 mục trong Fix instructions của `reviews/phase-1-review.decision.md` đã được làm đúng; còn 1 lỗi Minor về dòng log trong PROGRESS.

## Đối chiếu từng mục của decision

| # | Mục | Kết quả | Bằng chứng |
|---|---|---|---|
| 1a | `isValidTimezone` dùng `Intl.DateTimeFormat`, string 1..64 | ✅ Đúng | `backend/src/common/validators.ts:43-51`. Không còn `Intl.supportedValuesOf` nào trong `backend/src`. Tôi tự chạy cùng hàm trên Node 22.23.5: `Asia/Ho_Chi_Minh` → true, `Asia/Saigon` → true, `UTC` → true, `Mars/Base` → false, `''` → false, chuỗi 65 ký tự → false. (Cũng xác nhận lại `Intl.supportedValuesOf('timeZone')` không chứa `Asia/Ho_Chi_Minh` — đúng là nguyên nhân lỗi cũ.) |
| 1b | Ô chọn múi giờ luôn chứa giá trị hiện tại, `Asia/Ho_Chi_Minh`, `UTC`; sắp xếp, bỏ trùng | ✅ Đúng | `frontend/src/features/account/AccountPage.tsx:14-15,144` (`new Set([...])` + `.sort()`, truyền `draft.timezone`). |
| 1c | API.md §1.3 dòng `INVALID_TIMEZONE` | ✅ Khớp từng chữ với decision | `docs/API.md:83`. Đây là thay đổi docs duy nhất ngoài PROGRESS. **`docs/SPEC.md`, `DATABASE.md`, `ARCHITECTURE.md`, `TRACEABILITY.md`, `CLAUDE.md` không đổi** (`git diff c3758c7..HEAD` rỗng cho các file này). |
| 1d | Unit test + 3 integration test | ✅ Đủ | `backend/src/common/validators.spec.ts` (6 ca yêu cầu + thêm `42`, `undefined`); `backend/test/integration/auth.int-spec.ts:183-188`: `{timezone:'Asia/Ho_Chi_Minh'}` → 200; `{locale:'en',theme:'light',timezone:'Asia/Ho_Chi_Minh'}` → 200 và trả đúng 3 giá trị; `{timezone:'Mars/Base'}` → 400 `VALIDATION_ERROR` + `[{field:'timezone',code:'INVALID_TIMEZONE'}]`. Không thêm test Playwright, không đổi AC ID. |
| 2 | AC-AUTH-03: lỗi hiện trước submit | ✅ Đúng, test mạnh hơn | `e2e/tests/auth.spec.ts:33-36`: sau khi điền các ô (điền ô kế tiếp = rời ô trước; `useForm` hiện lỗi khi blur), kiểm tra `error-email` = "Email không hợp lệ." và `error-password` = "Mật khẩu phải có ít nhất một chữ cái và một chữ số." (khớp `vi.json`), và `registerCalls === 0` — **trước** khi bấm submit. Toàn bộ assertion cũ sau submit và kiểm tra API trực tiếp vẫn giữ nguyên (diff chỉ có dòng `+`). |
| 3 | AC-AUTH-07: kiểm cả nút Đăng ký | ✅ Đúng, test mạnh hơn | `e2e/tests/auth.spec.ts:108-109`: kiểm link "Đăng nhập" và "Đăng ký" (khớp `vi.json` `nav.login`/`nav.register`, Header render bằng `<Link>`). Không dòng cũ nào bị xoá. |
| 4 | Chuyển store/error text sang `shared/` | ✅ Đúng | Git ghi nhận rename: `features/auth/auth.store.ts` → `shared/auth/auth.store.ts`, `features/auth/messages.ts` → `shared/i18n/errorText.ts`; chỉ đổi đường dẫn import, tên export giữ nguyên, không đổi logic. Đã quét toàn bộ import trong `frontend/src/features` và `frontend/src/shared`: **không còn feature nào import nội bộ của feature khác**, `shared/` không import `features/`. Không còn import nào trỏ tới đường dẫn cũ. |
| 5 | Biến Railway `COOKIE_SECURE=true`, `TRUST_PROXY_HOPS=1` | ✅ Chấp nhận theo log | Tôi **không xem được** biến trên Railway; chấp nhận dòng log của builder trong `docs/PROGRESS.md:84` ("Railway vars set on web: COOKIE_SECURE, TRUST_PROXY_HOPS"). Không có thay đổi code/docs cho mục này (đúng yêu cầu). |
| 6 | Commit `reviews/` | ✅ Đúng | Commit `bf08aa3` thêm `phase-1-review.md`, `phase-1-review.decision.md`, `phase-1-refresh-token.decision.md`. Working tree sạch. |
| 7 | DoD: check, push, CI, PROGRESS | ✅ (1 Minor ở log) | CI run `45382300129` cho commit mới nhất `02f8a20`: **success**, mọi bước xanh (secrets `--all`, typecheck, lint, unit, integration, build, e2e). Run `45382254984` của `bf08aa3` bị **cancelled** do push tiếp đè lên (bình thường). Nhánh local = `origin/phase-1-auth`. Chưa merge (đúng). |

### Kiểm tra thêm
- **`npm run check` trên máy review:** typecheck ✅ (frontend, e2e qua npm; backend chạy `tsc -p tsconfig.check.json` trực tiếp vì `prisma generate` không ghi được vào `node_modules` trong môi trường chỉ-đọc), lint ✅, unit ✅ (Jest 3 suites / 20 test — gồm `validators.spec.ts` mới; Vitest 4 file / 16 test). **Integration và Playwright không chạy được** (máy review không có Docker/Postgres) → dựa vào CI xanh ở trên.
- **Test có bị làm yếu không:** không. Diff của `e2e/tests/auth.spec.ts` và `auth.int-spec.ts` chỉ có dòng thêm; không có `skip`/`only`/`fixme` mới.
- **App live** (vẫn là code Phase 0): `GET /api/v1/health` → 200, `db: up`, `provider: binance`, `connected: true`. `POST /api/v1/test/reset` → **404 `NOT_FOUND`**. ✅
- **Commit message:** 6 commit mới đều theo Conventional Commits, đúng tên decision yêu cầu, **không** có `Co-Authored-By`, "Generated with", hay nhắc Claude/AI. ✅

## Issues

1. **MINOR** — `docs/PROGRESS.md:84` — Dòng log thiếu mã CI run (ghi "CI run: see next commit's run") và gọi `bf08aa3` là "Last code commit" trong khi đó là commit tài liệu (commit code cuối là `dc836fa`, commit cuối của nhánh là `02f8a20`). Decision mục 7 yêu cầu ghi hash commit cuối và CI run; nên bổ sung "CI green (run 45382300129, commit 02f8a20)" ở lần cập nhật PROGRESS kế tiếp (ví dụ khi ghi log merge Phase 1), không cần sửa lịch sử.

## Tóm tắt cho chủ dự án

- **Phase 1 đã ĐẠT (PASS).** Lỗi lớn lần trước (múi giờ "Hồ Chí Minh" bị máy chủ từ chối nên không lưu được Tuỳ chọn) đã được sửa và có test chứng minh; tôi cũng tự chạy thử và thấy đúng.
- Hai bài test AC-AUTH-03 và AC-AUTH-07 đã được làm chặt hơn, không bài test nào bị nới lỏng; CI trên GitHub xanh toàn bộ; SPEC không bị sửa.
- Code giao diện đã được sắp xếp lại đúng quy ước (phần dùng chung nằm ở `shared/`), các file review/decision đã lưu vào Git.
- Còn 1 lỗi nhỏ: dòng nhật ký trong PROGRESS chưa ghi mã lần chạy CI — bổ sung ở lần cập nhật sau là được. Việc đặt 2 biến bảo mật trên Railway tôi không tự kiểm được, chỉ dựa vào nhật ký của builder; bạn có thể tự mở Railway → service `web` → Variables để xem lại trước khi merge.
