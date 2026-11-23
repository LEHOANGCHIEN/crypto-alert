# Phase 0 Recheck — Crypto Alert (`phase-0-scaffold`)

Ngày recheck: 2026-11-24 · HEAD được kiểm tra: `f4ed931` (= `origin/phase-0-scaffold`) · Căn cứ: `reviews/phase-0-review.md`, `reviews/phase-0-review.decision.md` · Chỉ đọc, không sửa code/tài liệu.

## VERDICT: PASS

Cả 7 mục Fix instructions của decision đã được làm đúng. Các sửa đổi `docs/SPEC.md` khớp từng chữ với mục 4a, không có thay đổi SPEC nào khác. Còn 3 lỗi **Minor**: tài liệu phụ chưa cập nhật theo SPEC mới. Không có Blocker hoặc Major.

---

## Issues

### 1. Minor: `frontend/CONTEXT.md:27`, `frontend/CONTEXT.md:41`, `docs/ARCHITECTURE.md:265` (§11)
Ba chỗ này vẫn ghi luật cũ. Dòng 27 của CONTEXT.md nói tiêu đề và dòng môn học "có cùng giá trị tiếng Việt trong cả hai file". ARCHITECTURE.md:265 (§11 UI guidelines) nói chúng "giữ tiếng Việt ở cả hai ngôn ngữ" và không nhắc tới nút đóng. Danh sách testid ở CONTEXT.md:41 thiếu `footer-close`, `footer-disclaimer`.
Nói đơn giản: SPEC mới nói footer tiếng Anh phải dịch hết và có nút đóng, nhưng hai tài liệu hướng dẫn builder vẫn nói ngược lại. Ở phase sau, AI có thể làm theo tài liệu cũ và đổi footer về như trước. Hiện có unit test `i18n.test.ts` chặn việc này, nên rủi ro thấp.

### 2. Minor: `docs/PROGRESS.md:180` (checklist Phase 6)
Mục "i18n sweep" vẫn ghi test AC-I18N-02 "no Vietnamese diacritics in EN **except `footer-title` and `footer-course`**". SPEC mới đã đổi thành "no exceptions".
Nói đơn giản: Đến Phase 6, builder đọc checklist này có thể viết test dễ hơn SPEC yêu cầu. Nên sửa dòng này trước khi bắt đầu Phase 6 để khỏi lặp lại vòng review.

### 3. Minor: `docs/PROGRESS.md:23` (và các dòng "Review settings" 56, 79, 99, 119, 137, 152, 171, 190)
PROGRESS vẫn mô tả quy trình review cũ: "If FAIL → paste the fix prompt from the review into a new session" và "Plan mode ON". Trong khi đó `docs/PROMPTS.md` (bảng đầu và mục c) đã đổi sang quy trình mới: review trong project Review, coordinator viết file decision, cài đặt "ask before edits".
Nói đơn giản: Hai tài liệu chỉ dẫn hai cách làm khác nhau. Bạn hoặc AI có thể làm theo bản cũ, ví dụ đi tìm "fix prompt" mà review không còn viết nữa.

---

## Kiểm tra từng mục của decision

| # | Mục | Kết quả |
|---|---|---|
| 1 | Prisma sang `dependencies` | **Đạt.** Commit `c58d1e2`: `prisma ^6.19.3` đã chuyển từ devDependencies sang dependencies. `package-lock.json` được cập nhật (bỏ `devOptional`). Đúng tiêu đề commit, là commit mới, không amend. |
| 2 | ARCHITECTURE §10 Topology + ADR-01 | **Đạt.** Commit `276ce17`, câu thay thế khớp từng chữ. ADR-01 đã đổi "serve-static" → "static file serving". Không còn chữ `serve-static` trong docs. |
| 3 | Bỏ `railway.json` | **Đạt.** Commit `e783566`: `git rm railway.json`. Không còn `railway.json`/`railway.toml`/`.railway/` trong repo. Hàng "Start" ở ARCHITECTURE §10 và mục checklist PROGRESS khớp từng chữ với decision, vẫn được tick. Root `build`/`start` đúng như mô tả. Phần cài đặt trong dashboard Railway (healthcheck, restart On Failure ×5) tôi **không xem trực tiếp được**. Log trong PROGRESS ghi đã làm. App thật vẫn chạy bằng root `npm start` (`version: 0.0.0`). |
| 4a | Sửa `docs/SPEC.md` | **Đạt, khớp từng chữ**: đổi nhãn tiêu đề VI, thêm hàng tiêu đề EN, thêm hàng "Course line" sau Disclaimer, AC-I18N-02 "(no exceptions)", AC-UI-03 mới, hàng Compliance. `git diff main...phase-0-scaffold -- docs/SPEC.md` chỉ có đúng 6 thay đổi này, không có thay đổi SPEC nào khác. |
| 4b | Code footer | **Đạt.** `Footer.tsx`: lấy chữ từ i18n (`footer.title/course/disclaimer/close`), không hard-code. Nút `data-testid="footer-close"` có `aria-label` dịch theo ngôn ngữ ("Đóng chân trang" / "Close footer"). Màu chỉ dùng class token (`text-text-muted`, `hover:bg-bg`, `hover:text-text`). Key localStorage `crypto-alert.footer-hidden` cùng kiểu với `crypto-alert.theme`/`crypto-alert.locale`. Mặc định footer hiện. |
| 4c | Test + TRACEABILITY | **Đạt.** `e2e/tests/layout.spec.ts:10–29` kiểm tra đúng chữ ở cả VI và EN, aria-label, đóng footer, reload, footer vẫn ẩn. Chưa viết test AC-I18N-02, đúng như decision yêu cầu. TRACEABILITY đổi tên test AC-UI-03, khớp tiêu đề test. Unit test `i18n.test.ts` đã cập nhật. |
| 5 | `docs/PROMPTS.md` | **Đạt.** Hai hàng của bảng đầu khớp decision. Mục c **giống hệt** khối BEGIN-C…END-C (đã so bằng `diff`). Câu cuối của KICKOFF (a) và PHASE START (b) đã đổi đúng. (Còn tài liệu khác chưa đồng bộ → Issue 3.) |
| 6 | Commit `reviews/` | **Đạt.** Commit `7b4e3e9`: 5 file review/decision đã được track. |
| 7 | Definition of Done | **Đạt.** CI: 3 run gần nhất: `45234733408` (`f4ed931` = HEAD) **success**, `45234293333` (`7b4e3e9`) success, `45234245592` (`592d7dc`) cancelled (bị run sau thay thế, không phải lỗi). Run mới nhất: tất cả các bước đều success (secrets, typecheck, lint, unit, integration, build, Playwright), có artifact `playwright-report`. PROGRESS.md:59 có log line đủ ý: model + effort, "applied reviews/phase-0-review.decision.md", danh sách thay đổi docs, commit, CI. Chưa merge, không có tag. |

### `npm run check` trên máy review
Lệnh `gh` không có trong môi trường review, nên tôi đọc CI qua GitHub API. Kết quả chạy được trên máy review: `lint` OK, `npm run test` OK (Jest backend 12/12, Vitest frontend 6/6), `secrets:check --all` OK (97 file), `tsc` của backend/frontend/e2e OK. `prisma generate` bị sandbox chặn (EPERM khi xoá file). Môi trường cũng không có Postgres nên không chạy được integration/e2e. Phần này dựa vào CI xanh ở trên. Đây không phải lỗi của dự án.

### App thật (https://web-production-49fda79f.up.railway.app), kiểm tra lúc 2026-11-23T18:48Z
| Kiểm tra | Kết quả |
|---|---|
| `GET /api/v1/health` | `success: true`, `db: "up"`, `provider: "binance"`, `connected: true`, `lastMessageAt` cách < 1 s |
| `POST /api/v1/test/reset` | **404** `{"success":false,"error":{"code":"NOT_FOUND"}}` |
| `/railway.json` | Không còn file. Trả về trang SPA (fallback), không lộ cấu hình |
| Footer VI | Tiêu đề VI chính xác · "Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư." · "Đồ án chuyên ngành — UIT" · nút đóng aria-label "Đóng chân trang" |
| Footer EN | "Building a Web Application for Cryptocurrency Market Tracking with Real-Time Technical Charts and Price Alerts" · "Information is for reference only and is not investment advice." · "Specialized Project — UIT" · aria-label "Close footer" |
| Đóng + reload | Bấm nút → footer biến mất, localStorage `crypto-alert.footer-hidden = "1"`. Reload → footer vẫn ẩn. (Sau khi kiểm tra, tôi đã xoá localStorage của trình duyệt dùng để kiểm tra.) |

### Commit
11 commit mới sau review (`c58d1e2` … `f4ed931`) đều theo Conventional Commits, tác giả là git của chủ dự án. `git log main..phase-0-scaffold --format=%B` **không có** "Co-Authored-By", "Generated with", Claude, Anthropic hay AI. Không có force-push: các commit cũ (`0697487`, `822baa0`, …) vẫn giữ nguyên hash.

---

## Tóm tắt cho chủ dự án

1. Phase 0 **đạt**: cả 7 việc trong file decision đều đã làm đúng. Sửa đổi SPEC khớp từng chữ, CI xanh ở commit mới nhất.
2. App trên Railway chạy tốt: kết nối Binance, `railway.json` đã bỏ, endpoint test bị khoá (404). Footer hiện đúng chữ tiếng Việt và tiếng Anh, nút đóng hoạt động, reload xong vẫn ẩn.
3. Tôi không xem được trang cài đặt Railway. Bạn nên tự mở deployment mới nhất trên Railway và xác nhận healthcheck `/api/v1/health` đã chạy thành công.
4. Còn 3 lỗi nhỏ về tài liệu (CONTEXT.md, ARCHITECTURE §11, PROGRESS.md vẫn ghi luật footer cũ và quy trình review cũ). Không chặn merge, nhưng nên sửa trước Phase 6.
5. Có thể chuyển sang bước merge Phase 0 và gắn tag `v0.0`.
