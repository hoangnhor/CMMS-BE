# Asset Management Backend API (CMMS)

![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-010101?logo=socketdotio&logoColor=white)
![node-cron](https://img.shields.io/badge/Automation-node--cron-0F172A)

> Backend CMMS theo hướng operations-first: workflow WO chặt chẽ, bảo mật đa lớp và tự động hóa PM để giảm downtime.

- Live API: `[TODO]`
- Related Repositories: `[TODO: BE repo]` | `[TODO: FE repo]`

## 🔥 Điểm sáng Kỹ thuật (Technical Highlights)

1. RBAC + security hardening (JWT, role middleware, rate limit, payload guard, security headers).
2. Kiến trúc layered: routes -> controllers -> services -> models.
3. Workflow engine cho Work Order lifecycle theo state + role rules.
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

## 🔄 Luồng nghiệp vụ cốt lõi (Core Flow)

```text
Auth Login -> JWT Verify -> RBAC
Cron Tick -> Evaluate PM Due -> Create PM Work Order
WO: draft -> pending_approval -> approved/rejected -> in_progress -> done -> sign-off
```

## 🚀 Cài đặt & Khởi chạy (Local Development)

```bash
npm install
npm run dev
```

### `.env`

```env
NODE_ENV=
PORT=
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=
FRONTEND_ORIGIN=
PM_CHECK_CRON=
SYSTEM_USER_ID=
TRUST_PROXY=
JSON_LIMIT=
RATE_LIMIT_WINDOW_MS=
RATE_LIMIT_MAX=
AUTH_RATE_LIMIT_WINDOW_MS=
AUTH_RATE_LIMIT_MAX=
SHUTDOWN_TIMEOUT_MS=
```

### Lệnh chính

```bash
npm run dev
npm run seed
npm run test
npm run start
```

## 📂 Cấu trúc mã nguồn (Folder Structure)

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
