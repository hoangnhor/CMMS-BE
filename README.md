# Backend - Asset Management API

Backend Node.js/Express cho hệ thống quản lý tài sản, bảo trì và work order.

## Công nghệ

- Node.js + Express 5
- MongoDB + Mongoose
- JWT Authentication
- Socket.IO
- node-cron (PM checker)

## Yêu cầu

- Node.js >= 18
- npm >= 9
- MongoDB (local hoặc Atlas)

## Cài đặt

```bash
npm install
```

## Biến môi trường

Tạo file `.env` trong thư mục `backend`:

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

Bắt buộc:
- `MONGO_URI`
- `JWT_SECRET`

Lưu ý production:
- `FRONTEND_ORIGIN` không được để `*`
- `JWT_SECRET` nên >= 32 ký tự

## Chạy local

```bash
npm run dev
```

Server chạy tại `http://localhost:5000`.

## Seed dữ liệu mẫu

```bash
npm run seed
```

Seed sẽ tạo:
- 5 users
- 500 assets
- PM schedules
- lịch sử work orders và maintenance logs

Tài khoản mặc định:
- `admin@factory.local / password123`
- `manager@factory.local / password123`
- `tech1@factory.local / password123`
- `tech2@factory.local / password123`
- `accountant@factory.local / password123`

## Test

```bash
npm run test
```

## API cơ bản

- `GET /api/health`: kiểm tra service sống
- `GET /api/ready`: kiểm tra trạng thái kết nối MongoDB
- `POST /api/auth/login`: đăng nhập
- `GET/POST/PUT/DELETE /api/assets`
- `GET/POST/PUT/DELETE /api/work-orders`
- `GET/POST/PUT/DELETE /api/pm-schedules`
- `GET/POST/PUT/DELETE /api/maintenance-logs`
- `GET/POST/PUT/DELETE /api/users`

## Realtime

Socket.IO bật chung HTTP server, xác thực bằng JWT token qua `socket.handshake.auth.token`.

## Cấu trúc chính

```text
src/
  config/                 # env + db
  controllers/            # xử lý request
  routes/                 # định tuyến API
  services/               # nghiệp vụ
  models/                 # mongoose schema
  middleware/             # auth, role, security, error
  jobs/                   # cron jobs
  realtime/               # socket io context
```
