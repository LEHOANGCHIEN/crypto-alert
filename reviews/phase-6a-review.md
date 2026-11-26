# Phase 6a Review — UI redesign (`phase-6a-ui-redesign`)

Ngày: 2026-11-26 · Người review: reviewer độc lập (Opus 5.5 + High) · Commit được review: `92f6a98` (HEAD = `origin/phase-6a-ui-redesign`, working tree sạch)

VERDICT: **PASS**

Không có lỗi Blocker hay Major. Có 4 lỗi Minor bên dưới, coordinator có thể cho sửa trong decision file hoặc để Phase 7.

---

## Issues

1. **Minor** · `frontend/src/app/layout/Header.tsx:63` (nút "Đăng ký") và `frontend/src/features/market/MarketList.tsx:125` (link "Đăng nhập" trong tab Watchlist của khách)
   - Lỗi: hai chỗ này dùng `text-white`, là màu mặc định của Tailwind chứ không phải token (vi phạm hard rule 6 trong CLAUDE.md). Ở theme tối, chữ trắng trên `--color-accent` #3B82F6 chỉ đạt **3,68:1**, thấp hơn mức ≥ 4,5:1 mà SPEC §6 yêu cầu. Các nút chính khác đều dùng `text-bg` (đạt 5,26:1 ở theme tối, 4,86:1 ở theme sáng).
   - Giải thích đơn giản: chữ trên hai nút xanh này hơi khó đọc ở theme tối, và màu chữ không lấy từ bảng màu chung của dự án.
   - Cách sửa: thay `text-white` bằng `text-bg` ở cả hai dòng.

2. **Minor** · `frontend/CONTEXT.md`, mục "Testing hooks" (dòng Phase 6a)
   - Lỗi: testid mới `panel-expand-left|right` (nút mở lại trên rail, được test AC-UI-06 dùng) không có trong danh sách. Decision §3.5 yêu cầu liệt kê **mọi** testid mới.
   - Giải thích đơn giản: tài liệu cho người viết code còn thiếu tên một nút mà test đang dùng.
   - Cách sửa: thêm `panel-expand-left|right` vào sau `panel-rail-left|right`.

3. **Minor** · `frontend/src/app/layout/PulseBar.tsx:29` (`overflow-hidden`)
   - Lỗi: thanh market pulse không cuộn được và không co lại. Tôi đo trên bản build của nhánh này: ở **1024 px**, XRP/USDT bị cắt một nửa và DOGE/USDT bị ẩn hẳn. Từ 1280 px trở lên thì cả 6 cặp hiện đủ. AC-UI-07 yêu cầu hiện đủ 6 cặp và chỉ cho ẩn thanh này khi màn hình dưới 1024 px. Test chỉ chạy ở 1440 px nên không bắt được lỗi này. Với giá Binance thật (số dài hơn dữ liệu mock), phần bị cắt có thể còn rộng hơn.
   - Giải thích đơn giản: trên màn hình laptop nhỏ (1024–1200 px), người dùng không thấy giá DOGE (và một phần XRP) trên thanh pulse.
   - Cách sửa: dùng `overflow-x-auto` (ẩn thanh cuộn) thay cho `overflow-hidden`, hoặc ẩn nhãn "Nhịp thị trường" và giảm `gap-6` xuống `gap-4` dưới `xl`. Thêm vào test AC-UI-07 một bước kiểm tra ở 1024×768 rằng cả 6 `pulse-item-*` đều nằm trọn trong `pulse-bar`.

4. **Minor** · `e2e/tests/chart.spec.ts`, test `AC-CHART-09` (`chart-change` và phần "unknown → no name")
   - Lỗi: giá trị `chart-change` (% thay đổi 24h) chỉ được kiểm bằng regex `/^[+−]\d+,\d{2}%$/`, không so với ticker. Phần "unknown → no name" của AC chỉ có unit test (`coin-names.test.ts`), e2e không kiểm vì mock không có cặp USDT nào nằm ngoài bảng tên. Code hiện tại vẫn đúng: tôi kiểm tra bằng mắt thấy "+1,87%" khớp ticker BTC.
   - Giải thích đơn giản: test xác nhận ô "% thay đổi" có định dạng đúng nhưng chưa xác nhận con số đúng.
   - Cách sửa: thay regex bằng `toHaveText(<% định dạng vi từ tk.priceChangePercent>)`, giống cách test đang làm với `chart-change-abs`. Phần "unknown → no name" có thể giữ ở unit test, nhưng nên ghi rõ trong cột Notes của TRACEABILITY rằng e2e không kiểm được vì fixture.

---

## Đã kiểm tra (không có lỗi)

**Tài liệu và phạm vi**
- `docs/SPEC.md` chỉ đổi trong commit đầu `cc47b4e`. So từng dòng bằng script: §1 Out of scope, A10, bảng Routes và cả 19 AC (11 AC của 6a và 8 AC của 6b) khớp đúng từng chữ với decision §3.1/§5/§6. Không có thay đổi ngoài §3.
- ARCHITECTURE §11/§11.1/§11.2/§11.3/ADR-14, PROGRESS (6a/6b, ngày Phase 7 dời +2, "All ACs passing (93)"), TRACEABILITY và CONTEXT đều theo decision §3 (riêng CONTEXT xem Issue 2).
- API.md, DATABASE.md, backend và migrations **không đổi**, không có `db push`.
- TRACEABILITY: 93 AC, 83 passing, 10 pending. Bộ tiêu đề test Playwright trùng đúng với các dòng passing (83 = 83), mỗi AC đúng một test, không có `test.skip/only/fixme`.

**CI và chạy local**
- CI: run `45693194866` trên `92f6a98` (HEAD) = **success**. Run `45690976324` trên `a159bac` bị fail ở e2e (flaky), đã sửa ở `01f8591`/`f2a185a`. Run `45692278705` trên `f2a185a` = success. `retries: 0` nên CI xanh không phải nhờ chạy lại.
- `npm run check`: máy của bạn không có Docker/Postgres, và `prisma generate` bị chặn (không có quyền xoá file), nên tôi không chạy đủ ở đó; chỉ chạy được typecheck, lint, unit, đều xanh. Tôi chạy đầy đủ trên một bản clone sạch của nhánh, dùng Postgres 16 local: typecheck ✓, lint ✓, unit BE 107 ✓ / FE 106 ✓, integration 90 ✓, **Playwright 83/83 ✓**. Chromium chạy bản 1243 thay cho 1255 do không tải được trình duyệt. `secrets:check --all` OK (318 file).

**Live app (v0.6)**
- `GET /api/v1/health`: `db: "up"`, `provider: "binance"`, `connected: true`. `version "0.0.0"` đã được hoãn sang Phase 7.
- `POST /api/v1/test/reset` → **404**.

**Commit**
- 15 commit, tất cả theo Conventional Commits, tác giả là danh tính git của chủ dự án.
- Không commit nào chứa "Co-Authored-By" hay "Generated with", hoặc nhắc tới Claude/AI.
- Script ở root và các workspace (dotenv-cli v11 `dotenv -e … --`, concurrently, prisma, playwright) có cú pháp hợp lệ. Phase này chỉ thêm `@fontsource/roboto-mono` (OFL).

**Từng AC của Phase 6a (test có kiểm đúng nội dung SPEC không)**
- AC-MKT-01: kiểm hàng 48 px; dòng cặp nằm trên dòng volume; giá nằm trên % thay đổi; base in đậm, `/USDT` dùng màu faint; 4 nhãn cột; lọc non-USDT; thứ tự theo volume. Test mới chặt hơn bản cũ.
- AC-MKT-07: kiểm tab All/Watchlist; search lọc trong tab; khách thấy prompt và link `/login`.
- AC-UI-01: cột 240/320; header 56, pulse 32, status 28; các phần nằm đúng thứ tự.
- AC-UI-05: kiểm kéo ±2 px; canvas vẽ lại; **không gọi lại `/market/klines`**; reload giữ độ rộng; giới hạn 180–480 / 260–520; phím ←/→ đổi 16 px; double-click về mặc định.
- AC-UI-06: panel thu gọn có `display:none` (không nhận Tab); rail ≤ 24 px; mở lại đúng độ rộng cũ; kéo dưới mức tối thiểu thì thu gọn; reload giữ trạng thái; ở 390 px không bị ảnh hưởng.
- AC-UI-07: kiểm thứ tự, định dạng, màu, cập nhật tick trong 2 s, link giữ `?tf=`, ẩn dưới 1024 px (xem Issue 3).
- AC-UI-08: "Đã kết nối"/"Connected"; dot màu accent, không phải up/down; offline → "Reconnecting…" trong 5 s; delayed; mốc cập nhật cuối; đồng hồ theo múi giờ của khách và của user.
- AC-CHART-07: 4 kiểu biểu đồ đã dịch; màu up/down cho nến/thanh, accent cho line/area; giá trị close; MA và legend; cập nhật live; đổi timeframe; reload giữ kiểu.
- AC-CHART-08: số cột volume = số nến; scale top 0.8; vẫn 1 pane; màu cột theo hướng nến; "Vol" khi hover và khi không hover; bật/tắt và giữ sau reload.
- AC-CHART-09: xem Issue 4.
- AC-CHART-10: tên file đúng mẫu và là PNG thật; maximize phủ đúng 0,0,1440,900 và nằm trên mọi panel; Esc và nút đều khôi phục; độ rộng cột không đổi.

**Đánh giá các điểm builder tự khai lệch decision**
- `--color-text-faint` dark #7D8997 (thay cho #697685): **chấp nhận**. Tôi tự tính lại: #697685 chỉ đạt 3,54–4,17:1 trên các nền tối, còn #7D8997 đạt 4,60–5,43:1, đúng yêu cầu SPEC §6. Thay đổi đã ghi ở ARCHITECTURE §11.2 và log. Màu light #5F6877 đạt 4,62–5,63:1. Coordinator chỉ cần ghi nhận.
- AC-CHART-08 chứng minh cập nhật live bằng tick (đổi màu cột) cộng close-candle (thêm cột mới, volume 0): **chấp nhận**. API.md mô tả `POST /test/market/tick` không đổi volume. Tôi đã kiểm code: `applyKline` thay cả nến, và `VolumeLayer.update` lấy `k.volume` của nến mới, nên với Binance thật volume vẫn cập nhật live.
- Chờ `data-live` trong AC-CHART-07/09 và AC-UI-07/08: **không làm yếu test**. Bước chờ chỉ để biết subscription đã được xác nhận; mốc 2 s vẫn tính từ lúc đẩy tick.
- Test theme/market đổi sang giá trị token mới: **không làm yếu test**. Vẫn so màu từng pixel; nền chart chuyển từ `surface` sang `bg` là đúng decision §4. `bg-up/20` đổi thành `bg-up-soft` là đúng token mới.
- AC-NOTIF-03 thêm `waitForResponse` (bỏ qua 401): chỉ thêm bước chờ, assertion giữ nguyên.

**So với mockup** (tôi chụp màn hình bản build của nhánh ở 1440×900 tối/sáng, 1024, 390, và lúc maximize)
- Bố cục khớp mockup: header, pulse bar, 3 cột viền 1 px không có khoảng hở, hàng 2 dòng, header chart có avatar trung tính, tên coin, giá 24 px và thống kê 24h, toolbar (timeframe, kiểu chart, Chỉ báo, camera, maximize), volume overlay, status bar.
- Token và cỡ chữ khớp §4.
- **Không có** thứ gì trong §2: order book, form mua/bán, drawing tools, nút range, Fear & Greed hay dominance, tên/logo "vertex". Logo là biểu tượng riêng kèm chữ "Crypto Alert".
- Xanh/đỏ chỉ dùng cho hướng giá. Tab active dùng gạch chân accent, chip timeframe dùng `surface-3`, dot trạng thái dùng accent/warning, line/area dùng accent.
- `crypto-alert.layout` được đọc an toàn: thử JSON hỏng hoặc `null` đều về 240/320; `crypto-alert.chart-type` sai thì về `candles`.
- Đổi độ rộng cột không fetch lại klines.
- Mobile < 1024 px: không có pulse bar, handle hay status bar; tab bar vẫn còn; AC-UI-02 pass.
- Theme sáng đúng (AC-THEME-02 pass).
- Không đổi tên testid nào. Mọi key i18n mới có ở cả `vi.json` và `en.json`.

Ghi chú ngoài phạm vi (không tính lỗi): ở 390 px, header khách hiện "Đăng" cho cả hai nút Đăng nhập/Đăng ký. Lỗi này **đã có trên `main` (v0.6)**, tôi đã so hai bản build, nên không phải do phase này; nó thuộc mục "mobile pass at 390 px" của Phase 7.

---

## Tóm tắt cho chủ dự án

- Phase 6a **ĐẠT (PASS)**. Giao diện mới giống mockup của bạn và đủ các chức năng được giao. Cả 83 bài test tự động đều xanh trên CI và khi tôi chạy lại từ đầu.
- Phần tài liệu, SPEC và quy tắc commit đều đúng. App đang chạy (bản v0.6) vẫn khỏe, và endpoint test vẫn bị khoá.
- Chỉ còn 4 lỗi nhỏ: chữ trên 2 nút xanh hơi mờ; thiếu tên một nút trong tài liệu; thanh pulse bị cắt mất DOGE trên màn hình 1024 px; và một test kiểm số % chưa thật chặt.
- Không lỗi nào làm hỏng app. Coordinator quyết định sửa ngay hay để Phase 7.
