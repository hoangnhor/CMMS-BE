# CMMS Backend API

Backend API cho hệ thống CMMS (Asset & Maintenance Management).

- Backend repo: `https://github.com/hoangnhor/CMMS-BE`
- Frontend repo: `https://github.com/hoangnhor/CMMS-FE`

## Stack

- Node.js + Express 5
- MongoDB + Mongoose
- Socket.IO
- JWT (cookie-based auth)
- node-cron
- Redis (optional cho rate limit phân tán)

## Module chính

- Authentication
- Dashboard
- Asset Management
- Work Order Management
- Preventive Maintenance
- User Administration

## Chạy local

```bash
npm install
npm run dev
```

Mặc định API chạy tại `http://localhost:5000`.

## Biến môi trường

Tạo `.env` từ `.env.example`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/asset_management
JWT_SECRET=replace_with_a_strong_32_plus_chars_secret
JWT_EXPIRES_IN=7d
REFRESH_JWT_SECRET=replace_with_a_different_strong_32_plus_chars_secret
REFRESH_JWT_EXPIRES_IN=30d
FRONTEND_ORIGIN=http://localhost:5173
PM_CHECK_CRON=0 6 * * *
SYSTEM_USER_ID=
TRUST_PROXY=false
JSON_LIMIT=1mb
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=600
AUTH_RATE_LIMIT_WINDOW_MS=60000
AUTH_RATE_LIMIT_MAX=20
SHUTDOWN_TIMEOUT_MS=10000
REDIS_URL=
REDIS_PREFIX=am:rl
SYNC_INDEXES_ON_BOOT=false
AUTO_FIX_PM_WO_DUPLICATES=false
```

## API nhanh

- Base URL: `http://localhost:5000/api`
- Health check: `GET /api/health`
- Readiness: `GET /api/ready`

Chuẩn response:
- Success: `{ success: true, data }`
- Error: `{ success: false, message, requestId }`

## Auth, RBAC, Security

- Auth dùng cookie:
  - `am_at` (access token, httpOnly)
  - `am_rt` (refresh token, httpOnly)
  - `am_csrf` (CSRF token cookie cho frontend)
- RBAC 4 vai trò: `admin`, `site_manager`, `technician`, `accountant`.
- CSRF bảo vệ cho method `POST/PUT/PATCH/DELETE` khi request có auth cookie.
- CORS allowlist theo `FRONTEND_ORIGIN`.
- Global/auth rate limiting (Redis nếu có, fallback memory).
- Security headers, request id, centralized error handler.

## Work Order & PM highlights

- Work Order lifecycle: `draft -> pending_approval -> approved -> in_progress -> done/rejected`.
- Transaction khi complete Work Order (update WO + maintenance log + spare parts).
- PM checker chạy theo cron và có cơ chế tránh tạo trùng PM Work Order (idempotency).

## Scripts

```bash
npm run dev
npm run start
npm run lint
npm run test
npm run seed
npm run check:pm-wo-duplicates
npm run migrate:pm-wo-duplicates
```

## Deploy checklist

1. Set đầy đủ env production, đặc biệt: `MONGO_URI`, `JWT_SECRET`, `REFRESH_JWT_SECRET`, `FRONTEND_ORIGIN`.
2. Không dùng `FRONTEND_ORIGIN=*` trong production.
3. Giữ `SYNC_INDEXES_ON_BOOT=false` và `AUTO_FIX_PM_WO_DUPLICATES=false` khi runtime production.
4. Verify `GET /api/health` và `GET /api/ready` sau deploy.

## Cấu trúc chính

```text
src/
  config/
  controllers/
  jobs/
  middleware/
  models/
  realtime/
  routes/
  services/
  utils/
```
