const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { connectDb, disconnectDb } = require("./src/config/db");
const { getEnv } = require("./src/config/env");
const errorHandler = require("./src/middleware/errorHandler");
const {
  blockUnsafePayload,
  createRateLimiter,
  requestId,
  requireJsonContent,
  securityHeaders,
} = require("./src/middleware/security");
const { startPmCheckerJob } = require("./src/jobs/pmChecker.job");
const { setIo } = require("./src/realtime/io");
const User = require("./src/models/User");
const { ACCESS_TOKEN_COOKIE, parseCookieHeader } = require("./src/utils/cookies");
const { issueCsrfCookie, requireCsrfToken } = require("./src/middleware/csrf");

const authRoutes = require("./src/routes/auth.routes");
const userRoutes = require("./src/routes/user.routes");
const assetRoutes = require("./src/routes/asset.routes");
const workOrderRoutes = require("./src/routes/workOrder.routes");
const pmScheduleRoutes = require("./src/routes/pmSchedule.routes");
const maintenanceLogRoutes = require("./src/routes/maintenanceLog.routes");

function buildCorsOrigin(originConfig) {
  if (originConfig === "*") return true;
  if (Array.isArray(originConfig)) {
    const normalizeOrigin = (value) => String(value || "").trim().replace(/\/+$/, "").toLowerCase();
    const rules = originConfig.map((item) => {
      const value = String(item || "").trim();
      if (!value.includes("*")) return value;
      const escaped = value.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      return new RegExp(`^${escaped}$`, "i");
    });

    return (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalizedOrigin = normalizeOrigin(origin);
      const allowed = rules.some((rule) =>
        typeof rule === "string"
          ? normalizeOrigin(rule) === normalizedOrigin
          : rule.test(origin)
      );
      if (allowed) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS blocked"));
    };
  }
  return originConfig;
}

async function authenticateSocket(env, socket, next) {
  try {
    const bearerToken = socket.handshake?.auth?.token;
    const cookieToken = parseCookieHeader(socket.handshake?.headers?.cookie || "")[ACCESS_TOKEN_COOKIE];
    const token = bearerToken || cookieToken;
    if (!token) return next(new Error("Unauthorized"));

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.sub).select("-passwordHash").lean();
    if (!user || !user.isActive) return next(new Error("Unauthorized"));
    if (Number(decoded.tv || 0) !== Number(user.tokenVersion || 0)) {
      return next(new Error("Unauthorized"));
    }

    socket.user = user;
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
}

async function bootstrap() {
  const env = getEnv();
  await connectDb(env.mongoUri, {
    shouldSyncIndexesOnBoot: env.shouldSyncIndexesOnBoot,
    autoFixPmWoDuplicates: false,
  });

  const app = express();
  const corsOrigin = buildCorsOrigin(env.frontendOrigin);
  app.disable("x-powered-by");
  if (env.trustProxy) app.set("trust proxy", 1);

  morgan.token("id", (req) => req.id || "-");
  morgan.token("uid", (req) => String(req.user?._id || "-"));

  app.use(requestId);
  app.use(securityHeaders(env));
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use((req, res, next) => issueCsrfCookie(env, req, res, next));
  app.use(requireCsrfToken);
  app.use(createRateLimiter({
    windowMs: env.globalRateLimitWindowMs,
    max: env.globalRateLimitMax,
    name: "global",
    redisUrl: env.redisUrl,
    redisPrefix: env.redisPrefix,
  }));
  app.use(requireJsonContent);
  app.use(express.json({ limit: env.jsonLimit }));
  app.use(blockUnsafePayload);
  app.use(
    morgan((tokens, req, res) =>
      JSON.stringify({
        requestId: tokens.id(req, res),
        method: tokens.method(req, res),
        path: tokens.url(req, res),
        status: Number(tokens.status(req, res) || 0),
        durationMs: Number(tokens["response-time"](req, res) || 0),
        ip: tokens["remote-addr"](req, res),
        userAgent: tokens["user-agent"](req, res),
        userId: tokens.uid(req, res),
      })
    )
  );

  app.get("/api/health", (_req, res) => {
    res.json({ success: true, message: "OK" });
  });

  app.get("/api/ready", (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({
      success: ready,
      mongoState: mongoose.connection.readyState,
    });
  });

  app.use("/api/auth/login", createRateLimiter({
    windowMs: env.authRateLimitWindowMs,
    max: env.authRateLimitMax,
    name: "auth",
    redisUrl: env.redisUrl,
    redisPrefix: env.redisPrefix,
  }));
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/assets", assetRoutes);
  app.use("/api/work-orders", workOrderRoutes);
  app.use("/api/pm-schedules", pmScheduleRoutes);
  app.use("/api/maintenance-logs", maintenanceLogRoutes);
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "Không tìm thấy endpoint",
      requestId: req.id,
    });
  });
  app.use(errorHandler);

  const server = http.createServer(app);
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  setIo(io);
  io.use((socket, next) => {
    authenticateSocket(env, socket, next);
  });

  io.on("connection", (socket) => {
    socket.emit("realtime.connected", {
      at: new Date().toISOString(),
      userId: socket.user?._id || null,
    });
  });

  const pmTask = startPmCheckerJob(env.pmCron, env.systemUserId);

  const shutdown = (signal) => {
    console.log(`Nhận ${signal}, đang tắt backend...`);
    pmTask?.stop?.();
    io.close();
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => {
      console.error("Tắt backend quá thời gian cho phép.");
      process.exit(1);
    }, env.shutdownTimeoutMs).unref();
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  server.listen(env.port, "0.0.0.0", () => {
    console.log(`Backend đang chạy tại http://localhost:${env.port}`);
  });

  return { app, server, io, pmTask };
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error("Khởi động backend thất bại:", error);
    process.exit(1);
  });
}

module.exports = { bootstrap, buildCorsOrigin };
