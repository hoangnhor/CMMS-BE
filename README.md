# Asset Management Backend API (CMMS)

Backend cho hệ thống quản lý tài sản, bảo trì định kỳ (PM) và Work Order lifecycle.

## Highlights

- Secure REST API với JWT + RBAC theo vai trò
- Work Order workflow đầy đủ, có guard theo trạng thái và quyền
- PM scheduler tự động sinh Work Order theo trigger
- Realtime events qua Socket.IO cho FE đồng bộ gần thời gian thực
- Security hardening: rate-limit, payload guard, security headers, request-id
- Seed dataset quy mô lớn (500 assets) phục vụ demo/test

## Tech Stack

- Node.js
- Express 5
- MongoDB + Mongoose
- JWT
- Socket.IO
- node-cron

## Domain Modules

- Auth
- Users
- Assets
- Work Orders
- PM Schedules
- Maintenance Logs

## Work Order Lifecycle

`draft -> pending_approval -> approved/rejected -> in_progress -> done -> sign-off`

Rule chính:
- `admin/site_manager/technician` tạo WO
- Approval/reject theo role + priority rule
- Technician thực thi start/complete theo assignment
- Admin/technician sign-off QC khi WO đã done

## PM Automation

Cron job quét `PmSchedule` active:
- Tính trigger theo loại tài sản (`days/hours/shots/usage_count`)
- Nếu đến ngưỡng `nextDueValue` thì sinh WO PM
- Cập nhật `lastTriggeredValue` + `nextDueValue`

## Realtime Events

Backend emit:
- `asset.changed`
- `work_order.changed`
- `maintenance_log.changed`
- `pm_schedule.changed`
- `user.changed`

Socket auth qua JWT token (`socket.handshake.auth.token`).

## Security

- JWT auth middleware
- Role middleware (RBAC)
- Rate limit (global + auth endpoint)
- Content-Type enforcement (`application/json`)
- Unsafe payload blocking (`$`, `.` keys)
- Security headers (CSP, HSTS in production, X-Frame-Options...)
- Request tracing với `X-Request-Id`

## Project Structure

```text
src/
  config/                 # env + db
  controllers/            # HTTP handlers
  routes/                 # route definitions
  services/               # business logic
  models/                 # mongoose schemas
  middleware/             # auth/role/security/error
  jobs/                   # cron jobs
  realtime/               # socket emit context
  utils/                  # shared validators/helpers
```

## Environment

Tạo `backend/.env`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/asset_management
JWT_SECRET=your_super_secret_key_at_least_32_chars_for_prod
JWT_EXPIRES_IN=7d
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
```

Required:
- `MONGO_URI`
- `JWT_SECRET`

Production notes:
- `FRONTEND_ORIGIN` không được là `*`
- `JWT_SECRET` nên >= 32 ký tự

## Local Setup

```bash
npm install
npm run dev
```

Server mặc định: `http://localhost:5000`

## Seed Data

```bash
npm run seed
```

Seed tạo:
- 5 users (đa vai trò)
- 500 assets
- PM schedules
- Work orders + maintenance logs + spare parts history

Default accounts:
- `admin@factory.local / password123`
- `manager@factory.local / password123`
- `tech1@factory.local / password123`
- `tech2@factory.local / password123`
- `accountant@factory.local / password123`

## Test

```bash
npm run test
```

## API Overview

- `GET /api/health`
- `GET /api/ready`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/assets`
- `GET/POST/PUT/... /api/work-orders` (+ workflow actions)
- `GET/POST/PUT /api/pm-schedules`
- `GET /api/maintenance-logs`
- `GET/POST/PATCH /api/users`

## Pagination Contract

Assets/WorkOrders hỗ trợ `paginated=true&page=&limit=`:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "totalPages": 25
    }
  }
}
```

Assets trả thêm:

```json
"summary": {
  "active": 120,
  "in_repair": 40,
  "idle": 30,
  "disposed": 10
}
```
