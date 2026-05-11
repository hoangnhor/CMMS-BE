# Asset Management Backend API (CMMS)

![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-010101?logo=socketdotio&logoColor=white)
![node-cron](https://img.shields.io/badge/Automation-node--cron-0F172A)

> Backend CMMS được thiết kế theo mindset “operations-first”: kiểm soát lifecycle WO chặt chẽ, bảo mật đa lớp, và tự động hóa PM để giảm downtime.

- Live API: `[TODO: add URL]`
- Related Repositories: `[TODO: BE repo]` | `[TODO: FE repo]`

## 🔥 Điểm sáng Kỹ thuật (Technical Highlights)

1. **Bảo mật & Phân quyền nhiều lớp (RBAC + Security Hardening)**
   - JWT auth cho HTTP + Socket channel.
   - RBAC middleware theo endpoint.
   - Rate limiting, request-id, content-type enforcement, payload hardening (`$`/`.` key blocking), security headers/HSTS.

2. **Kiến trúc Layered rõ ràng cho bảo trì dài hạn**
   - Route -> Controller -> Service -> Model.
   - Transition logic tách riêng (query/policy/transition/completion), giảm coupling ở controller.

3. **Workflow-driven Work Order Engine**
   - State machine nghiệp vụ: `draft -> pending_approval -> approved/rejected -> in_progress -> done -> sign-off`.
   - Guard theo role + priority rule (`urgent` branch).

4. **Tự động hóa PM + Realtime Domain Events**
   - Cron quét PM schedules, tự sinh WO khi due.
   - Emit events theo domain (`asset/work_order/pm_schedule/maintenance_log/user`) cho FE đồng bộ tức thời.

## 🗄️ Database Design

| Collection | Mục đích | Quan hệ |
|---|---|---|
| `users` | tài khoản, role, active status | liên kết với work orders |
| `assets` | master asset data | liên kết detail collections |
| `machine_details` | machine telemetry/PM fields | `assetId` |
| `mold_details` | mold shot lifecycle | `assetId` |
| `jig_details` | jig usage/calibration | `assetId` |
| `infra_details` | infrastructure inspection | `assetId` |
| `pm_schedules` | PM rule/interval/next due | `assetId` |
| `work_orders` | execution lifecycle record | `assetId`, `createdBy`, `assignedTo`, `approvedBy` |
| `maintenance_logs` | completion findings/labor | `workOrderId`, `assetId`, `technicianId` |
| `spare_part_used` | spare parts consumption | `workOrderId` |

## 🔄 Luồng nghiệp vụ cốt lõi (Core Flow)

```text
[Authentication]
  -> POST /api/auth/login
  -> issue JWT
  -> middleware auth verify + user active check

[PM Auto WO]
  -> cron tick
  -> read active pm_schedules
  -> compute current trigger value by asset type
  -> if due: create PM work order
  -> update due cursor + emit realtime event

[Work Order Lifecycle]
  draft
   -> submit
   -> approve/reject
   -> start (assigned technician)
   -> complete (maintenance log + spare parts)
   -> sign-off
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
├─ config/                   # env parser + db bootstrap
├─ controllers/              # HTTP handlers + realtime emit hooks
├─ jobs/                     # scheduled jobs (pm checker)
├─ middleware/               # auth, role, security, error handling
├─ models/                   # mongoose schemas
├─ realtime/                 # socket context + emit gateway
├─ routes/                   # API route boundaries
├─ services/                 # business/core domain logic
└─ utils/                    # validators + helpers
```
