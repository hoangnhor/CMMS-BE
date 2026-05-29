# CMMS Backend API (Asset Management)

Backend cho hệ thống CMMS với workflow Work Order, PM automation và bảo mật cookie-based auth.

- Health: `https://cmms-be.onrender.com/api/health`
- BE Repo: `https://github.com/hoangnhor/CMMS-BE`
- FE Repo: `https://github.com/hoangnhor/CMMS-FE`

## Tech Stack (Core)

- Node.js
- Express.js
- MongoDB
- Socket.IO
- JWT
- node-cron

## Main Features

- Auth bằng access/refresh token qua httpOnly cookie
- RBAC theo 4 vai trò: admin, site_manager, technician, accountant
- Work Order lifecycle theo trạng thái
- Preventive Maintenance tự động bằng cron
- Dashboard realtime events qua Socket.IO
- Rate limiting (global + auth scope)
- Payload validation/sanitization
- CSRF protection cho các request thay đổi dữ liệu

## Local Setup

```bash
npm install
npm run dev
```

## Environment

Tạo file `.env` (tham chiếu `.env.example`):

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

## API Notes

- Base URL local: `http://localhost:5000/api`
- Health: `GET /api/health`
- Ready: `GET /api/ready`
- Auth cookies:
  - `am_at` (access token)
  - `am_rt` (refresh token)
  - `am_csrf` (csrf token cookie for frontend header)
- Response format:
  - success: `{ success: true, data }`
  - error: `{ success: false, message, requestId }`

## Security Notes

- JWT cookie-based auth (`httpOnly`, `sameSite=lax`)
- CSRF check cho method `POST/PUT/PATCH/DELETE` khi có auth cookie
- CORS allowlist theo `FRONTEND_ORIGIN`
- Security headers + requestId + centralized error handler

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

## Testing

- Unit/integration tests chạy bằng Node test runner
- Trạng thái gần nhất: `19/19 pass`

## Deploy Checklist

1. Set đủ env production (đặc biệt `JWT_SECRET`, `REFRESH_JWT_SECRET`, `FRONTEND_ORIGIN`)
2. Không để `FRONTEND_ORIGIN=*` trên production
3. Tắt `SYNC_INDEXES_ON_BOOT` và `AUTO_FIX_PM_WO_DUPLICATES` trên production runtime
4. Verify `GET /api/health` và `GET /api/ready`

## Project Structure

```text
src/
├─ config/
├─ controllers/
├─ jobs/
├─ middleware/
├─ models/
├─ realtime/
├─ routes/
├─ services/
└─ utils/
```
