# Crypto Alert

**Xây dựng ứng dụng web theo dõi thị trường tiền mã hóa với biểu đồ kỹ thuật thời gian thực và cảnh báo giá**

Đồ án chuyên ngành — UIT (ĐHQG-HCM).

## Ứng dụng làm gì

Ứng dụng web theo dõi thị trường tiền mã hóa (các cặp spot USDT, dữ liệu công khai từ Binance):

- Danh sách thị trường và biểu đồ nến thời gian thực
- Chỉ báo kỹ thuật MA, RSI, MACD
- Danh sách theo dõi (watchlist) và cảnh báo giá có thông báo
- Giao diện tiếng Việt / tiếng Anh, chế độ tối / sáng

> Dự án đang được xây dựng theo từng giai đoạn — xem [docs/PROGRESS.md](docs/PROGRESS.md) để biết tiến độ.

## Chạy trên máy (local)

Yêu cầu: Node.js 22+ và Docker.

```bash
docker compose up -d                 # PostgreSQL: crypto_alert + crypto_alert_test
cp .env.example .env                 # rồi sửa JWT_ACCESS_SECRET (>= 32 ký tự ngẫu nhiên)
npm install
npm run db:migrate
npm run db:seed
npm run dev                          # backend :3000, frontend :5173
```

Kiểm tra toàn bộ (typecheck, lint, unit, integration, e2e):

```bash
npm run check
```

## Tài liệu

| File | Nội dung |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Phạm vi, quy tắc, tiêu chí nghiệm thu |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Kiến trúc, luồng dữ liệu, giao diện |
| [docs/API.md](docs/API.md) | Hợp đồng REST + Socket.IO |
| [docs/DATABASE.md](docs/DATABASE.md) | Lược đồ cơ sở dữ liệu |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Các giai đoạn và nhật ký |
| [docs/TRACEABILITY.md](docs/TRACEABILITY.md) | Tiêu chí → kiểm thử → trạng thái |

## Công nghệ

TypeScript · NestJS · Prisma · PostgreSQL 16 · React + Vite · Tailwind v4 · Playwright · GitHub Actions · Railway.
