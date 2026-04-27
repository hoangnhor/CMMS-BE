const dotenv = require("dotenv");

dotenv.config();

const requiredVars = ["MONGO_URI", "JWT_SECRET"];

function parseOrigins(value) {
  if (!value || value === "*") return "*";
  const origins = String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : "*";
}

function getEnv() {
  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${missing.join(", ")}`);
  }

  if (process.env.NODE_ENV === "production") {
    if (process.env.FRONTEND_ORIGIN === "*") {
      throw new Error("FRONTEND_ORIGIN không được là * trong production");
    }
    if (String(process.env.JWT_SECRET).length < 32) {
      throw new Error("JWT_SECRET trong production phải có ít nhất 32 ký tự");
    }
  }

  return {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 5000),
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    frontendOrigin: parseOrigins(process.env.FRONTEND_ORIGIN || "*"),
    pmCron: process.env.PM_CHECK_CRON || "0 6 * * *",
    systemUserId: process.env.SYSTEM_USER_ID || null,
    trustProxy: process.env.TRUST_PROXY === "true",
    jsonLimit: process.env.JSON_LIMIT || "1mb",
    globalRateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    globalRateLimitMax: Number(process.env.RATE_LIMIT_MAX || 600),
    authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 60000),
    authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
    shutdownTimeoutMs: Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000),
  };
}

module.exports = { getEnv };
