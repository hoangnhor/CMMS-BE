# Asset Management Backend API (CMMS)

![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-010101?logo=socketdotio&logoColor=white)
![node-cron](https://img.shields.io/badge/Automation-node--cron-0F172A)

> Backend CMMS theo hướng operations-first: workflow WO chặt chẽ, bảo mật đa lớp và tự động hóa PM để giảm downtime.

- Live API: `https://cmms-be.onrender.com/api/health`
- Related Repositories: `https://github.com/hoangnhor/CMMS-BE` | `https://github.com/hoangnhor/CMMS-FE`

## 🔥 Technical Highlights

1. RBAC + security hardening (JWT, role middleware, rate limit, payload guard, security headers).
2. Layered architecture: routes -> controllers -> services -> models.
3. Work Order lifecycle theo role/state.
4. PM automation với node-cron + realtime events.

## 🗄️ Database Design

| Collection | Mục đích |
|---|---|
| `users` | account + roles |
| `assets` | master asset |
| `machine_details` | machine telemetry |
| `mold_details` | mold shot lifecycle |
| `jig_details` | usage/calibration |
| `infra_details` | infrastructure inspection |
| `pm_schedules` | PM trigger rules |
| `work_orders` | WO lifecycle records |
| `maintenance_logs` | WO completion logs |
| `spare_part_used` | spare parts consumption |

## 🔄 Core Flow

```text
Auth Login -> JWT Verify -> RBAC
Cron Tick -> Evaluate PM Due -> Create PM Work Order
WO: draft -> pending_approval -> approved/rejected -> in_progress -> done -> sign-off
```

## 🚀 Local Setup

```bash
npm install
npm run dev
```

### `.env` (required)

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/asset_management
JWT_SECRET=replace_with_32_plus_chars_secret
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

### Env Validation Rules

- `MONGO_URI` phải bắt đầu bằng `mongodb://` hoặc `mongodb+srv://`.
- `JWT_SECRET` bắt buộc; production tối thiểu 32 ký tự.
- `FRONTEND_ORIGIN` production không được `*`.
- `PORT`, `RATE_LIMIT_*`, `AUTH_RATE_LIMIT_*`, `SHUTDOWN_TIMEOUT_MS` phải là số nguyên dương.

## 🔌 API Usage Notes

- Base URL local: `http://localhost:5000/api`
- Auth: `Authorization: Bearer <token>`
- Response chuẩn: `{ success, data|message, requestId? }`
- List endpoints hỗ trợ `paginated=true&page=1&limit=20` (ở các endpoint đã bật).

## ❤️ Health / Readiness

- Health check: `GET /api/health`
- Readiness check (DB state): `GET /api/ready`

## 🧪 Seed / Demo Notes

- Seed command: `npm run seed`
- Dữ liệu seed tạo user/asset/work orders mẫu để demo UI và workflow.
- Không dùng tài khoản seed mặc định trên production.

## 🛡️ Security Checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` >= 32 ký tự, rotate theo chu kỳ
- [ ] `FRONTEND_ORIGIN` set domain cụ thể
- [ ] Không commit `.env`
- [ ] Bật HTTPS ở reverse proxy/platform
- [ ] Kiểm tra rate limit theo tải thực tế
- [ ] Theo dõi log lỗi 5xx theo `requestId`

## 🚢 Deployment Notes

- Platform phù hợp: Render / Railway / VPS.
- Cần set đầy đủ env như trên.
- Bật `TRUST_PROXY=true` khi chạy sau reverse proxy.
- Kiểm tra sau deploy:
  1. `GET /api/health` trả `success: true`
  2. `GET /api/ready` trả HTTP `200`
  3. Login và gọi API protected thành công

## 📝 Logging Consistency

- HTTP logs qua `morgan`, có `requestId`.
- Error response luôn kèm `requestId` để trace.
- Lỗi 5xx được log server-side, không trả stack trace cho client production.

## ✅ Final Release Checklist

1. `npm run test` pass.
2. DB indexes đã apply.
3. Env production đã kiểm tra và secrets rotate.
4. Health/ready endpoint pass sau deploy.
5. Frontend domain đã whitelisted qua `FRONTEND_ORIGIN`.

## 📂 Source Structure

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
