# Recheck — docs-review-1 (theo `docs-review-1.decision.md`)

- Ngày: 2026-11-23
- Tôi đã đọc lại toàn bộ tài liệu từ ổ đĩa sau khi được sửa: `CLAUDE.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/PROGRESS.md`, `docs/PROMPTS.md`, `backend/CONTEXT.md`, `frontend/CONTEXT.md`.
- `docs/TRACEABILITY.md` không bị sửa; tên các test cũ vẫn khớp với AC mới.
- Phạm vi: chỉ kiểm tra 17 mục trong decision, cộng với mâu thuẫn mới phát sinh do lần sửa này. Tôi không review lại phần khác.

## Kết luận: **APPROVE**

Cả 17/17 mục đều đã làm. Lần sửa này sinh ra 2 điểm lệch mới, đều ở mức MINOR, không có lỗi BLOCKER hay MAJOR. Bạn có thể bắt đầu Phase 0. Hai điểm MINOR nên sửa nhanh trước khi vào Phase 1 (cách sửa ghi ở dưới).

## Kết quả từng mục

| # | Mục | Kết quả | Vị trí (file:dòng) |
|---|---|---|---|
| 1 | Phase 0 làm tiếp ở phiên sau | DONE | PROMPTS.md:47 (dòng bảng N=0), :57 (bước 2), :59 (bước 4); PROGRESS.md:30; CLAUDE.md:85 |
| 2 | AC phụ thuộc phase sau | DONE | SPEC.md:94 (AC-AUTH-06 dùng `/account`), :95 (AC-AUTH-07 dùng `/account` → `/login`), :103 (AC-PROF-05 đã bỏ vế notification) |
| 3 | Footer và i18n | DONE | SPEC.md:192; frontend/CONTEXT.md:27, :41; ARCHITECTURE.md:265; PROGRESS.md:178 |
| 4 | Hai tab refresh cùng lúc (grace 10 s, chỉ phía server) | DONE | ARCHITECTURE.md:141; API.md:206; DATABASE.md:51 |
| 5 | Không mất thông báo khi socket nối lại (chỉ phía client) | DONE | API.md:313; ARCHITECTURE.md:105, :119 |
| 6 | `TRUST_PROXY_HOPS` | DONE | ARCHITECTURE.md:145, :246 (§10.1 = danh sách `.env.example`); API.md:204 |
| 7 | Giới hạn subscription (2 mỗi socket / 200 toàn server) | DONE | API.md:67, :68, :298; ARCHITECTURE.md:112 (đã bỏ "never reached"), :113; backend/CONTEXT.md:40; PROGRESS.md:109 |
| 8 | Cấm builder sửa SPEC | DONE | CLAUDE.md:20, :66; PROMPTS.md:61 (§b bước 6), :80 (§c bước 2) |
| 9 | Hook kiểm tra secret và `--no-verify` | DONE | PROGRESS.md:41; CLAUDE.md:66, :71 |
| 10 | Dòng SETTINGS và quy tắc gần hết quota | DONE | PROMPTS.md:52 (template), :12, :17, :49, :100; PROGRESS.md:24, :25, :103, :123, :156 |
| 11 | Migrate database test | DONE | CLAUDE.md:28; ARCHITECTURE.md:204, :211; DATABASE.md:301 |
| 12 | AC-RT-05 phát hiện mất mạng trong 5 s | DONE | ARCHITECTURE.md:119 (`offline`/`online`, `pingInterval 10000`, `pingTimeout 5000`) |
| 13 | Bỏ partial index | DONE | DATABASE.md:90, :247 (`@@index([userId, readAt])`); §3.1 (dòng 271–278) không còn `notifications_unread_idx` |
| 14 | Điều kiện bật test endpoint | DONE | ARCHITECTURE.md:198, :168 (khớp API.md:258) |
| 15 | Tiết kiệm phút CI | DONE | ARCHITECTURE.md:215 (`concurrency` + cache npm và Playwright) |
| 16 | Dời lịch | DONE | PROGRESS.md:11–19, :21. Mọi mốc dời đều +3 ngày, độ dài từng phase giữ nguyên. Phase 7 kết thúc **07/12**, phần dự phòng đến 10/12 |
| 17 | Repo public | DONE | PROMPTS.md:29; PROGRESS.md:36; ARCHITECTURE.md:320 (ADR-13); CLAUDE.md:72 (câu cảnh báo secret đúng nguyên văn). Không còn chỗ nào ghi "private repo" (chữ "private keys" ở PROGRESS.md:41 nói về khóa bí mật, không liên quan) |

## Mâu thuẫn mới do lần sửa này

### N1 — MINOR · Test "reuse detection" của Phase 1 có thể bị viết sai vì có grace window
**Vị trí:** PROGRESS.md:69 ("refresh rotation, reuse detection"); backend/CONTEXT.md:53; so với API.md:206 và DATABASE.md:51

**Vấn đề:** Trước đây, kiểu test "xoay token rồi gửi lại token cũ ngay lập tức → mọi token bị thu hồi" là đúng. Giờ đã có grace 10 s nên trường hợp đó phải **thành công**. Checklist không nói test phải tách hai trường hợp này ra.

**Hậu quả:** Builder rất dễ viết test kiểu cũ. Test đó sẽ đỏ, và builder có thể "sửa" code bằng cách bỏ grace window, tức là quay lại đúng lỗi 2 tab bị đăng xuất.

**Cách sửa** (PROGRESS.md:69, backend/CONTEXT.md:53): ghi rõ integration test gồm hai trường hợp, dùng đồng hồ giả hoặc clock có thể inject:
- Gửi lại token cũ trong vòng 10 s → nhận token mới và không token nào bị thu hồi.
- Gửi lại token cũ sau 10 s → mọi token bị thu hồi, trả `REFRESH_TOKEN_INVALID`.

### N2 — MINOR · STUCK BUG ghi cứng model trong dòng log
**Vị trí:** PROMPTS.md:114, so với PROMPTS.md:100 và PROGRESS.md:25

**Vấn đề:** Quy tắc quota mới cho phép dùng Sonnet 5.5 + Medium, nhưng bước 7 vẫn bảo ghi log "model Opus 5.5 + Extra".

**Hậu quả:** Khi bạn chạy STUCK BUG bằng Sonnet, dòng log trong PROGRESS ghi sai model, và bạn khó biết lần đó đã dùng cấu hình nào.

**Cách sửa:** Đổi thành "model + effort actually used".

## Ghi chú (không phải lỗi)
- Mục 17 khác với BRIEF: BRIEF ghi "PRIVATE GitHub repository". Đây là quyết định có chủ ý của bạn và đã được ghi lại trong ADR-13, nên tôi chấp nhận. Bạn nên thêm một dòng vào `BRIEF.md` trong project review, để các lần review code sau không báo đây là lỗi.
- Khi repo public, mọi thứ đã commit (kể cả lịch sử commit) và báo cáo Playwright trong CI đều ai cũng xem được. Các biện pháp chống lộ secret vẫn giữ nguyên, và mật khẩu demo `Demo@123456` công khai là chấp nhận được vì đây chỉ là tài khoản demo.
