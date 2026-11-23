# Review tài liệu — Crypto Alert (docs-review-1)

- Ngày: 2026-11-23
- Phạm vi: `CLAUDE.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/PROGRESS.md`, `docs/TRACEABILITY.md`, `docs/PROMPTS.md`, `backend/CONTEXT.md`, `frontend/CONTEXT.md` (Turn 1 + 2 + 3)
- Đối chiếu với: `BRIEF.md` (trọng tài) và báo cáo chọn đề tài
- Chưa có code, git, test, CI: không tính là lỗi.

## Kết luận: **REVISE**

Bộ tài liệu bám BRIEF rất sát. Đủ 9 file và đủ 7 bảng. 76 AC trong SPEC khớp 1-1 với TRACEABILITY, và mỗi AC được gán đúng một phase. Mỗi phase đều ghi model + effort trước khi bắt đầu và khi review. Git workflow, prompt ROLLBACK, các interface MarketDataProvider / NotificationChannel, i18n bằng mã lỗi, design tokens, mục "Future extensions" và quyết định triển khai ở Singapore đều đủ.

Thiết kế alert worker đạt cả 3 yêu cầu quan trọng:
- Kích hoạt một lần (one-shot): `UPDATE … WHERE status='ACTIVE'` và insert notification nằm trong một transaction.
- Không gửi trùng sau khi khởi động lại: khi boot chỉ nạp alert còn ACTIVE.
- Người dùng offline vẫn nhận được: notification nằm trong DB, lần đăng nhập sau sẽ hiện.

Tuy vậy còn **8 lỗi MAJOR**, chia 3 nhóm:
- Quy trình sẽ kẹt: Phase 0 không có prompt để làm tiếp sang phiên sau; có AC phụ thuộc vào phase sau; có 2 AC mâu thuẫn nhau; builder được tự sửa SPEC.
- Đăng nhập và thông báo: mở 2 tab có thể bị đăng xuất; thông báo bị mất khi socket kết nối lại.
- Bảo mật khi deploy: giới hạn đăng nhập phía sau proxy Railway; không giới hạn số luồng đăng ký real-time.

Tất cả đều sửa được trong tài liệu. Prompt sửa nằm ở cuối báo cáo.

Thống kê: BLOCKER 0 · MAJOR 8 · MINOR 8

---

## Lỗi MAJOR

### M1 — MAJOR · Không có prompt để làm tiếp Phase 0 ở phiên thứ hai
**Vị trí:** `docs/PROMPTS.md` §b (bảng SETTINGS dòng 41–46, bước 2 dòng 54, bước 4 dòng 56); `CLAUDE.md` dòng 82; `docs/PROGRESS.md` dòng 28

**Vấn đề:**
- Phase 0 có 19 mục, gồm cả deploy, nên gần như chắc chắn phải làm qua nhiều phiên.
- `CLAUDE.md` dặn: khi phiên dài thì "start a new session with the PHASE START PROMPT".
- Nhưng bảng SETTINGS của PHASE START không có dòng cho Phase 0.
- Bước 2 và bước 4 kiểm tra tag `v0.<N-1>`. Với N = 0, tag này là `v0.-1`, không bao giờ tồn tại, nên prompt sẽ bảo dừng lại.
- Chạy lại KICKOFF cũng không được, vì nó làm lại `git init` và tạo lại repo.

**Hậu quả:** Ngay phiên thứ hai bạn sẽ kẹt, vì không có prompt nào dùng đúng để làm tiếp Phase 0.

**Cách sửa:**
- Thêm vào bảng §b dòng: `0 scaffold (phiên sau KICKOFF) → SETTINGS: Sonnet 5.5 + Medium, Plan mode ON`.
- Ở bước 2 và 4 thêm: "N = 0: bỏ qua kiểm tra tag; nhánh `phase-0-scaffold` phải có sẵn (KICKOFF đã tạo); không bao giờ chạy lại `git init` hoặc tạo lại repo".
- `PROGRESS.md` Phase 0 ghi: "Kickoff Prompt cho phiên đầu, Phase Start Prompt (N=0) cho các phiên sau".

### M2 — MAJOR · Có AC của phase trước cần tính năng của phase sau
**Vị trí:** `docs/SPEC.md` AC-AUTH-06 (dòng 94), AC-AUTH-07 (dòng 95), AC-PROF-05 (dòng 103); `docs/PROGRESS.md` Phase 1 (dòng 61), Phase 2 (dòng 82)

**Vấn đề:**
- AC-AUTH-06 thuộc Phase 1 nhưng có bước "add a watchlist item". API watchlist đến Phase 5 mới có.
- AC-AUTH-07 thuộc Phase 1 nhưng kiểm tra "watchlist/alerts panel shows login prompt". Panel này đến Phase 2 mới dựng.
- AC-PROF-05 thuộc Phase 2 nhưng có "notification times also use UTC". Thông báo đến Phase 6 mới có.

**Hậu quả:** Test Playwright của Phase 1 và Phase 2 không thể xanh khi phase kết thúc. Khi đó hoặc phase không bao giờ "done", hoặc builder sẽ viết test nhẹ đi để cho qua.

**Cách sửa:**
- AC-AUTH-06: thay bằng "vào `/account` đổi tên hiển thị → lưu thành công mà không phải đăng nhập lại".
- AC-AUTH-07: thay vế panel bằng "mở `/account` → bị chuyển về `/login`".
- AC-PROF-05: xoá vế "notification times also use UTC" (AC-NOTIF-02 đã kiểm tra giờ của thông báo).

### M3 — MAJOR · AC-I18N-02 mâu thuẫn với AC-UI-03 (dòng chữ ở footer)
**Vị trí:** `docs/SPEC.md` AC-I18N-02 (dòng 192) và AC-UI-03 (dòng 211); `docs/ARCHITECTURE.md` §11.1 (dòng 262); `frontend/CONTEXT.md` dòng 27, 41

**Vấn đề:**
- AC-I18N-02 yêu cầu: ở chế độ tiếng Anh, không chữ nào được có dấu tiếng Việt, **trừ tên đề tài ở footer**.
- AC-UI-03 và ARCHITECTURE lại bắt footer hiện thêm dòng "Đồ án chuyên ngành — UIT" (có dấu) ở cả hai ngôn ngữ, mà dòng này không nằm trong danh sách được miễn.

**Hậu quả:** Test AC-I18N-02 chắc chắn đỏ ở Phase 7. Builder buộc phải vi phạm một trong hai AC, hoặc nới lỏng test.

**Cách sửa:**
- Sửa ngoại lệ trong AC-I18N-02 thành "trừ 2 dòng footer `footer-title` và `footer-course`".
- Thêm `footer-course` vào danh sách `data-testid` và vào ngoại lệ i18n trong `frontend/CONTEXT.md`.

### M4 — MAJOR · Mở 2 tab có thể bị đăng xuất khỏi mọi nơi (refresh token)
**Vị trí:** `docs/ARCHITECTURE.md` §6 (dòng 139–140); `docs/API.md` §3.1 `POST /auth/refresh` (dòng 199); `frontend/CONTEXT.md` dòng 12; `docs/ARCHITECTURE.md` §10.1 (dòng 235, TTL e2e = 5 s)

**Vấn đề:**
- Refresh token được xoay vòng (rotation). Nếu ai đó dùng lại một token đã bị thu hồi, server coi là bị đánh cắp và thu hồi **tất cả** token của người dùng.
- Access token nằm trong bộ nhớ riêng của từng tab, còn cookie refresh dùng chung cho mọi tab.
- "Single-flight" chỉ chống gọi trùng **trong một tab**.
- Vì vậy khi hai tab gọi `/auth/refresh` gần như cùng lúc (mở 2 tab, trình duyệt khôi phục tab, hai tab hết hạn token cùng lúc), tab chậm hơn sẽ gửi token cũ vừa bị xoay. Server tưởng bị đánh cắp và thu hồi hết.
- Lỗi tương tự xảy ra khi request refresh thành công nhưng phản hồi bị mất do mạng chập.

**Hậu quả:**
- Người dùng mở 2 tab sẽ bị văng ra ngẫu nhiên.
- Trong e2e, access token chỉ sống 5 s, nên test AC-NOTIF-05 (2 tab) sẽ lúc xanh lúc đỏ.

**Cách sửa:**
- Phía client: bọc mọi lần gọi refresh bằng `navigator.locks.request('auth-refresh', …)`, để các tab lần lượt refresh, không bao giờ gửi cùng một cookie đồng thời.
- Phía server: token vừa bị xoay trong vòng 10 s mà được gửi lại thì **không** coi là dùng lại. Server cấp token mới và không thu hồi các token khác. Không cần đổi schema (dùng `revoked_at` và `replaced_by_id`).
- Bổ sung vào AC-AUTH-06 một bước kiểm tra 2 tab refresh cùng lúc.

### M5 — MAJOR · Thông báo bị mất khi socket kết nối lại (người dùng đang online)
**Vị trí:** `docs/API.md` §4.1 (dòng 285), §4.3 "Frontend reactions" (dòng 308); `docs/ARCHITECTURE.md` §4 "Client side" (dòng 117), §6 "Socket auth" (dòng 142)

**Vấn đề:**
- Socket phải kết nối lại sau mỗi lần login hoặc refresh token, và sau mỗi lần rớt mạng.
- `notification:new` chỉ đến được socket nào đang ở trong phòng `user:{id}` đúng lúc phát. Socket.IO không giữ lại tin đã phát.
- Khi kết nối lại, client chỉ tải lại nến; không tải lại notifications hay alerts.

**Hậu quả:**
- Nếu cảnh báo kích hoạt đúng lúc socket đang nối lại, người dùng đang mở web sẽ không thấy toast, chuông không tăng, alert vẫn nằm ở mục "Active" cho đến khi tải lại trang.
- Điều này trái với yêu cầu của BRIEF: "push it in real time to the user if online".

**Cách sửa:**
- Mỗi lần socket `connect` (lần đầu và mọi lần nối lại), client đã đăng nhập phải invalidate `['notifications']` và `['alerts']`.
- Với notification chưa đọc mà tab này chưa từng hiện, client hiện toast giống như khi nhận `notification:new`.
- Bổ sung vào AC-RT-05: "alert kích hoạt trong lúc offline → có toast và chuông +1 trong vòng 5 s sau khi online lại".

### M6 — MAJOR · Giới hạn đăng nhập "theo IP" sẽ thành giới hạn chung cho cả website trên Railway
**Vị trí:** `docs/ARCHITECTURE.md` §6 "Rate limit" (dòng 143), §10.1; `docs/API.md` §3.1 (dòng 203)

**Vấn đề:**
- Trên Railway, mọi request đi qua proxy. Nếu không bật `trust proxy`, backend thấy mọi người dùng có cùng một IP (IP của proxy).
- Tài liệu không nhắc gì đến việc này.

**Hậu quả:**
- Ở bản deploy, giới hạn 10 lần/phút áp cho **cả website**. Chỉ cần ai đó gõ sai mật khẩu vài lần, hoặc cố tình spam, là mọi người (kể cả giảng viên lúc chấm) bị báo `RATE_LIMITED` trong 1 phút.
- Ngược lại, nếu tin header `X-Forwarded-For` mà không giới hạn, kẻ tấn công có thể giả IP để né giới hạn.

**Cách sửa:**
- Thêm biến môi trường `TRUST_PROXY_HOPS` (mặc định `0`; đặt `1` trên Railway).
- Backend đặt Express `trust proxy` bằng giá trị này, và throttler đếm theo `req.ip`.
- Ghi biến này vào §10.1 và `.env.example`.

### M7 — MAJOR · Không giới hạn số luồng real-time mà một client được đăng ký
**Vị trí:** `docs/ARCHITECTURE.md` §4 "Subscribe" (dòng 111); `docs/API.md` §4.2 (dòng 295); `backend/CONTEXT.md` "Real-time & worker"

**Vấn đề:**
- Không có giới hạn số `kline:subscribe` cho mỗi socket, cũng không có giới hạn tổng số luồng gửi lên Binance.
- ARCHITECTURE ghi "Max 1024 streams/connection (never reached)". Nhận định này sai: một script vài dòng có thể đăng ký khoảng 400 cặp USDT × 6 khung thời gian ≈ 2400 luồng.

**Hậu quả:**
- Kết nối duy nhất tới Binance sẽ bị lỗi khi vượt 1024 luồng, hoặc bị nghẽn vì hàng đợi SUBSCRIBE (tối đa 4 tin/giây) dồn tới hàng chục phút.
- Khi đó biểu đồ **và cảnh báo giá** của mọi người dùng ngừng cập nhật. Bất kỳ ai có link demo đều phá được.

**Cách sửa:**
- Mỗi socket giữ tối đa 2 kline subscription. Đăng ký thêm thì ack lỗi mã mới `SUBSCRIPTION_LIMIT_REACHED`.
- Mỗi socket gửi tối đa 10 event / 10 s; vượt thì trả `RATE_LIMITED`.
- Toàn server tối đa 200 luồng kline; vượt thì trả `MARKET_DATA_UNAVAILABLE`.
- Bỏ chữ "never reached" trong ARCHITECTURE. Thêm unit test cho các giới hạn này vào Phase 3.

### M8 — MAJOR · Builder được tự sửa SPEC (thước đo duy nhất của bạn)
**Vị trí:** `CLAUDE.md` dòng 20; `docs/PROMPTS.md` §b bước 6 (dòng 58), §c bước 2 (dòng 77)

**Vấn đề:**
- Builder được phép "fix the doc in the same commit" với **mọi** tài liệu, kể cả `SPEC.md`.
- Prompt review không kiểm tra riêng các thay đổi trong `docs/`.

**Hậu quả:**
- Bạn không đọc được code, nên các AC trong SPEC là thước đo duy nhất.
- Nếu builder sửa AC cho dễ qua (ví dụ đổi "within 5 s" thành "within 30 s", hoặc bỏ bớt một bước), test vẫn xanh. Review khi đó so code với SPEC đã bị sửa, nên vẫn ra PASS, dù tính năng thật không đạt BRIEF.

**Cách sửa:**
- `CLAUDE.md` thêm MUST NOT: không sửa `docs/SPEC.md` (các bước, ngưỡng, phạm vi, ID của AC). Nếu thấy AC sai hoặc không làm được thì dừng lại, giải thích bằng tiếng Việt và chờ bạn.
- Builder chỉ được sửa API/DATABASE/ARCHITECTURE khi cần gỡ mâu thuẫn, và phải ghi lại thay đổi đó trong dòng log.
- Prompt review (§c bước 2) thêm lệnh `git diff main...phase-<N>-<name> -- docs CLAUDE.md backend/CONTEXT.md frontend/CONTEXT.md`. Mọi thay đổi SPEC, hoặc thay đổi làm AC dễ qua hơn, tính là Major.

---

## Lỗi MINOR (không bắt buộc sửa ngay, nhưng nên sửa trong cùng lượt)

### m1 — MINOR · Hook kiểm tra secret chặn nhầm file hợp lệ
**Vị trí:** `docs/PROGRESS.md` dòng 39

**Vấn đề:**
- Hook "blocks staged `.env*`" sẽ chặn luôn `.env.example`, mà file này bắt buộc phải commit.
- Luật "long random secrets" sẽ bắt nhầm các mã hash `integrity` trong `package-lock.json` và dữ liệu fixture.

**Hậu quả:** Commit hợp lệ bị chặn, và builder dễ lách bằng `--no-verify`.

**Cách sửa:**
- Ghi rõ ngoại lệ: `.env.example`, `package-lock.json`, `**/fixtures/**`.
- `CLAUDE.md` thêm: cấm dùng `--no-verify`.

### m2 — MINOR · Dòng SETTINGS bị lặp và thiếu quy tắc khi gần hết quota
**Vị trí:** `docs/PROMPTS.md` dòng 45–49, 12, 98; `docs/PROGRESS.md` dòng 22–23

**Vấn đề:**
- Copy một dòng từ bảng vào template sẽ ra "Plan mode ON, Plan mode ON".
- BRIEF yêu cầu: gần hết quota tuần thì **mọi** phiên dùng Sonnet + Medium, chỉ trừ phiên review. Nhưng STUCK BUG vẫn luôn ghi Opus + Extra.

**Cách sửa:**
- Template đổi thành `SETTINGS: <dán dòng SETTINGS của phase N>`.
- Thêm "(gần hết quota → Sonnet 5.5 + Medium)" vào STUCK BUG, và vào quy tắc usage trong PROGRESS.

### m3 — MINOR · Database test không được migrate khi chạy ở máy local
**Vị trí:** `CLAUDE.md` dòng 25–27; `docs/ARCHITECTURE.md` §8 (dòng 202); `docs/DATABASE.md` §5 (dòng 301)

**Vấn đề:** `npm run db:migrate` chỉ migrate database dev. Không chỗ nào migrate `crypto_alert_test` khi chạy local.

**Hậu quả:** `npm run check` chạy lần đầu sẽ đỏ.

**Cách sửa:** Script integration test và Playwright `webServer` chạy `prisma migrate deploy` với `DATABASE_URL` của database test trước khi chạy.

### m4 — MINOR · AC-RT-05 khó đạt mốc 5 s
**Vị trí:** `docs/SPEC.md` dòng 135; `docs/ARCHITECTURE.md` dòng 117

**Vấn đề:**
- `setOffline` của Playwright chưa chắc đóng được WebSocket đang mở.
- Socket.IO mặc định chỉ nhận ra mất kết nối sau khoảng 45 s (pingInterval + pingTimeout).

**Hậu quả:** Banner "Reconnecting…" khó xuất hiện trong 5 s như AC yêu cầu.

**Cách sửa:**
- Client nghe sự kiện `offline`/`online` của `window`: hiện banner, gọi `socket.disconnect()` khi offline và `connect()` khi online.
- Server đặt `pingInterval: 10000, pingTimeout: 5000`.

### m5 — MINOR · Partial index sẽ bị Prisma tự xoá
**Vị trí:** `docs/DATABASE.md` §3.1 (dòng 277), §5 (dòng 298)

**Vấn đề:** Prisma không biết `notifications_unread_idx` (index tạo bằng SQL tay), nên lần `migrate dev` sau sẽ tự sinh lệnh `DROP INDEX`.

**Cách sửa:**
- Ghi vào §5: "khi tạo migration mới, xoá dòng `DROP INDEX "notifications_unread_idx"` trong file SQL được sinh ra".
- Hoặc bỏ hẳn index này (ở quy mô đồ án thì không cần).

### m6 — MINOR · Điều kiện bật test endpoint không khớp giữa hai file
**Vị trí:** `docs/ARCHITECTURE.md` §8 (dòng 196) và `docs/API.md` §3.8 (dòng 255)

**Vấn đề:** API yêu cầu cả `ENABLE_TEST_ENDPOINTS=true` **và** `MARKET_DATA_PROVIDER=mock`. ARCHITECTURE chỉ ghi điều kiện đầu.

**Cách sửa:** Sửa ARCHITECTURE cho khớp với API.

### m7 — MINOR · Có thể hết phút chạy CI miễn phí (repo private)
**Vị trí:** `docs/ARCHITECTURE.md` §9 (dòng 213); `CLAUDE.md` dòng 68

**Vấn đề:**
- Quy tắc là push sau mỗi mục checklist, ước tính trên 100 lần push, mỗi lần CI chạy khoảng 10 phút.
- GitHub Free cho repo private chỉ có 2000 phút/tháng.

**Hậu quả:** Có thể chạm trần. Khi đó CI ngừng chạy, và không phase nào được tính là "done".

**Cách sửa:**
- CI thêm `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`, cache npm và trình duyệt Playwright.
- Bạn nên kích hoạt GitHub Student Developer Pack (được 3000 phút) hoặc theo dõi trang Billing.

### m8 — MINOR · AC-PROF-04 mô tả sai hành vi thật
**Vị trí:** `docs/SPEC.md` dòng 102; `docs/ARCHITECTURE.md` dòng 138, 141

**Vấn đề:**
- Đổi mật khẩu chỉ thu hồi refresh token. Access token của trình duyệt B vẫn còn hiệu lực tới 15 phút.
- Vì vậy câu "B bị đăng xuất ở thao tác tiếp theo" chỉ đúng trong e2e (TTL 5 s), không đúng ở bản thật.

**Cách sửa:** Viết lại thành "B bị đăng xuất muộn nhất khi access token hết hạn (≤ 15 phút; e2e: 5 s)".

---

## Ghi chú (không phải lỗi)
- Ngày mục tiêu trong `PROGRESS.md` đã trễ: Phase 0 ghi 21–22/11, hôm nay là 23/11. BRIEF không bắt buộc ghi ngày nên tôi không tính là lỗi, nhưng bạn nên dời lịch.

---

## Prompt sửa (dán vào project viết tài liệu)

```text
Revise the Crypto Alert docs. Fix ONLY the items below and change nothing else. Write back only the affected files (docs/SPEC.md, docs/ARCHITECTURE.md, docs/API.md, docs/DATABASE.md, docs/PROMPTS.md, docs/PROGRESS.md, CLAUDE.md, backend/CONTEXT.md, frontend/CONTEXT.md, and docs/TRACEABILITY.md only if an AC title changes). Keep all AC IDs and the total of 76 ACs. Keep CLAUDE.md under ~100 lines.

1. Phase 0 continuation (PROMPTS.md §b, PROGRESS.md Phase 0, CLAUDE.md "Session hygiene"):
   - Add a row to the PHASE START settings table: "0 scaffold (any session after KICKOFF) | SETTINGS: Sonnet 5.5 + Medium, Plan mode ON".
   - Change the template's first line to "SETTINGS: <paste the SETTINGS line for phase N from the table above>" (no second "Plan mode ON").
   - In steps 2 and 4 add: "If N = 0: skip the v0.<N-1> tag check; branch phase-0-scaffold must already exist (created by KICKOFF); never run git init or create the GitHub repo again."
   - PROGRESS.md Phase 0 header: "prompt: Kickoff Prompt (first session), then Phase Start Prompt with N=0 for later sessions".

2. ACs that depend on later phases (SPEC.md):
   - AC-AUTH-06: replace "add a watchlist item → succeeds without re-login" with "on /account change the display name and save → succeeds without re-login (silent refresh)".
   - AC-AUTH-07: replace "watchlist/alerts panel shows login prompt" with "opening /account redirects to /login".
   - AC-PROF-05: delete "notification times also use UTC" (AC-NOTIF-02 already covers notification times in the user timezone).

3. Footer vs i18n contradiction: in AC-I18N-02 change the exception to "except the two footer lines with data-testid footer-title and footer-course (the official title and 'Đồ án chuyên ngành — UIT', shown in Vietnamese in both languages)". Add footer-course to the data-testid list in frontend/CONTEXT.md, extend its i18n exception to this line, and mention it in the ARCHITECTURE.md §11.1 footer row.

4. Multi-tab refresh race (ARCHITECTURE.md §6, API.md §3.1, DATABASE.md refresh_tokens notes, frontend/CONTEXT.md "API & errors"):
   - Client: every POST /auth/refresh (app start and 401 retry) runs inside navigator.locks.request('auth-refresh', ...), so tabs of the same browser never send the same refresh cookie concurrently.
   - Server: a refresh token that was rotated less than 10 seconds ago and is presented again is NOT treated as reuse; issue a new refresh token + access token for that user without revoking others. Reuse detection (revoke all) applies only after this grace window. Uses existing revoked_at / replaced_by_id; no schema change.
   - Extend AC-AUTH-06 with: "Two tabs of the same browser context, after the access token expired, perform an authenticated action at the same moment → both succeed and neither tab is logged out."

5. Missed notifications after socket reconnect (API.md §4.1 and §4.3, ARCHITECTURE.md §3.4 and §4 "Client side"):
   - On every socket 'connect' (first connect and every reconnect, including after login/token refresh) a logged-in client invalidates ['notifications'] and ['alerts']; for unread notifications newer than the newest one already shown in this tab it shows the same toast as notification:new and updates the bell.
   - Add to AC-RT-05: "Logged-in user: an alert that triggers while the browser is offline shows its toast and bell +1 within 5 s after going back online, without reload."

6. Rate limit behind Railway's proxy (ARCHITECTURE.md §6 and §10.1, API.md §3.1):
   - Add env var TRUST_PROXY_HOPS (default 0; set 1 on Railway). The backend sets Express 'trust proxy' to this value so req.ip is the real client IP; the throttler keys on req.ip. With 0, X-Forwarded-For is never trusted. Add it to the .env.example list.

7. Socket subscription limits (API.md §1.2 and §4.2, ARCHITECTURE.md §4, backend/CONTEXT.md "Real-time & worker", PROGRESS.md Phase 3):
   - Each socket may hold at most 2 kline subscriptions; a further kline:subscribe gets ack error SUBSCRIPTION_LIMIT_REACHED (add to the error-code table as socket-only). Client→server socket events are limited to 10 per 10 s per socket (ack error RATE_LIMITED). Global cap: at most 200 upstream kline streams; beyond that kline:subscribe gets MARKET_DATA_UNAVAILABLE.
   - Remove "(never reached)" from ARCHITECTURE.md §4. Add a Phase 3 checklist item: unit tests for these limits.

8. Protect the acceptance criteria (CLAUDE.md conflict line and MUST NOT list, PROMPTS.md §b step 6, §c step 2):
   - Claude Code MUST NOT edit docs/SPEC.md (AC steps, thresholds, scope, IDs). If an AC looks wrong or impossible, it stops, explains in simple Vietnamese and waits for the owner. It may edit API.md / DATABASE.md / ARCHITECTURE.md only to resolve a contradiction, and must list every doc change in the PROGRESS.md log line.
   - Phase Review Prompt step 2: also run "git diff main...phase-<N>-<name> -- docs CLAUDE.md backend/CONTEXT.md frontend/CONTEXT.md"; any change to SPEC.md, or any contract change that makes an AC easier to pass, is a Major issue.

At the end, list in Vietnamese (3–5 lines) which files you changed.
```
